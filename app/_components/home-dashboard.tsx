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
  LocalModuleStage,
  queuePendingBranchRequest,
  readStoredWorkspaces,
  removeJobFromWorkspaces,
  saveWorkspace,
  upsertWorkspaceStage,
} from '@/lib/module-workspace';
import { LOCAL_USER_ID_KEY, TOPIC_LABELS } from '@/lib/onboarding';
import type { ProfileResponse } from '@/lib/profile-api';
import {
  getStarterGuideById,
  readStoredStarterGuideJobs,
  StoredStarterGuideJob,
} from '@/lib/starter-modules';

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
  progress: number;
  partialText?: string;
  module?: { title: string; topic: string; text: string };
  error?: string;
  createdAt: string;
  updatedAt: string;
};

type ModuleCard = {
  id: string;
  topic: CulturalTopic;
  title: string;
  subtitle: string;
  href: string;
  removableJobId: string;
  statusLabel: string;
};

function LoadingScreen({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-[var(--lemon-chiffon)] px-4 py-8 text-[var(--regal-navy)] md:px-6 md:py-10">
      <div className="mx-auto flex min-h-[80vh] max-w-5xl items-center justify-center">
        <div className="rounded-[1.75rem] border-4 border-[var(--regal-navy)] bg-white px-6 py-8 text-center shadow-[10px_10px_0_var(--royal-gold)] md:rounded-[2rem] md:px-8 md:py-10 md:shadow-[12px_12px_0_var(--royal-gold)]">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--sandy-brown)]">Loading</p>
          <h1 className="mt-3 text-3xl font-black">Preparing your space</h1>
          <p className="mt-3 max-w-md text-base leading-7 md:text-lg md:leading-8">{message}</p>
        </div>
      </div>
    </main>
  );
}

async function fetchJobs(jobIds: string[]) {
  if (jobIds.length === 0) return [] as JobSummary[];
  const query = encodeURIComponent(jobIds.join(','));
  const response = await fetch(`/api/modules/generate/jobs?ids=${query}`, { cache: 'no-store' });
  const data = (await response.json()) as { jobs?: JobSummary[]; error?: string };
  if (!response.ok) throw new Error(data.error || 'Failed to load jobs.');
  return data.jobs || [];
}

function TopicShelf({
  topic,
  cards,
  onUnfollow,
}: {
  topic: CulturalTopic;
  cards: ModuleCard[];
  onUnfollow: (jobId: string) => void;
}) {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--sandy-brown)] md:text-sm">Topic shelf</p>
        <h2 className="mt-1 text-2xl font-black md:text-3xl">{TOPIC_LABELS[topic]}</h2>
      </div>

      <div className="-mx-3 flex gap-4 overflow-x-auto px-3 pb-1">
        {cards.map((card) => (
          <article
            key={card.id}
            className="relative h-[18.75rem] w-[18rem] shrink-0 overflow-hidden rounded-[1.8rem] border-4 border-[var(--regal-navy)] bg-white shadow-[8px_8px_0_var(--royal-gold)] md:h-[20rem] md:w-[19.5rem]"
          >
            <details className="absolute right-3 top-3 z-10">
              <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border-2 border-[var(--regal-navy)] bg-white text-lg font-black">•••</summary>
              <div className="absolute right-0 mt-2 w-40 rounded-[1rem] border-2 border-[var(--regal-navy)] bg-white p-2 shadow-[4px_4px_0_var(--regal-navy)]">
                <button
                  type="button"
                  onClick={() => onUnfollow(card.removableJobId)}
                  className="w-full rounded-[0.8rem] px-3 py-2 text-left text-sm font-bold hover:bg-[var(--lemon-chiffon)]"
                >
                  Unfollow note
                </button>
              </div>
            </details>

            <Link href={card.href} className="flex h-full flex-col">
              <div className={`min-h-[11.75rem] flex-1 bg-gradient-to-br ${TOPIC_BACKGROUNDS[topic]} p-5 text-white`}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/82">{card.statusLabel}</p>
                <h3 className="mt-3 line-clamp-3 text-[1.85rem] font-black leading-[1.04]">{card.title}</h3>
                <p className="mt-3 line-clamp-3 max-w-[13rem] text-sm leading-6 text-white/88">{card.subtitle}</p>
              </div>
              <div className="grid grid-cols-[1fr_auto] items-center gap-3 bg-[#2b1c14] px-5 py-4 text-white">
                <div>
                  <p className="text-3xl font-black leading-none">Saved</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.22em] text-white/72">Quick return</p>
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-[6px] border-white/25 bg-[#1a110c] text-2xl">›</div>
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
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to fetch suggestions.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <PopupPanel open={open} onClose={onClose} eyebrow="Chat agent" title="Ask once, get three clean note directions">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Example: I keep sounding too direct in meetings and I want a better feel for polite disagreement."
          className="min-h-[150px] w-full rounded-[1.4rem] border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-4 text-sm leading-6 outline-none focus:border-[var(--sandy-brown)]"
        />
        {error ? <p className="rounded-[1.2rem] border-2 border-[var(--tomato)] bg-white px-4 py-3 text-[var(--tomato)]">{error}</p> : null}
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="w-full rounded-full border-2 border-[var(--regal-navy)] bg-[var(--royal-gold)] px-5 py-3 font-bold disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {loading ? 'Finding suggestions…' : 'Get 3 suggestions'}
        </button>
      </form>

      <div className="mt-5 grid gap-3">
        {suggestions.length === 0 ? (
          <div className="rounded-[1.3rem] border-2 border-dashed border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-4 text-sm leading-6 opacity-80">
            Ask one good question and we’ll open the next note page for you immediately.
          </div>
        ) : (
          suggestions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onPick(item)}
              className="rounded-[1.3rem] border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-4 text-left"
            >
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--sandy-brown)]">{TOPIC_LABELS[item.topic]}</div>
              <h3 className="mt-2 text-lg font-black leading-6">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 opacity-80">{item.summary}</p>
            </button>
          ))
        )}
      </div>
    </PopupPanel>
  );
}

