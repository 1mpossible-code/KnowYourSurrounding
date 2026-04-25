'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { PopupPanel } from '@/app/_components/popup-panel';
import { ChatSuggestion } from '@/lib/chat-suggestions';
import { CulturalTopic } from '@/lib/cultural-orientation';
import {
  compactStoredWorkspacesForHome,
  createBlankWorkspace,
  createQueuedStage,
  getModuleStagePath,
  queuePendingBranchRequest,
  readStoredWorkspaces,
  removeJobFromWorkspaces,
  saveWorkspace,
  upsertWorkspaceStage,
} from '@/lib/module-workspace';
import { LOCAL_USER_ID_KEY, TOPIC_LABELS } from '@/lib/onboarding';
import type { ProfileResponse } from '@/lib/profile-api';

const ESSENTIAL_STARTERS: Array<{ topic: CulturalTopic; title: string; summary: string; seedText: string }> = [
  {
    topic: 'transit',
    title: 'How transit payment really works',
    summary: 'Cards, reloads, tapping, topping up, and the common mistakes people make in the first week.',
    seedText: 'Explain exactly how transit payment works in everyday life, with special focus on cards, reloads, taps, and common beginner mistakes.',
  },
  {
    topic: 'communication',
    title: 'How to ask for help without freezing',
    summary: 'Useful phrases, tone, and what to say when you do not understand what someone just told you.',
    seedText: 'Explain how to ask for help naturally, what to say when you do not understand, and how to avoid sounding too abrupt or too vague.',
  },
  {
    topic: 'public_behavior',
    title: 'What feels rude in public here',
    summary: 'Queues, volume, shared spaces, and the tiny public habits that make people read you well or badly.',
    seedText: 'Explain the small public behavior norms that people notice fast, especially queues, volume, movement, and shared-space etiquette.',
  },
  {
    topic: 'money',
    title: 'How everyday payments actually happen',
    summary: 'Cards, cash, splitting bills, and the awkward payment moments newcomers run into most often.',
    seedText: 'Explain how everyday payments work in practice, including cards, cash, splitting bills, tipping, and common awkward moments.',
  },
  {
    topic: 'work',
    title: 'What professional politeness sounds like',
    summary: 'Meetings, feedback, disagreement, and the tone that reads as competent rather than rude or passive.',
    seedText: 'Explain what professional politeness sounds like in meetings, feedback, disagreement, and short workplace exchanges.',
  },
  {
    topic: 'healthcare',
    title: 'How to handle a doctor visit smoothly',
    summary: 'Appointments, describing symptoms, practical expectations, and what people often forget to prepare.',
    seedText: 'Explain how to handle a doctor visit smoothly, including booking, describing symptoms, expectations, and practical preparation.',
  },
];

const TOPIC_BACKGROUNDS: Record<CulturalTopic, string> = {
  greetings: 'from-[#d97706] via-[#f59e0b] to-[#fde68a]',
  public_behavior: 'from-[#c2410c] via-[#ea580c] to-[#fdba74]',
  communication: 'from-[#b45309] via-[#f59e0b] to-[#fed7aa]',
  personal_space: 'from-[#9a3412] via-[#c2410c] to-[#fdba74]',
  time: 'from-[#7c2d12] via-[#c2410c] to-[#fdba74]',
  work: 'from-[#92400e] via-[#d97706] to-[#fde68a]',
  school: 'from-[#b45309] via-[#fb923c] to-[#ffedd5]',
  gender: 'from-[#9a3412] via-[#f97316] to-[#fdba74]',
  religion: 'from-[#7c2d12] via-[#ea580c] to-[#fed7aa]',
  dating: 'from-[#c2410c] via-[#fb923c] to-[#fecaca]',
  conflict: 'from-[#7c2d12] via-[#b45309] to-[#fdba74]',
  laws: 'from-[#78350f] via-[#b45309] to-[#fde68a]',
  money: 'from-[#854d0e] via-[#ca8a04] to-[#fde68a]',
  food: 'from-[#c2410c] via-[#fb923c] to-[#fed7aa]',
  clothing: 'from-[#9a3412] via-[#f97316] to-[#ffedd5]',
  digital: 'from-[#92400e] via-[#fb923c] to-[#fde68a]',
  safety: 'from-[#991b1b] via-[#dc2626] to-[#fca5a5]',
  healthcare: 'from-[#9a3412] via-[#f97316] to-[#fde68a]',
  government: 'from-[#7c2d12] via-[#d97706] to-[#fde68a]',
  transit: 'from-[#9a3412] via-[#ea580c] to-[#fdba74]',
};

