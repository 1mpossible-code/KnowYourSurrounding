'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

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
  updateWorkspaceStage,
  upsertWorkspaceStage,
} from '@/lib/module-workspace';
import { LOCAL_USER_ID_KEY, TOPIC_LABELS } from '@/lib/onboarding';
import type { ProfileResponse } from '@/lib/profile-api';

function parseEventData(event: Event) {
  return JSON.parse((event as MessageEvent<string>).data) as {
    jobId?: string;
    status?: 'queued' | 'generating' | 'completed' | 'failed';
    progress?: number;
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

function inferTitle(selection: string, fallback: string) {
  const raw = selection.split(/\n+/)[0]?.trim() || fallback;
  return raw.length > 54 ? `${raw.slice(0, 51)}…` : raw;
}

function isRootStage(stage: LocalModuleStage) {
  return stage.status === 'blank' && !stage.seedText.trim() && !stage.text.trim() && !stage.jobId;
}

export function ModuleWorkspace({ topic, initialStageId }: { topic: CulturalTopic; initialStageId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [workspace, setWorkspace] = useState<LocalModuleWorkspace>(() => createBlankWorkspace(topic));
  const [selectionText, setSelectionText] = useState('');
  const [selectionSource, setSelectionSource] = useState<'draft' | 'stage' | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [busy, setBusy] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const articleRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const sourceRef = useRef<EventSource | null>(null);
  const attachedJobIdRef = useRef<string | null>(null);

  const activeStage = useMemo(
    () => workspace.stages.find((stage) => stage.id === workspace.activeStageId) ?? workspace.stages[0],
    [workspace.activeStageId, workspace.stages],
  );

  const historyStages = useMemo(
    () => workspace.stages.map((stage, index) => ({ stage, index })).reverse(),
    [workspace.stages],
  );

  const rootPath = getModuleStagePath(topic);

  const setWorkspaceAndPersist = useCallback((next: LocalModuleWorkspace) => {
    setWorkspace(next);
    saveWorkspace(next);
  }, []);

  const patchStageAndPersist = useCallback((stageId: string, patch: Partial<LocalModuleStage>) => {
    setWorkspace((current) => {
      const next = updateWorkspaceStage(current, stageId, patch);
      saveWorkspace(next);
      return next;
    });
  }, []);

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

  const requestDeepDiveSuggestion = useCallback(
    async (selectedText: string, contextText: string) => {
      if (!profile) return null;

      try {
        const response = await fetch('/api/chat/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: `Turn this selected passage into the next most useful cultural orientation note for ${TOPIC_LABELS[topic]}.`,
            contextText: `Selected passage:\n${selectedText}\n\nContext:\n${contextText}`,
            profile,
            previousSuggestions: activeStage ? [{ title: activeStage.title, topic }] : undefined,
          }),
        });
        const data = await response.json();
        if (!response.ok) return null;
        return (data.suggestions?.[0] ?? null) as ChatSuggestion | null;
      } catch {
        return null;
      }
    },
    [activeStage, profile, topic],
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
        pending.contextText ? `Context:\n${pending.contextText}` : null,
        suggestion
          ? `Profile-informed direction:\nTitle: ${suggestion.title}\nSummary: ${suggestion.summary}\nSeed:\n${suggestion.seedText}`
          : null,
      ]
        .filter(Boolean)
        .join('\n\n');

      patchStageAndPersist(stageId, {
        title,
        seedText: pending.selectedText,
        status: 'queued',
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
          title,
          jobId: data.jobId,
          status: 'queued',
          error: undefined,
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
    const seed = searchParams.get('seed')?.trim() ?? '';
    const title = searchParams.get('title')?.trim() ?? '';
    const requestedStageId = initialStageId || searchParams.get('stage')?.trim() || '';
    let resolved = next;

    if (seed && !resolved.sourceDraft.trim()) {
      const sourceDraft = title ? `${title}\n\n${seed}` : seed;
      resolved = { ...resolved, sourceDraft };
    }

    if (requestedStageId && resolved.stages.some((stage) => stage.id === requestedStageId)) {
      resolved = { ...resolved, activeStageId: requestedStageId };
    }

    queueMicrotask(() => {
      setWorkspace(resolved);
      saveWorkspace(resolved);
    });
  }, [initialStageId, searchParams, topic]);

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

    queueMicrotask(() => {
      setBusy(false);
    });
  }, [activeStage, attachToJob, initialStageId, profile, startGenerationForStage]);

  const handleDraftSelect = useCallback(() => {
    const element = textareaRef.current;
    if (!element) return;
    const next = element.value.slice(element.selectionStart, element.selectionEnd).trim();
    setSelectionText(next);
    setSelectionSource(next ? 'draft' : null);
  }, []);

  const handleArticleSelection = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? '';
    if (!text) {
      if (selectionSource === 'stage') {
        setSelectionText('');
        setSelectionSource(null);
      }
      return;
    }
    if (!articleRef.current?.contains(selection?.anchorNode ?? null)) return;
    setSelectionText(text);
    setSelectionSource('stage');
  }, [selectionSource]);

  function openGenerationPage() {
    if (!selectionText.trim() || !activeStage) return;

    const title = inferTitle(selectionText, activeStage.title || TOPIC_LABELS[topic]);
    const stage = createQueuedStage(topic, title, selectionText);
    const nextWorkspace = upsertWorkspaceStage(workspace, stage);

    queuePendingBranchRequest({
      topic,
      stageId: stage.id,
      source: selectionSource || 'draft',
      title,
      selectedText: selectionText,
      contextText: selectionSource === 'stage' ? activeStage.text : workspace.sourceDraft,
      createdAt: stage.createdAt,
    });

    setWorkspaceAndPersist(nextWorkspace);
    setHistoryOpen(false);
    router.push(getModuleStagePath(topic, stage.id));
  }

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
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--sandy-brown)]">Loading workspace</p>
          <h1 className="mt-3 text-3xl font-black">Preparing your lesson space</h1>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-[var(--lemon-chiffon)] px-3 py-4 text-[var(--regal-navy)] md:px-6 md:py-8">
        <div className="mx-auto max-w-7xl space-y-4 md:space-y-6">
          <section className="overflow-hidden rounded-[1.9rem] border-4 border-[var(--regal-navy)] bg-white shadow-[10px_10px_0_var(--royal-gold)]">
            <div className="bg-[linear-gradient(135deg,#0d3b66_0%,#1c5a91_52%,#f4d35e_100%)] px-4 py-5 text-white md:px-6 md:py-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                  <Link href="/" className="text-sm font-semibold uppercase tracking-[0.25em] text-white/82">
                    ← Back to modules
                  </Link>
                  <h1 className="mt-3 text-3xl font-black leading-tight md:text-4xl">{TOPIC_LABELS[topic]}</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-white/88 md:text-base md:leading-7">
                    Keep the root page clean, turn good passages into dedicated notes, and build an endless trail of follow-up lessons.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => setHistoryOpen(true)}
                    className="rounded-full border-2 border-white/80 bg-white/14 px-4 py-2 text-sm font-bold text-white backdrop-blur-sm"
                  >
                    History · {workspace.stages.length}
                  </button>
                  <div className="rounded-full border-2 border-white/80 bg-white/14 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
                    {busy ? 'Generating this page…' : initialStageId ? 'Focused note page' : 'Root workspace'}
                  </div>
                </div>
              </div>
            </div>
            <div className="grid gap-4 px-4 py-4 md:px-6 md:py-5 lg:grid-cols-[0.88fr_1.12fr]">
              <section className="rounded-[1.6rem] border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--sandy-brown)] md:text-sm">Source pad</p>
                    <h2 className="mt-2 text-2xl font-black">Build the next note</h2>
                  </div>
                  {selectionSource === 'draft' && selectionText ? (
                    <div className="rounded-full border-2 border-[var(--regal-navy)] bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]">
                      draft selected
                    </div>
                  ) : null}
                </div>
                <p className="mt-3 text-sm leading-6 opacity-80 md:text-base">
                  Paste context, highlight the exact passage you want unpacked, and we’ll open a dedicated page that keeps generating from it.
                </p>
                <textarea
                  ref={textareaRef}
                  value={workspace.sourceDraft}
                  onChange={(event) => {
                    const next = { ...workspace, sourceDraft: event.target.value, updatedAt: new Date().toISOString() };
                    setWorkspaceAndPersist(next);
                  }}
                  onSelect={handleDraftSelect}
                  placeholder="Paste source material here, then highlight the exact passage you want explained."
                  className="mt-4 min-h-[220px] w-full rounded-[1.35rem] border-2 border-[var(--regal-navy)] bg-white p-4 text-sm leading-6 outline-none focus:border-[var(--sandy-brown)]"
                />
                <button
                  type="button"
                  onClick={openGenerationPage}
                  disabled={!selectionText || busy}
                  className="mt-4 w-full rounded-full border-2 border-[var(--regal-navy)] bg-[var(--royal-gold)] px-5 py-3 font-bold disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {selectionText ? 'Open a new note page from this selection' : 'Select text to open a note page'}
                </button>
                {selectionSource === 'draft' && selectionText ? (
                  <div className="mt-3 rounded-[1.2rem] border-2 border-dashed border-[var(--regal-navy)] bg-white p-3 text-sm leading-6">
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--sandy-brown)]">Selected snippet</div>
                    <p className="mt-2 line-clamp-4">{selectionText}</p>
                  </div>
                ) : null}
              </section>

              <section className="rounded-[1.6rem] border-2 border-[var(--regal-navy)] bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-2xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--sandy-brown)] md:text-sm">Current page</p>
                    <h2 className="mt-2 text-2xl font-black md:text-3xl">{activeStage.title}</h2>
                    <p className="mt-3 text-sm leading-6 opacity-80 md:text-base">
                      {isRootStage(activeStage)
                        ? 'This is the clean starting page. Once you generate something, every follow-up note gets its own page and stays in history.'
                        : 'Highlight any sentence in this note to branch into another dedicated page and keep the chain going.'}
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
                        {favoriteBusy ? 'Saving…' : activeStage.favorited ? 'Remove favorite' : 'Favorite note'}
                      </button>
                    ) : null}
                  </div>
                </div>

                {activeStage.error ? (
                  <p className="mt-5 rounded-[1.2rem] border-2 border-[var(--tomato)] bg-white px-4 py-3 text-[var(--tomato)]">
                    {activeStage.error}
                  </p>
                ) : null}

                <div
                  ref={articleRef}
                  onMouseUp={handleArticleSelection}
                  onTouchEnd={handleArticleSelection}
                  className="mt-6 rounded-[1.35rem] border-2 border-dashed border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-4 md:p-5"
                >
                  {isRootStage(activeStage) ? (
                    <div className="space-y-3 text-sm leading-7 opacity-80 md:text-base">
                      <p>This topic starts blank on purpose.</p>
                      <p>Paste context into the source pad, highlight a passage, and we’ll open a fresh note page that can keep branching forever.</p>
                    </div>
                  ) : activeStage.text ? (
                    <MarkdownRenderer content={activeStage.text} />
                  ) : (
                    <div className="space-y-3 text-sm leading-7 opacity-80 md:text-base">
                      <p>We’re building this note right now.</p>
                      <p>The page will stay live while the job streams in.</p>
                    </div>
                  )}
                </div>

                {selectionSource === 'stage' && selectionText ? (
                  <div className="mt-4 rounded-[1.2rem] border-2 border-[var(--regal-navy)] bg-white p-4 text-sm leading-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--sandy-brown)]">Selected from this note</div>
                        <p className="mt-2">{selectionText}</p>
                      </div>
                      <button
                        type="button"
                        onClick={openGenerationPage}
                        disabled={busy}
                        className="w-full rounded-full border-2 border-[var(--regal-navy)] bg-[var(--royal-gold)] px-4 py-3 text-sm font-bold sm:w-auto"
                      >
                        Open a deep-dive page
                      </button>
                    </div>
                  </div>
                ) : null}
              </section>
            </div>
          </section>
        </div>
      </main>

      <PopupPanel open={historyOpen} onClose={() => setHistoryOpen(false)} eyebrow="History" title="Jump to any point in the chain">
        <div className="space-y-3">
          {historyStages.map(({ stage, index }) => {
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
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--sandy-brown)]">
                      {isRootStage(stage) ? 'Root page' : `Stage ${index}`}
                    </div>
                    <div className="mt-1 text-base font-black leading-6">{stage.title}</div>
                    <div className="mt-1 text-sm leading-6 opacity-80">
                      {stage.seedText ? `${stage.seedText.slice(0, 120)}${stage.seedText.length > 120 ? '…' : ''}` : 'Blank starting point'}
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
      </PopupPanel>
    </>
  );
}