function syncJobsIntoWorkspaces(jobs: JobSummary[], profile: ProfileResponse, starterEntries: StoredStarterGuideJob[]) {
  const starterByJobId = new Map(starterEntries.map((entry) => [entry.jobId, entry]));
  const existingWorkspaces = new Map(readStoredWorkspaces().map((workspace) => [workspace.topic, workspace]));

  jobs.forEach((job) => {
    const starter = starterByJobId.get(job.jobId);
    const topic = (job.module?.topic || (starter ? getStarterGuideById(starter.specId)?.topic : undefined)) as CulturalTopic | undefined;
    if (!topic) return;

    const base = existingWorkspaces.get(topic) ?? createBlankWorkspace(topic);
    const prior = base.stages.find((stage) => stage.jobId === job.jobId);
    const title = job.module?.title || (starter ? getStarterGuideById(starter.specId)?.titleHint : undefined) || 'Generated note';
    const stage: LocalModuleStage = {
      id: prior?.id || `stage-${job.jobId}`,
      topic,
      title,
      seedText: prior?.seedText || job.partialText || '',
      status: job.status,
      text: job.module?.text || job.partialText || '',
      jobId: job.jobId,
      error: job.error,
      favorited: profile.savedJobIds.includes(job.jobId),
      createdAt: prior?.createdAt || job.createdAt,
      updatedAt: job.updatedAt,
    };
    const next = upsertWorkspaceStage(base, stage);
    existingWorkspaces.set(topic, next);
    saveWorkspace(next);
  });
}