type JobSummary = {
  jobId: string;
  status: 'queued' | 'generating' | 'completed' | 'failed';
  module?: { title: string; topic: string; text: string };
};

type ModuleCard = {
  id: string;
  topic: CulturalTopic;
  title: string;
  subtitle: string;
  href: string;
  removableJobId: string;
};

function SkeletonScreen() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header skeleton */}
      <div className="border-b border-[var(--border-faint)] px-4 py-4 md:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="animate-shimmer h-6 w-24 rounded-lg" />
          <div className="flex gap-2">
            <div className="animate-shimmer h-8 w-28 rounded-xl" />
            <div className="animate-shimmer h-8 w-20 rounded-xl" />
          </div>
        </div>
      </div>
      {/* Hero skeleton */}
      <div className="px-4 py-8 md:px-6">
        <div className="mx-auto max-w-7xl space-y-4">
          <div className="animate-shimmer h-44 rounded-[1.75rem]" />
          <div className="animate-shimmer h-10 w-48 rounded-lg delay-75" />
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-shimmer h-[19rem] w-[18rem] shrink-0 rounded-[1.75rem]" style={{ animationDelay: `${i * 75}ms` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SuggestionCard({
  eyebrow,
  title,
  summary,
  onClick,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full rounded-2xl border border-[var(--border-faint)] bg-[var(--surface-card)] p-4 text-left transition-all hover:border-[var(--border-soft)] hover:shadow-sm active:scale-[0.99]"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--sandy-brown)]">{eyebrow}</p>
      <h3 className="mt-2 font-serif text-lg font-medium leading-snug text-[var(--regal-navy)] group-hover:underline group-hover:decoration-[var(--sandy-brown)] group-hover:underline-offset-2">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{summary}</p>
    </button>
  );
}

