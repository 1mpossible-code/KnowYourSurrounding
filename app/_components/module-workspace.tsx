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

function StatusBadge({ status }: { status: LocalModuleStage['status'] }) {
  const styles: Record<string, string> = {
    completed: 'bg-[var(--royal-gold)] text-[var(--regal-navy)] border-[var(--regal-navy)]',
    failed: 'bg-[var(--tomato)]/12 text-[var(--tomato)] border-[var(--tomato)]/30',
    generating: 'bg-[var(--sandy-brown)]/12 text-[var(--sandy-brown)] border-[var(--sandy-brown)]/30',
    queued: 'bg-[var(--lemon-chiffon)] text-[var(--regal-navy)] border-[var(--border-soft)]',
    blank: 'bg-[var(--lemon-chiffon)] text-[var(--text-muted)] border-[var(--border-faint)]',
  };
  const labels: Record<string, string> = {
    completed: 'Completed',
    failed: 'Failed',
    generating: 'Generating',
    queued: 'Queued',
    blank: 'Empty',
  };
  const tone = styles[status] ?? styles.blank;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${tone}`}
    >
      {status === 'generating' && (
        <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-[var(--sandy-brown)]" />
      )}
      {labels[status] ?? status}
    </span>
  );
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
      if (!isRootStage(cursor)) path.push(cursor);
      cursor = cursor.parentStageId ? byId.get(cursor.parentStageId) : undefined;
    }
    return path;
  }, [activeStage, workspace.stages]);

  const rootPath = getModuleStagePath(topic);
  const getStageDepth = useCallback(
    (stage: LocalModuleStage) => {
      let depth = 0;
      let cursor: LocalModuleStage | undefined = stage;
      const byId = new Map(workspace.stages.map((entry) => [entry.id, entry]));
      while (cursor?.parentStageId) {
        depth += 1;
        cursor = byId.get(cursor.parentStageId);
      }
      return depth;
    },
    [workspace.stages],
  );

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
            feedback:
              'Focus aggressively on the selected phrase. Use the parent note only for orientation. Do not re-explain the whole parent topic.',
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
        patchStageAndPersist(stageId, { jobId, status: 'generating', text: payload.partialText || '' });
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
        patchStageAndPersist(stageId, { jobId, status: 'failed', error: payload.error || 'Generation failed.' });
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

      patchStageAndPersist(stageId, { title, seedText: pending.selectedText, status: 'queued', error: undefined });

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

        patchStageAndPersist(stageId, { jobId: data.jobId, status: 'queued', title });
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
      queueMicrotask(() => { void startGenerationForStage(initialStageId); });
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
    queueMicrotask(() => { setBusy(false); });
  }, [activeStage, attachToJob, initialStageId, patchStageAndPersist, profile, startGenerationForStage]);

  const openBranchPage = useCallback(
    (selectedText: string, preferredTitle?: string) => {
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
    },
    [activeStage, router, setWorkspaceAndPersist, topic, workspace],
  );

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

  if (!isTopic(topic)) return null;

  if (loadingProfile || !profile || !activeStage) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)]">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="animate-shimmer h-36 rounded-[1.75rem]" />
          <div className="animate-shimmer h-64 rounded-[1.75rem]" />
        </div>
      </main>
    );
  }

  return (
    <>
      {/* Sticky top bar */}
      <header className="sticky top-0 z-40 border-b border-[var(--border-faint)] bg-[var(--background)]/90 px-4 backdrop-blur-md md:px-6">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/"
              className="font-semibold text-[var(--sandy-brown)] transition hover:text-[var(--regal-navy)]"
            >
              Amparo
            </Link>
            <span className="text-[var(--text-muted)]">/</span>
            <span className="font-semibold text-[var(--regal-navy)]">{TOPIC_LABELS[topic]}</span>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <span
              className={`hidden rounded-full border px-3 py-1 text-xs font-semibold sm:inline-flex ${
                busy
                  ? 'border-[var(--sandy-brown)]/30 bg-[var(--sandy-brown)]/10 text-[var(--sandy-brown)]'
                  : 'border-[var(--border-faint)] bg-[var(--lemon-chiffon)] text-[var(--regal-navy)]'
              }`}
            >
              {busy ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-[var(--sandy-brown)]" />
                  Generating
                </span>
              ) : (
                `Depth ${currentDepth}`
              )}
            </span>
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-card)] px-3 py-1.5 text-xs font-semibold text-[var(--regal-navy)] transition hover:bg-[var(--lemon-chiffon)] hover:border-[var(--regal-navy)]"
            >
              History
            </button>
          </div>
        </div>
      </header>

      <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)] md:px-6 md:py-10">
        <div className="mx-auto max-w-4xl space-y-5 animate-fade-in">

          {/* Topic header card */}
          <section className="rounded-[1.75rem] border-2 border-[var(--regal-navy)] bg-[linear-gradient(135deg,#6b2009_0%,#b33a0c_55%,#e98c3f_100%)] p-6 text-white shadow-[6px_6px_0_var(--royal-gold)] md:p-7">
            <h1 className="font-serif text-4xl font-light leading-snug md:text-5xl">{TOPIC_LABELS[topic]}</h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-white/75 md:text-base md:leading-8">
              Select any phrase inside a note to branch into a sharper, tighter follow-up page.
            </p>
          </section>

          {/* Note card */}
          <section className="overflow-hidden rounded-[1.75rem] border border-[var(--border-faint)] bg-[var(--surface-card)] shadow-sm">
            {/* Note header */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-faint)] px-5 py-5 md:px-6">
              <div className="max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--sandy-brown)]">Current note</p>
                <h2 className="mt-2 font-serif text-2xl font-medium leading-snug text-[var(--regal-navy)] md:text-3xl">
                  {activeStage.title || TOPIC_LABELS[topic]}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                  {isRootStage(activeStage)
                    ? 'Use the chat agent or open a saved note. Once inside, selecting text jumps straight into a focused follow-up.'
                    : 'Highlight any phrase to generate a deeper note focused on exactly that.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={activeStage.status} />
                {activeStage.status === 'completed' && activeStage.jobId ? (
                  <button
                    type="button"
                    onClick={() => void toggleFavorite()}
                    disabled={favoriteBusy}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all disabled:opacity-60 ${
                      activeStage.favorited
                        ? 'border-[var(--regal-navy)] bg-[var(--royal-gold)] text-[var(--regal-navy)]'
                        : 'border-[var(--border-soft)] bg-[var(--surface-card)] text-[var(--regal-navy)] hover:border-[var(--regal-navy)] hover:bg-[var(--lemon-chiffon)]'
                    }`}
                  >
                    {favoriteBusy ? (
                      <span className="animate-spin-slow h-3 w-3 rounded-full border border-current border-t-transparent" />
                    ) : activeStage.favorited ? (
                      '★ Saved'
                    ) : (
                      '☆ Save note'
                    )}
                  </button>
                ) : null}
              </div>
            </div>

            {/* Error */}
            {activeStage.error ? (
              <div className="mx-5 my-4 rounded-2xl border border-[var(--tomato)]/25 bg-[var(--tomato)]/8 px-4 py-3 text-sm text-[var(--tomato)] md:mx-6">
                {activeStage.error}
              </div>
            ) : null}

            {/* Article / content area */}
            <div
              ref={articleRef}
              onMouseUp={handleArticleSelection}
              onTouchEnd={handleArticleSelection}
              className="px-5 py-5 md:px-6 md:py-6"
            >
              {isRootStage(activeStage) ? (
                <div className="rounded-2xl border border-dashed border-[var(--border-soft)] bg-[var(--lemon-chiffon)]/50 p-6 text-center">
                  <p className="text-sm leading-7 text-[var(--text-muted)]">
                    No note here yet. Go back to the essentials picker or your saved notes to start a focused page.
                  </p>
                  <Link
                    href="/"
                    className="mt-4 inline-flex rounded-xl border border-[var(--border-soft)] bg-[var(--surface-card)] px-4 py-2 text-sm font-semibold text-[var(--regal-navy)] transition hover:bg-[var(--lemon-chiffon)]"
                  >
                    ← Back to shelves
                  </Link>
                </div>
              ) : activeStage.text ? (
                <div className="relative">
                  {!isRootStage(activeStage) && activeStage.status === 'completed' && (
                    <div className="mb-4 flex items-center gap-2 rounded-xl border border-dashed border-[var(--border-soft)] bg-[var(--lemon-chiffon)]/60 px-4 py-2.5 text-xs text-[var(--text-muted)]">
                      <span className="text-[var(--sandy-brown)]">✦</span>
                      Select any phrase in this note to generate a sharper follow-up
                    </div>
                  )}
                  <MarkdownRenderer content={activeStage.text} />
                </div>
              ) : (
                <div className="space-y-3 py-4">
                  <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                    <span className="h-4 w-4 animate-spin-slow rounded-full border-2 border-[var(--sandy-brown)] border-t-transparent" />
                    Generating this note now…
                  </div>
                  <div className="animate-shimmer h-5 rounded-lg" />
                  <div className="animate-shimmer h-5 w-5/6 rounded-lg delay-75" />
                  <div className="animate-shimmer h-5 w-4/6 rounded-lg delay-150" />
                  <div className="mt-6 animate-shimmer h-5 rounded-lg delay-225" />
                  <div className="animate-shimmer h-5 w-3/4 rounded-lg delay-300" />
                </div>
              )}
            </div>
          </section>

          {/* Follow-up chat section */}
          {!isRootStage(activeStage) ? (
            <section className="rounded-[1.75rem] border border-[var(--border-faint)] bg-[var(--surface-card)] p-5 shadow-sm md:p-6 animate-fade-in delay-150">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--sandy-brown)]">Follow-up</p>
              <h3 className="mt-2 font-serif text-xl font-medium text-[var(--regal-navy)] md:text-2xl">
                Ask for the next angle
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)] md:text-base">
                Ask naturally. We'll suggest three focused follow-ups, and clicking one starts the next note immediately.
              </p>

              <form
                className="mt-5 space-y-3"
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
                      feedback: 'Keep the module tightly focused on the selected follow-up angle.',
                      profile,
                      previousSuggestions: chatSuggestions.map(({ title, topic: t }) => ({ title, topic: t })),
                    }),
                  })
                    .then(async (response) => {
                      const data = await response.json();
                      if (!response.ok) throw new Error(data.error || 'Failed to fetch suggestions.');
                      setChatSuggestions(data.suggestions || []);
                    })
                    .catch((err) => {
                      setChatError(err instanceof Error ? err.message : 'Failed to fetch suggestions.');
                    })
                    .finally(() => setChatBusy(false));
                }}
              >
                <textarea
                  value={chatQuestion}
                  onChange={(event) => setChatQuestion(event.target.value)}
                  placeholder="e.g. explain reloadable cards more practically for someone new to the city"
                  className="min-h-[100px] w-full resize-none rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-sunken)] px-4 py-3 text-sm leading-6 text-[var(--foreground)] outline-none transition focus:border-[var(--sandy-brown)] focus:ring-2 focus:ring-[var(--sandy-brown)]/20 placeholder:text-[var(--text-muted)]"
                />
                {chatError ? (
                  <p className="rounded-xl border border-[var(--tomato)]/30 bg-[var(--tomato)]/8 px-4 py-3 text-sm text-[var(--tomato)]">
                    {chatError}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={chatBusy || !chatQuestion.trim()}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-[var(--regal-navy)] bg-[var(--royal-gold)] px-5 py-2.5 text-sm font-semibold text-[var(--regal-navy)] transition hover:bg-[var(--sandy-brown)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
                >
                  {chatBusy ? (
                    <>
                      <span className="animate-spin-slow h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent" />
                      Thinking of follow-ups…
                    </>
                  ) : (
                    'Get follow-up suggestions'
                  )}
                </button>
              </form>

              {chatSuggestions.length > 0 && (
                <div className="mt-4 space-y-3">
                  {chatSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      onClick={() => openBranchPage(suggestion.seedText, suggestion.title)}
                      className="group w-full rounded-2xl border border-[var(--border-faint)] bg-[var(--lemon-chiffon)]/50 p-4 text-left transition-all hover:border-[var(--border-soft)] hover:shadow-sm active:scale-[0.99]"
                    >
                      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--sandy-brown)]">
                        Suggested follow-up
                      </p>
                      <p className="mt-2 font-serif text-base font-medium leading-snug text-[var(--regal-navy)] group-hover:underline group-hover:decoration-[var(--sandy-brown)] group-hover:underline-offset-2">
                        {suggestion.title}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{suggestion.summary}</p>
                    </button>
                  ))}
                </div>
              )}
            </section>
          ) : null}

        </div>
      </main>

      {/* History popup */}
      <PopupPanel open={historyOpen} onClose={() => setHistoryOpen(false)} eyebrow="History" title="Current note path">
        {historyStages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-sunken)] p-5 text-sm leading-6 text-[var(--text-muted)]">
            No history yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {historyStages.map((stage) => {
              const isActive = stage.id === activeStage.id;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => openHistoryStage(stage)}
                  className={`block w-full rounded-2xl border p-4 text-left transition-all hover:shadow-sm active:scale-[0.99] ${
                    isActive
                      ? 'border-[var(--regal-navy)] bg-[var(--royal-gold)] shadow-[3px_3px_0_var(--regal-navy)]'
                      : 'border-[var(--border-faint)] bg-[var(--surface-card)] hover:border-[var(--border-soft)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--sandy-brown)]">
                        Depth {getStageDepth(stage)}
                      </p>
                      <p className="mt-1 font-serif text-base font-medium leading-snug text-[var(--regal-navy)]">
                        {stage.title}
                      </p>
                      {stage.seedText ? (
                        <p className="mt-1.5 truncate text-sm text-[var(--text-muted)]">
                          {stage.seedText.slice(0, 100)}{stage.seedText.length > 100 ? '…' : ''}
                        </p>
                      ) : null}
                    </div>
                    <StatusBadge status={stage.status} />
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