async function autoFavoriteStarterNotes(profile: ProfileResponse, jobs: JobSummary[], starterEntries: StoredStarterGuideJob[]) {
  let nextProfile = profile;

  for (const entry of starterEntries) {
    if (nextProfile.savedJobIds.includes(entry.jobId)) continue;
    const job = jobs.find((item) => item.jobId === entry.jobId);
    if (!job?.module || job.status !== 'completed') continue;

    const response = await fetch(`/api/profile/${encodeURIComponent(nextProfile.userId)}/favorites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: entry.jobId, action: 'add' }),
    });
    const data = await response.json();
    if (response.ok && data.profile) {
      nextProfile = data.profile as ProfileResponse;
    }
  }

  return nextProfile;
}

export function HomeDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [cardsByTopic, setCardsByTopic] = useState<Record<string, ModuleCard[]>>({});
  const [chatOpen, setChatOpen] = useState(false);

  const loadHomeData = useCallback(async (currentProfile: ProfileResponse) => {
    const starterEntries = readStoredStarterGuideJobs();
    const workspaceJobIds = readStoredWorkspaces().flatMap((workspace) => workspace.stages.map((stage) => stage.jobId).filter(Boolean) as string[]);
    const jobIds = [...new Set([...currentProfile.savedJobIds, ...starterEntries.map((entry) => entry.jobId), ...workspaceJobIds])];
    const jobs = await fetchJobs(jobIds);

    syncJobsIntoWorkspaces(jobs, currentProfile, starterEntries);
    const nextProfile = await autoFavoriteStarterNotes(currentProfile, jobs, starterEntries);
    syncJobsIntoWorkspaces(jobs, nextProfile, starterEntries);
    compactStoredWorkspacesForHome();

    const starterByJobId = new Map(starterEntries.map((entry) => [entry.jobId, entry]));
    const cards = new Map<CulturalTopic, ModuleCard[]>();

    jobs
      .filter((job) => nextProfile.savedJobIds.includes(job.jobId) && job.module?.topic)
      .forEach((job) => {
        const topic = job.module?.topic as CulturalTopic;
        const starter = starterByJobId.get(job.jobId);
        const starterSpec = starter ? getStarterGuideById(starter.specId) : undefined;
        const list = cards.get(topic) ?? [];
        list.push({
          id: `favorite-${job.jobId}`,
          topic,
          title: job.module?.title || 'Saved note',
          subtitle: starterSpec ? starterSpec.tagline : 'Saved so you can jump back without keeping the whole branch alive.',
          href: getModuleStagePath(topic, `stage-${job.jobId}`),
          removableJobId: job.jobId,
          statusLabel: starterSpec ? 'Starter favorite' : 'Saved note',
        });
        cards.set(topic, list);
      });

    setProfile(nextProfile);
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

    fetch(`/api/profile/${encodeURIComponent(storedUserId)}`, { cache: 'no-store' })
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

  function handlePickSuggestion(suggestion: ChatSuggestion) {
    const base = readStoredWorkspaces().find((workspace) => workspace.topic === suggestion.topic) ?? createBlankWorkspace(suggestion.topic);
    const rootStageId = base.stages[0]?.id;
    const stage = createQueuedStage(suggestion.topic, suggestion.title, suggestion.seedText, undefined, rootStageId);
    const next = upsertWorkspaceStage(base, stage);

    queuePendingBranchRequest({
      topic: suggestion.topic,
      stageId: stage.id,
      source: 'draft',
      title: suggestion.title,
      selectedText: suggestion.seedText,
      contextText: suggestion.summary,
      createdAt: stage.createdAt,
    });

    saveWorkspace(next);
    setChatOpen(false);
    router.push(getModuleStagePath(suggestion.topic, stage.id));
  }

  const orderedTopics = useMemo(() => Object.keys(cardsByTopic) as CulturalTopic[], [cardsByTopic]);

  if (!profile) {
    return <LoadingScreen message="Loading your saved modules." />;
  }

  return (
    <>
      <main className="min-h-screen bg-[var(--lemon-chiffon)] px-3 py-4 text-[var(--regal-navy)] md:px-6 md:py-8">
        <div className="mx-auto max-w-7xl space-y-4 md:space-y-6">
          <section className="overflow-hidden rounded-[1.85rem] border-4 border-[var(--regal-navy)] bg-white shadow-[10px_10px_0_var(--royal-gold)]">
            <div className="bg-[linear-gradient(135deg,#7c2d12_0%,#c2410c_58%,#f4d35e_100%)] px-4 py-5 text-white md:px-6 md:py-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-white/82">Know Your Surroundings</p>
                  <h1 className="mt-3 text-3xl font-black leading-tight md:text-5xl">Saved modules first, deeper notes only when you need them</h1>
                  <p className="mt-4 text-sm leading-6 text-white/88 md:text-base md:leading-7">
                    The shelf only shows notes worth keeping. Pick text inside any note and we’ll immediately spin up a sharper follow-up page.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[16rem]">
                  <button
                    type="button"
                    onClick={() => setChatOpen(true)}
                    className="rounded-full border-2 border-white/80 bg-white/14 px-5 py-3 text-center font-bold text-white backdrop-blur-sm"
                  >
                    Ask the chat agent
                  </button>
                  <Link href="/profile" className="rounded-full border-2 border-white/80 bg-white/14 px-5 py-3 text-center font-bold text-white backdrop-blur-sm">
                    Profile
                  </Link>
                </div>
              </div>
            </div>
            <div className="grid gap-3 px-4 py-4 md:grid-cols-2 md:px-6 md:py-5">
              <div className="rounded-[1.35rem] border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-4">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--sandy-brown)]">Saved shelves</div>
                <div className="mt-2 text-3xl font-black">{orderedTopics.length}</div>
              </div>
              <div className="rounded-[1.35rem] border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-4">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--sandy-brown)]">Saved notes</div>
                <div className="mt-2 text-3xl font-black">{profile.savedJobIds.length}</div>
              </div>
            </div>
          </section>

          {orderedTopics.length === 0 ? (
            <section className="rounded-[1.75rem] border-4 border-[var(--regal-navy)] bg-white p-4 shadow-[8px_8px_0_var(--sandy-brown)] md:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--sandy-brown)]">No saved modules yet</p>
              <h2 className="mt-2 text-2xl font-black md:text-3xl">Ask the chat agent or wait for your first starter note</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 opacity-80 md:text-base">
                Only favorited notes stay on the shelf. Your first starter note will be favorited automatically once it finishes.
              </p>
            </section>
          ) : (
            orderedTopics.map((topic) => (
              <TopicShelf key={topic} topic={topic} cards={cardsByTopic[topic] || []} onUnfollow={handleUnfollow} />
            ))
          )}
        </div>
      </main>

      <ChatAgentPopup open={chatOpen} onClose={() => setChatOpen(false)} profile={profile} onPick={handlePickSuggestion} />
    </>
  );
}

function dedupeCards(cards: ModuleCard[]) {
  const seen = new Set<string>();
  return cards.filter((card) => {
    const key = `${card.title}-${card.statusLabel}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
