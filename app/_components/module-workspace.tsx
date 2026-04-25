'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { MarkdownRenderer } from '@/app/_components/markdown-renderer';
import { PopupPanel } from '@/app/_components/popup-panel';
import { ChatSuggestion } from '@/lib/chat-suggestions';
import { CulturalTopic, isTopic } from '@/lib/cultural-orientation';
import {
  consumePendingBranchRequest,
  createBlankWorkspace,
  createQueuedStage,
  getModuleStagePath,
  LocalModuleStage,
  LocalModuleWorkspace,
  queuePendingBranchRequest,
  readPendingBranchRequest,
  readWorkspaceByTopic,
  saveWorkspace,
  trimWorkspaceToStage,
  updateWorkspaceStage,
  upsertWorkspaceStage,
} from '@/lib/module-workspace';
import { LOCAL_USER_ID_KEY, TOPIC_LABELS } from '@/lib/onboarding';
import type { ProfileResponse } from '@/lib/profile-api';

function parseEventData(event: Event) {
  return JSON.parse((event as MessageEvent<string>).data) as {
    jobId?: string;
    status?: 'queued' | 'generating' | 'completed' | 'failed';
    partialText?: string;
    module?: { title: string; topic: string; text: string };
    error?: string;
  };
}

function statusTone(status: LocalModuleStage['status']) {
  if (status === 'completed') return 'bg-[var(--royal-gold)] text-[var(--regal-navy)]';
  if (status === 'failed') return 'bg-[var(--tomato)] text-white';
  if (status === 'generating') return 'bg-[var(--sandy-brown)] text-[var(--regal-navy)]';
  if (status === 'queued') return 'bg-white text-[var(--regal-navy)]';
  return 'bg-[var(--lemon-chiffon)] text-[var(--regal-navy)]';
}

function isRootStage(stage: LocalModuleStage) {
  return stage.status === 'blank' && !stage.seedText.trim() && !stage.text.trim() && !stage.jobId;
}

function inferTitle(selection: string, fallback: string) {
  const raw = selection.split(/\n+/)[0]?.trim() || fallback;
  return raw.length > 54 ? `${raw.slice(0, 51)}…` : raw;
}