function FavoriteShelf({ topic, cards, onUnfollow }: { topic: CulturalTopic; cards: ModuleCard[]; onUnfollow: (jobId: string) => void }) {
  return (
    <section className="space-y-3 animate-fade-in">
      <h2 className="font-serif text-2xl font-medium text-[var(--regal-navy)] md:text-3xl">{TOPIC_LABELS[topic]}</h2>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:-mx-6 md:px-6">
        {cards.map((card) => (
          <article
            key={card.id}
            className="relative h-[19rem] w-[17.5rem] shrink-0 overflow-hidden rounded-[1.75rem] border border-[var(--border-faint)] bg-[var(--surface-card)] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md md:w-[18.5rem]"
          >
            {/* Overflow menu */}
            <details className="absolute right-3 top-3 z-10">
              <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full border border-white/30 bg-black/20 text-white backdrop-blur-sm transition hover:bg-black/35">
                <span className="text-xs leading-none tracking-tight">•••</span>
              </summary>
              <div className="absolute right-0 mt-2 w-40 rounded-xl border border-[var(--border-faint)] bg-[var(--surface-card)] py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => onUnfollow(card.removableJobId)}
                  className="w-full px-4 py-2.5 text-left text-sm font-semibold text-[var(--regal-navy)] transition hover:bg-[var(--lemon-chiffon)]"
                >
                  Remove from shelf
                </button>
              </div>
            </details>

            <Link href={card.href} className="flex h-full flex-col">
              <div className={`min-h-[12.5rem] flex-1 bg-gradient-to-br ${TOPIC_BACKGROUNDS[topic]} p-5 text-white`}>
                <div className="mt-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/70">{TOPIC_LABELS[topic]}</p>
                  <h3 className="mt-3 line-clamp-3 font-serif text-[1.65rem] font-medium leading-[1.1] text-white">
                    {card.title}
                  </h3>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-[var(--regal-navy)] px-5 py-3.5 text-white">
                <span className="font-serif text-xl font-medium">Open note</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-sm">›</span>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

function ChatAgentPopup({
  open,
  onClose,
  profile,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  profile: ProfileResponse;
  onPick: (suggestion: ChatSuggestion) => void;
}) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<ChatSuggestion[]>([]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/chat/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          profile,
          previousSuggestions: suggestions.map(({ title, topic }) => ({ title, topic })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch suggestions.');
      setSuggestions(data.suggestions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch suggestions.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <PopupPanel open={open} onClose={onClose} eyebrow="Chat agent" title="Ask once, start a new module thread">
      <form className="space-y-3" onSubmit={handleSubmit}>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="e.g. I keep sounding too direct in meetings and I want a better feel for polite disagreement."
          className="min-h-[130px] w-full resize-none rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-sunken)] px-4 py-3 text-sm leading-6 text-[var(--foreground)] outline-none transition focus:border-[var(--sandy-brown)] focus:ring-2 focus:ring-[var(--sandy-brown)]/20 placeholder:text-[var(--text-muted)]"
        />
        {error ? (
          <p className="rounded-xl border border-[var(--tomato)]/30 bg-[var(--tomato)]/8 px-4 py-3 text-sm text-[var(--tomato)]">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-[var(--regal-navy)] bg-[var(--royal-gold)] px-5 py-2.5 text-sm font-semibold text-[var(--regal-navy)] transition-all hover:bg-[var(--sandy-brown)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
        >
          {loading ? (
            <>
              <span className="animate-spin-slow inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent" />
              Finding suggestions…
            </>
          ) : (
            'Get 3 suggestions'
          )}
        </button>
      </form>

      <div className="mt-5 space-y-3">
        {suggestions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-sunken)] p-5 text-sm leading-7 text-[var(--text-muted)]">
            Ask one specific question and pick a direction — we'll start a fresh module page immediately.
          </div>
        ) : (
          suggestions.map((item) => (
            <SuggestionCard
              key={item.id}
              eyebrow={TOPIC_LABELS[item.topic]}
              title={item.title}
              summary={item.summary}
              onClick={() => onPick(item)}
            />
          ))
        )}
      </div>
    </PopupPanel>
  );
}

function EssentialsPopup({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (starter: (typeof ESSENTIAL_STARTERS)[number]) => void;
}) {
  return (
    <PopupPanel open={open} onClose={onClose} eyebrow="Essential topics" title="Start with something useful right away">
      <div className="grid gap-3 md:grid-cols-2">
        {ESSENTIAL_STARTERS.map((starter) => (
          <SuggestionCard
            key={`${starter.topic}-${starter.title}`}
            eyebrow={TOPIC_LABELS[starter.topic]}
            title={starter.title}
            summary={starter.summary}
            onClick={() => onPick(starter)}
          />
        ))}
      </div>
    </PopupPanel>
  );
}

function syncJobsIntoWorkspaces(jobs: JobSummary[], profile: ProfileResponse) {
  const existingWorkspaces = new Map(readStoredWorkspaces().map((workspace) => [workspace.topic, workspace]));

  jobs.forEach((job) => {
    const topic = job.module?.topic as CulturalTopic | undefined;
    if (!topic) return;
    const base = existingWorkspaces.get(topic) ?? createBlankWorkspace(topic);
    const prior = base.stages.find((stage) => stage.jobId === job.jobId);
    const next = upsertWorkspaceStage(base, {
      id: prior?.id || `stage-${job.jobId}`,
      topic,
      title: job.module?.title || 'Generated note',
      seedText: prior?.seedText || '',
      status: job.status,
      text: job.module?.text || '',
      parentStageId: prior?.parentStageId,
      jobId: job.jobId,
      favorited: profile.savedJobIds.includes(job.jobId),
      createdAt: prior?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    existingWorkspaces.set(topic, next);
    saveWorkspace(next);
  });
}

async function fetchJobs(jobIds: string[]) {
  if (jobIds.length === 0) return [] as JobSummary[];
  const query = encodeURIComponent(jobIds.join(','));
  const response = await fetch(`/api/modules/generate/jobs?ids=${query}`);
  const data = (await response.json()) as { jobs?: JobSummary[]; error?: string };
  if (!response.ok) throw new Error(data.error || 'Failed to load jobs.');
  return data.jobs || [];
}

export function HomeDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [cardsByTopic, setCardsByTopic] = useState<Record<string, ModuleCard[]>>({});
  const [chatOpen, setChatOpen] = useState(false);
  const [essentialsOpen, setEssentialsOpen] = useState(false);

  const loadHomeData = useCallback(async (currentProfile: ProfileResponse) => {
    const workspaceJobIds = readStoredWorkspaces().flatMap((workspace) =>
      workspace.stages.map((stage) => stage.jobId).filter(Boolean) as string[],
    );
    const jobIds = [...new Set([...currentProfile.savedJobIds, ...workspaceJobIds])];
    const jobs = await fetchJobs(jobIds);

    syncJobsIntoWorkspaces(jobs, currentProfile);
    const compactedWorkspaces = compactStoredWorkspacesForHome();
    const stageIdByJobId = new Map(
      compactedWorkspaces.flatMap((workspace) =>
        workspace.stages
          .filter((stage) => stage.jobId)
          .map((stage) => [stage.jobId as string, stage.id] as const),
      ),
    );

    const cards = new Map<CulturalTopic, ModuleCard[]>();
    jobs
      .filter((job) => currentProfile.savedJobIds.includes(job.jobId) && job.module?.topic)
      .forEach((job) => {
        const topic = job.module?.topic as CulturalTopic;
        const stageId = stageIdByJobId.get(job.jobId);
        if (!stageId) return;
        const list = cards.get(topic) ?? [];
        list.push({
          id: `favorite-${job.jobId}`,
          topic,
          title: job.module?.title || 'Saved note',
          subtitle: 'Pinned so you can return fast.',
          href: getModuleStagePath(topic, stageId),
          removableJobId: job.jobId,
        });
        cards.set(topic, list);
      });

    setProfile(currentProfile);
    setCardsByTopic(
      Object.fromEntries(
        Array.from(cards.entries())
          .map(([topic, items]) => [topic, dedupeCards(items)])
          .filter(([, items]) => items.length > 0),
      ),
    );
  }, []);

  useEffect(() => {
    const storedUserId = window.localStorage.getItem(LOCAL_USER_ID_KEY);
    if (!storedUserId) {
      router.replace('/onboarding');
      return;
    }
    fetch(`/api/profile/${encodeURIComponent(storedUserId)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load profile.');
        if (!data.profile?.exists) {
          router.replace('/onboarding');
          return;
        }
        await loadHomeData(data.profile);
      })
      .catch(() => {
        window.localStorage.removeItem(LOCAL_USER_ID_KEY);
        router.replace('/onboarding');
      });
  }, [loadHomeData, router]);

  async function handleUnfollow(jobId: string) {
    if (!profile) return;
    const response = await fetch(`/api/profile/${encodeURIComponent(profile.userId)}/favorites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, action: 'remove' }),
    });
    const data = await response.json();
    if (!response.ok) return;
    removeJobFromWorkspaces(jobId);
    await loadHomeData(data.profile);
  }

  function startThread(topic: CulturalTopic, title: string, seedText: string, summary: string) {
    const base = readStoredWorkspaces().find((workspace) => workspace.topic === topic) ?? createBlankWorkspace(topic);
    const rootStageId = base.stages[0]?.id;
    const stage = createQueuedStage(topic, title, seedText, undefined, rootStageId);
    const next = upsertWorkspaceStage(base, stage);

    queuePendingBranchRequest({
      topic,
      stageId: stage.id,
      source: 'draft',
      title,
      selectedText: seedText,
      contextText: summary,
      createdAt: stage.createdAt,
    });

    saveWorkspace(next);
    setChatOpen(false);
    setEssentialsOpen(false);
    router.push(getModuleStagePath(topic, stage.id));
  }

  const orderedTopics = useMemo(() => Object.keys(cardsByTopic) as CulturalTopic[], [cardsByTopic]);

  if (!profile) {
    return <SkeletonScreen />;
  }

  return (
    <>
      {/* Sticky top nav */}
      <header className="sticky top-0 z-40 border-b border-[var(--border-faint)] bg-[var(--background)]/90 px-4 backdrop-blur-md md:px-6">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4">
          <span className="font-serif text-xl font-medium text-[var(--regal-navy)]">Amparo</span>
          <nav className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEssentialsOpen(true)}
              className="hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface-card)] px-4 py-1.5 text-sm font-semibold text-[var(--regal-navy)] transition hover:bg-[var(--lemon-chiffon)] hover:border-[var(--regal-navy)] sm:inline-flex"
            >
              Essential topics
            </button>
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              className="rounded-xl border-2 border-[var(--regal-navy)] bg-[var(--royal-gold)] px-4 py-1.5 text-sm font-semibold text-[var(--regal-navy)] transition hover:bg-[var(--sandy-brown)] hover:text-white"
            >
              Ask agent
            </button>
            <Link
              href="/profile"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--lemon-chiffon)] text-xs font-bold text-[var(--regal-navy)] transition hover:border-[var(--regal-navy)]"
              aria-label="Profile"
              title={profile.name ? `Profile: ${profile.name}` : 'Profile'}
            >
              {profile.name ? profile.name[0].toUpperCase() : '↗'}
            </Link>
          </nav>
        </div>
      </header>

      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">

          {/* Hero */}
          <section className="rounded-[2rem] border-2 border-[var(--regal-navy)] bg-[var(--surface-card)] p-6 shadow-[8px_8px_0_var(--royal-gold)] animate-fade-in md:p-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--sandy-brown)]">
              {profile.name ? `Welcome back, ${profile.name}` : 'Your cultural guide'}
            </p>
            <h1 className="mt-3 font-serif text-4xl font-light leading-[1.1] text-[var(--regal-navy)] md:text-5xl lg:text-6xl">
              Clean shelves,<br className="hidden sm:block" /> deeper notes when you need them.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--text-muted)] md:text-base md:leading-8">
              Start from an essential topic or the chat agent. Only notes you explicitly save stay on the shelf.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 sm:hidden">
              <button
                type="button"
                onClick={() => setEssentialsOpen(true)}
                className="rounded-xl border-2 border-[var(--regal-navy)] bg-[var(--royal-gold)] px-5 py-2.5 text-sm font-semibold text-[var(--regal-navy)] transition hover:bg-[var(--sandy-brown)] hover:text-white"
              >
                Essential topics
              </button>
              <button
                type="button"
                onClick={() => setChatOpen(true)}
                className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-card)] px-5 py-2.5 text-sm font-semibold text-[var(--regal-navy)] transition hover:bg-[var(--lemon-chiffon)] hover:border-[var(--regal-navy)]"
              >
                Ask agent
              </button>
            </div>
          </section>

          {/* Favorites section */}
          <section className="mt-10 space-y-8 animate-fade-in delay-150">
            <div className="flex items-baseline justify-between gap-4 border-b border-[var(--border-faint)] pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--sandy-brown)]">Personal shelf</p>
                <h2 className="mt-1 font-serif text-2xl font-medium text-[var(--regal-navy)] md:text-3xl">
                  The notes worth keeping
                </h2>
              </div>
              <span className="shrink-0 rounded-full border border-[var(--border-faint)] bg-[var(--lemon-chiffon)] px-3 py-1 text-xs font-semibold text-[var(--regal-navy)]">
                {orderedTopics.reduce((sum, t) => sum + (cardsByTopic[t]?.length ?? 0), 0)} saved
              </span>
            </div>

            {orderedTopics.length === 0 ? (
              <div className="rounded-[1.75rem] border border-dashed border-[var(--border-soft)] bg-[var(--lemon-chiffon)]/50 px-6 py-12 text-center animate-fade-in">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-[var(--regal-navy)] bg-[var(--royal-gold)] text-2xl">
                  ✦
                </div>
                <h3 className="mt-4 font-serif text-xl font-medium text-[var(--regal-navy)]">Your shelf is empty</h3>
                <p className="mt-2 mx-auto max-w-sm text-sm leading-7 text-[var(--text-muted)]">
                  Start with an essential topic, generate a note, and save the ones actually worth keeping.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEssentialsOpen(true)}
                    className="rounded-xl border-2 border-[var(--regal-navy)] bg-[var(--royal-gold)] px-5 py-2.5 text-sm font-semibold text-[var(--regal-navy)] transition hover:bg-[var(--sandy-brown)] hover:text-white"
                  >
                    Browse essential topics
                  </button>
                  <button
                    type="button"
                    onClick={() => setChatOpen(true)}
                    className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-card)] px-5 py-2.5 text-sm font-semibold text-[var(--regal-navy)] transition hover:bg-[var(--lemon-chiffon)]"
                  >
                    Ask the agent
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {orderedTopics.map((topic) => (
                  <FavoriteShelf key={topic} topic={topic} cards={cardsByTopic[topic] || []} onUnfollow={handleUnfollow} />
                ))}
              </div>
            )}
          </section>

        </div>
      </main>

      <ChatAgentPopup
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        profile={profile}
        onPick={(item) => startThread(item.topic, item.title, item.seedText, item.summary)}
      />
      <EssentialsPopup
        open={essentialsOpen}
        onClose={() => setEssentialsOpen(false)}
        onPick={(starter) => startThread(starter.topic, starter.title, starter.seedText, starter.summary)}
      />
    </>
  );
}

function dedupeCards(cards: ModuleCard[]) {
  const seen = new Set<string>();
  return cards.filter((card) => {
    const key = `${card.title}-${card.href}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