export function ModuleWorkspace({ topic, initialStageId }: { topic: CulturalTopic; initialStageId?: string }) {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [workspace, setWorkspace] = useState<LocalModuleWorkspace>(() => createBlankWorkspace(topic));
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [busy, setBusy] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState('');
  const [chatSuggestions, setChatSuggestions] = useState<ChatSuggestion[]>([]);
  const articleRef = useRef<HTMLDivElement | null>(null);
  const sourceRef = useRef<EventSource | null>(null);
  const attachedJobIdRef = useRef<string | null>(null);

  const activeStage = useMemo(
    () => workspace.stages.find((stage) => stage.id === workspace.activeStageId) ?? workspace.stages[0],
    [workspace.activeStageId, workspace.stages],
  );

  const historyStages = useMemo(() => {
    const byId = new Map(workspace.stages.map((stage) => [stage.id, stage]));
    const path: LocalModuleStage[] = [];
    let cursor: LocalModuleStage | undefined = activeStage;

    while (cursor) {
      if (!isRootStage(cursor)) {
        path.push(cursor);
      }
      cursor = cursor.parentStageId ? byId.get(cursor.parentStageId) : undefined;
    }

    return path;
  }, [activeStage, workspace.stages]);

  const rootPath = getModuleStagePath(topic);
  const getStageDepth = useCallback((stage: LocalModuleStage) => {
    let depth = 0;
    let cursor: LocalModuleStage | undefined = stage;
    const byId = new Map(workspace.stages.map((entry) => [entry.id, entry]));
    while (cursor?.parentStageId) {
      depth += 1;
      cursor = byId.get(cursor.parentStageId);
    }
    return depth;
  }, [workspace.stages]);

  const currentDepth = useMemo(() => getStageDepth(activeStage), [activeStage, getStageDepth]);

  const patchStageAndPersist = useCallback((stageId: string, patch: Partial<LocalModuleStage>) => {
    setWorkspace((current) => {
      const next = updateWorkspaceStage(current, stageId, patch);
      saveWorkspace(next);
      return next;
    });
  }, []);

  const setWorkspaceAndPersist = useCallback((next: LocalModuleWorkspace) => {
    setWorkspace(next);
    saveWorkspace(next);
  }, []);

  const requestDeepDiveSuggestion = useCallback(
    async (selectedText: string, contextText: string) => {
      if (!profile) return null;

      try {
        const response = await fetch('/api/chat/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: `Create the next note for this exact selected phrase inside ${TOPIC_LABELS[topic]}.`,
            contextText: `Selected passage:\n${selectedText}\n\nParent note:\n${contextText}`,
            feedback: 'Focus aggressively on the selected phrase. Use the parent note only for orientation. Do not re-explain the whole parent topic.',
            profile,
          }),
        });
        const data = await response.json();
        if (!response.ok) return null;
        return (data.suggestions?.[0] ?? null) as ChatSuggestion | null;
      } catch {
        return null;
      }
    },
    [profile, topic],
  );

  const attachToJob = useCallback(
    async (stageId: string, jobId: string, fallbackTitle: string) => {
      if (attachedJobIdRef.current === jobId) return;

      attachedJobIdRef.current = jobId;
      sourceRef.current?.close();
      setBusy(true);

      const source = new EventSource(`/api/modules/generate/${jobId}/stream`);
      sourceRef.current = source;

      source.addEventListener('status', (event) => {
        const payload = parseEventData(event);
        patchStageAndPersist(stageId, {
          jobId: payload.jobId || jobId,
          status: payload.status || 'queued',
          title: payload.module?.title || fallbackTitle,
          text: payload.module?.text || payload.partialText || '',
          error: payload.error,
        });
      });

      source.addEventListener('partial', (event) => {
        const payload = parseEventData(event);
        patchStageAndPersist(stageId, {
          jobId,
          status: 'generating',
          text: payload.partialText || '',
        });
      });

      source.addEventListener('completed', (event) => {
        const payload = parseEventData(event);
        patchStageAndPersist(stageId, {
          jobId,
          status: 'completed',
          title: payload.module?.title || fallbackTitle,
          text: payload.module?.text || '',
          error: undefined,
        });
        attachedJobIdRef.current = null;
        setBusy(false);
        source.close();
      });

      source.addEventListener('failed', (event) => {
        const payload = parseEventData(event);
        patchStageAndPersist(stageId, {
          jobId,
          status: 'failed',
          error: payload.error || 'Generation failed.',
        });
        attachedJobIdRef.current = null;
        setBusy(false);
        source.close();
      });

      source.onerror = async () => {
        source.close();
        const fallback = await fetch(`/api/modules/generate/${jobId}`, { cache: 'no-store' })
          .then((res) => res.json())
          .catch(() => null);
        if (fallback) {
          patchStageAndPersist(stageId, {
            jobId,
            status: fallback.status || 'failed',
            title: fallback.module?.title || fallbackTitle,
            text: fallback.module?.text || fallback.partialText || '',
            error: fallback.error,
          });
        }
        attachedJobIdRef.current = null;
        setBusy(false);
      };
    },
    [patchStageAndPersist],
  );

  const startGenerationForStage = useCallback(
    async (stageId: string) => {
      if (!profile) return;
      const pending = consumePendingBranchRequest(stageId) ?? readPendingBranchRequest(stageId);
      if (!pending) return;

      setBusy(true);
      const suggestion = await requestDeepDiveSuggestion(pending.selectedText, pending.contextText);
      const title = suggestion?.title || pending.title;
      const highlightedText = suggestion?.seedText || pending.selectedText;
      const contextText = [
        `Selected passage:\n${pending.selectedText}`,
        pending.contextText ? `Parent note context:\n${pending.contextText}` : null,
        suggestion ? `Profile-informed direction:\n${suggestion.summary}` : null,
      ]
        .filter(Boolean)
        .join('\n\n');

      patchStageAndPersist(stageId, {
        title,
        seedText: pending.selectedText,
        status: 'queued',
        error: undefined,
      });

      try {
        const response = await fetch('/api/modules/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: profile.userId,
            highlightedText,
            contextText,
            profile,
            lockedTopic: topic,
            titleHint: title,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to start module generation.');

        patchStageAndPersist(stageId, {
          jobId: data.jobId,
          status: 'queued',
          title,
        });
        await attachToJob(stageId, data.jobId, title);
      } catch (error) {
        patchStageAndPersist(stageId, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Failed to start generation.',
        });
        setBusy(false);
      }
    },
    [attachToJob, patchStageAndPersist, profile, requestDeepDiveSuggestion, topic],
  );

  useEffect(() => {
    const next = readWorkspaceByTopic(topic);
    const requestedStageId = initialStageId || '';
    const resolved =
      requestedStageId && next.stages.some((stage) => stage.id === requestedStageId)
        ? { ...next, activeStageId: requestedStageId }
        : next;

    queueMicrotask(() => {
      setWorkspace(resolved);
      saveWorkspace(resolved);
    });
  }, [initialStageId, topic]);

  useEffect(() => {
    const storedUserId = window.localStorage.getItem(LOCAL_USER_ID_KEY);
    if (!storedUserId) {
      router.replace('/onboarding');
      return;
    }

    fetch(`/api/profile/${encodeURIComponent(storedUserId)}`, { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load profile.');
        if (!data.profile?.exists) {
          router.replace('/onboarding');
          return;
        }
        setProfile(data.profile);
      })
      .catch(() => {
        window.localStorage.removeItem(LOCAL_USER_ID_KEY);
        router.replace('/onboarding');
      })
      .finally(() => setLoadingProfile(false));
  }, [router]);

  useEffect(() => () => sourceRef.current?.close(), []);

  useEffect(() => {
    if (!initialStageId || !profile || !activeStage || activeStage.id !== initialStageId) return;

    const pending = readPendingBranchRequest(initialStageId);
    if (pending && !activeStage.jobId) {
      queueMicrotask(() => {
        void startGenerationForStage(initialStageId);
      });
      return;
    }

    if (activeStage.jobId && (activeStage.status === 'queued' || activeStage.status === 'generating')) {
      void attachToJob(activeStage.id, activeStage.jobId, activeStage.title);
      return;
    }

    if (activeStage.jobId && activeStage.status === 'completed' && !activeStage.text.trim()) {
      queueMicrotask(async () => {
        const fallback = await fetch(`/api/modules/generate/${activeStage.jobId}`, { cache: 'no-store' })
          .then((res) => res.json())
          .catch(() => null);
        if (fallback?.module?.text) {
          patchStageAndPersist(activeStage.id, {
            title: fallback.module.title || activeStage.title,
            text: fallback.module.text,
            status: 'completed',
          });
        }
        setBusy(false);
      });
      return;
    }

    queueMicrotask(() => {
      setBusy(false);
    });
  }, [activeStage, attachToJob, initialStageId, patchStageAndPersist, profile, startGenerationForStage]);

  const openBranchPage = useCallback((selectedText: string, preferredTitle?: string) => {
    if (!activeStage || !selectedText.trim()) return;

    const title = preferredTitle || inferTitle(selectedText, activeStage.title || TOPIC_LABELS[topic]);
    const base = trimWorkspaceToStage(workspace, activeStage.id);
    const stage = createQueuedStage(topic, title, selectedText, undefined, activeStage.id);
    const next = upsertWorkspaceStage(base, stage);

    queuePendingBranchRequest({
      topic,
      stageId: stage.id,
      source: 'stage',
      title,
      selectedText,
      contextText: activeStage.text,
      createdAt: stage.createdAt,
    });

    setWorkspaceAndPersist(next);
    window.getSelection()?.removeAllRanges();
    router.push(getModuleStagePath(topic, stage.id));
  }, [activeStage, router, setWorkspaceAndPersist, topic, workspace]);

  const handleArticleSelection = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? '';
    if (!text || text.length < 3) return;
    if (!articleRef.current?.contains(selection?.anchorNode ?? null)) return;
    openBranchPage(text);
  }, [openBranchPage]);

  async function toggleFavorite() {
    if (!profile || !activeStage?.jobId || activeStage.status !== 'completed') return;
    setFavoriteBusy(true);
    try {
      const action = activeStage.favorited ? 'remove' : 'add';
      const response = await fetch(`/api/profile/${encodeURIComponent(profile.userId)}/favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: activeStage.jobId, action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update favorites.');
      setProfile(data.profile);
      patchStageAndPersist(activeStage.id, { favorited: action === 'add' });
    } finally {
      setFavoriteBusy(false);
    }
  }

  function openHistoryStage(stage: LocalModuleStage) {
    setHistoryOpen(false);
    router.push(isRootStage(stage) ? rootPath : getModuleStagePath(topic, stage.id));
  }

  if (!isTopic(topic)) {
    return null;
  }

  if (loadingProfile || !profile || !activeStage) {
    return (
      <main className="min-h-screen bg-[var(--lemon-chiffon)] px-4 py-8 text-[var(--regal-navy)]">
        <div className="mx-auto max-w-4xl rounded-[1.75rem] border-4 border-[var(--regal-navy)] bg-white p-6 shadow-[8px_8px_0_var(--royal-gold)]">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--sandy-brown)]">Loading note</p>
          <h1 className="mt-3 text-3xl font-black">Preparing your module page</h1>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-[var(--lemon-chiffon)] px-3 py-4 text-[var(--regal-navy)] md:px-6 md:py-8">
        <div className="mx-auto max-w-5xl space-y-4 md:space-y-6">
          <section className="overflow-hidden rounded-[1.85rem] border-4 border-[var(--regal-navy)] bg-white shadow-[10px_10px_0_var(--royal-gold)]">
            <div className="bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_58%,#f4d35e_100%)] px-4 py-5 text-white md:px-6 md:py-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                  <Link href="/" className="text-sm font-semibold uppercase tracking-[0.25em] text-white/82">
                    ← Back to shelves
                  </Link>
                  <h1 className="mt-3 text-3xl font-black leading-tight md:text-4xl">{TOPIC_LABELS[topic]}</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-white/88 md:text-base md:leading-7">
                    This page stays focused on one note. Select any useful phrase inside it and the next page starts generating immediately.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => setHistoryOpen(true)}
                    className="rounded-full border-2 border-white/80 bg-white/14 px-4 py-2 text-sm font-bold text-white backdrop-blur-sm"
                  >
                    History
                  </button>
                  <div className="rounded-full border-2 border-white/80 bg-white/14 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
                    {busy ? 'Generating now' : `Depth ${currentDepth}`}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 px-4 py-4 md:px-6 md:py-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--sandy-brown)] md:text-sm">Current note</p>
                  <h2 className="mt-2 text-2xl font-black md:text-3xl">{activeStage.title}</h2>
                  <p className="mt-3 text-sm leading-6 opacity-80 md:text-base">
                    {isRootStage(activeStage)
                      ? 'Use the chat agent from home or open a saved note. Once you are inside a note, selecting text will jump straight into a sharper follow-up page.'
                      : 'Select the exact phrase you want unpacked. We will keep only enough parent context to orient the next note.'}
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
                  <div className={`rounded-full border-2 border-[var(--regal-navy)] px-4 py-2 text-sm font-bold uppercase tracking-[0.16em] ${statusTone(activeStage.status)}`}>
                    {activeStage.status}
                  </div>
                  {activeStage.status === 'completed' && activeStage.jobId ? (
                    <button
                      type="button"
                      onClick={() => void toggleFavorite()}
                      disabled={favoriteBusy}
                      className="rounded-full border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] px-4 py-2 text-sm font-bold"
                    >
                      {favoriteBusy ? 'Saving…' : activeStage.favorited ? 'Remove favorite' : 'Save note'}
                    </button>
                  ) : null}
                </div>
              </div>

              {activeStage.error ? (
                <p className="rounded-[1.2rem] border-2 border-[var(--tomato)] bg-white px-4 py-3 text-[var(--tomato)]">
                  {activeStage.error}
                </p>
              ) : null}

              <div
                ref={articleRef}
                onMouseUp={handleArticleSelection}
                onTouchEnd={handleArticleSelection}
                className="rounded-[1.4rem] border-2 border-dashed border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-3 md:p-4"
              >
                {isRootStage(activeStage) ? (
                  <div className="space-y-3 text-sm leading-7 opacity-80 md:text-base">
                    <p>There is no note here yet.</p>
                    <p>Go back to the essentials picker or your favorites, and start a focused note page from there.</p>
                  </div>
                ) : activeStage.text ? (
                  <MarkdownRenderer content={activeStage.text} />
                ) : (
                  <div className="space-y-3 text-sm leading-7 opacity-80 md:text-base">
                    <p>We’re generating this note now.</p>
                    <p>As soon as text arrives, you can select a phrase and branch even deeper.</p>
                  </div>
                )}
              </div>
            </div>

            {!isRootStage(activeStage) ? (
              <section className="rounded-[1.4rem] border-2 border-[var(--regal-navy)] bg-white p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--sandy-brown)] md:text-sm">Follow-up chat</p>
                  <h3 className="mt-2 text-xl font-black md:text-2xl">Ask for the next angle</h3>
                  <p className="mt-2 text-sm leading-6 opacity-80 md:text-base">
                    Ask naturally. We’ll suggest three sharp follow-ups for this exact note, and clicking one starts the next module immediately.
                  </p>
                </div>
                <form
                  className="mt-4 space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!chatQuestion.trim() || !profile) return;
                    setChatBusy(true);
                    setChatError('');
                    fetch('/api/chat/suggestions', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        question: chatQuestion,
                        contextText: activeStage.text,
                        feedback: 'Keep the module tightly focused on the selected follow-up angle and keep the title stable if chosen.',
                        profile,
                        previousSuggestions: chatSuggestions.map(({ title, topic }) => ({ title, topic })),
                      }),
                    })
                      .then(async (response) => {
                        const data = await response.json();
                        if (!response.ok) throw new Error(data.error || 'Failed to fetch suggestions.');
                        setChatSuggestions(data.suggestions || []);
                      })
                      .catch((error) => {
                        setChatError(error instanceof Error ? error.message : 'Failed to fetch suggestions.');
                      })
                      .finally(() => setChatBusy(false));
                  }}
                >
                  <textarea
                    value={chatQuestion}
                    onChange={(event) => setChatQuestion(event.target.value)}
                    placeholder="Example: explain reloadable cards more practically for someone new to the city"
                    className="min-h-[110px] w-full rounded-[1.2rem] border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-4 text-sm leading-6 outline-none focus:border-[var(--sandy-brown)]"
                  />
                  {chatError ? <p className="rounded-[1.2rem] border-2 border-[var(--tomato)] bg-white px-4 py-3 text-[var(--tomato)]">{chatError}</p> : null}
                  <button
                    type="submit"
                    disabled={chatBusy || !chatQuestion.trim()}
                    className="rounded-full border-2 border-[var(--regal-navy)] bg-[var(--royal-gold)] px-5 py-3 font-bold disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {chatBusy ? 'Thinking of follow-ups…' : 'Get follow-up suggestions'}
                  </button>
                </form>

                <div className="mt-4 space-y-3">
                  {chatSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      onClick={() => openBranchPage(suggestion.seedText, suggestion.title)}
                      className="block w-full rounded-[1.2rem] border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-4 text-left"
                    >
                      <div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--sandy-brown)]">Suggested follow-up</div>
                      <div className="mt-2 text-base font-black leading-6">{suggestion.title}</div>
                      <div className="mt-2 text-sm leading-6 opacity-80">{suggestion.summary}</div>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
          </section>
        </div>
      </main>

      <PopupPanel open={historyOpen} onClose={() => setHistoryOpen(false)} eyebrow="History" title="Current path only">
        {historyStages.length === 0 ? (
          <div className="rounded-[1.2rem] border-2 border-dashed border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-4 text-sm leading-6 opacity-80">
            History is empty.
          </div>
        ) : (
          <div className="space-y-3">
            {historyStages.map((stage) => {
              const active = stage.id === activeStage.id;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => openHistoryStage(stage)}
                  className={`block w-full rounded-[1.35rem] border-2 p-4 text-left ${
                    active ? 'border-[var(--regal-navy)] bg-[var(--royal-gold)]' : 'border-[var(--regal-navy)] bg-[var(--lemon-chiffon)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--sandy-brown)]">Depth {getStageDepth(stage)}</div>
                      <div className="mt-1 text-base font-black leading-6">{stage.title}</div>
                      <div className="mt-1 text-sm leading-6 opacity-80">
                        {stage.seedText ? `${stage.seedText.slice(0, 120)}${stage.seedText.length > 120 ? '…' : ''}` : 'Focused follow-up'}
                      </div>
                    </div>
                    <div className={`rounded-full border-2 border-[var(--regal-navy)] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${statusTone(stage.status)}`}>
                      {stage.status}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </PopupPanel>
    </>
  );
}
