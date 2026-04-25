'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { PopupPanel } from '@/app/_components/popup-panel';
import { ChatSuggestion } from '@/lib/chat-suggestions';
import { CulturalTopic } from '@/lib/cultural-orientation';
import {
  buildWorkspaceSummary,
  createBlankWorkspace,
  getModuleStagePath,
  LocalModuleStage,
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
  greetings: 'from-[#1f5d8b] via-[#3a7ca5] to-[#8ac6d1]',
  public_behavior: 'from-[#355c7d] via-[#6c5b7b] to-[#c06c84]',
  communication: 'from-[#5448c8] via-[#7765f7] to-[#b499ff]',
  personal_space: 'from-[#23667d] via-[#3d8b99] to-[#91d8d3]',
  time: 'from-[#16324f] via-[#235789] to-[#c8d8e4]',
  work: 'from-[#125d68] via-[#2f8f9d] to-[#b5ead7]',
  school: 'from-[#3f37c9] via-[#5a54f9] to-[#b7b5ff]',
  gender: 'from-[#8f3b76] via-[#c0578a] to-[#f7b3cc]',
  religion: 'from-[#4a266a] via-[#7d3c98] to-[#c38fff]',
  dating: 'from-[#ba3f7b] via-[#e35d9f] to-[#ffb6c9]',
  conflict: 'from-[#264653] via-[#2a6f73] to-[#84c69b]',
  laws: 'from-[#243b53] via-[#486581] to-[#d9e2ec]',
  money: 'from-[#157347] via-[#2e8b57] to-[#9ed2a7]',
  food: 'from-[#b85c38] via-[#e07a5f] to-[#f2cc8f]',
  clothing: 'from-[#495057] via-[#6c757d] to-[#ced4da]',
  digital: 'from-[#22577a] via-[#38a3a5] to-[#80ed99]',
  safety: 'from-[#861657] via-[#aa4465] to-[#f08a8a]',
  healthcare: 'from-[#1d7874] via-[#4ea699] to-[#c6f1e7]',
  government: 'from-[#283d8f] via-[#3d5af1] to-[#9ab3ff]',
  transit: 'from-[#2b59c3] via-[#4f7df3] to-[#9ed8ff]',
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
  status: string;
  href: string;
  removableJobId?: string;
  progressLabel: string;
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

function statusLabel(status: JobSummary['status']) {
  if (status === 'queued') return 'Queued';
  if (status === 'generating') return 'Writing';
  if (status === 'completed') return 'Ready';
  return 'Issue';
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--sandy-brown)] md:text-sm">Topic shelf</p>
          <h2 className="mt-1 text-2xl font-black md:text-3xl">{TOPIC_LABELS[topic]}</h2>
        </div>
        <Link href={getModuleStagePath(topic)} className="rounded-full border-2 border-[var(--regal-navy)] bg-white px-4 py-2 text-sm font-bold">
          Open root page
        </Link>
      </div>

      <div className="-mx-3 flex gap-4 overflow-x-auto px-3 pb-1">
        {cards.map((card) => (
          <article
            key={card.id}
            className="relative h-[19.5rem] w-[18.5rem] shrink-0 overflow-hidden rounded-[1.9rem] border-4 border-[var(--regal-navy)] bg-white shadow-[8px_8px_0_var(--royal-gold)] md:h-[21rem] md:w-[21rem]"
          >
            {card.removableJobId ? (
              <details className="absolute right-3 top-3 z-10">
                <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border-2 border-[var(--regal-navy)] bg-white text-lg font-black">•••</summary>
                <div className="absolute right-0 mt-2 w-40 rounded-[1rem] border-2 border-[var(--regal-navy)] bg-white p-2 shadow-[4px_4px_0_var(--regal-navy)]">
                  <button
                    type="button"
                    onClick={() => onUnfollow(card.removableJobId as string)}
                    className="w-full rounded-[0.8rem] px-3 py-2 text-left text-sm font-bold hover:bg-[var(--lemon-chiffon)]"
                  >
                    Unfollow note
                  </button>
                </div>
              </details>
            ) : null}

            <Link href={card.href} className="flex h-full flex-col">
              <div className={`min-h-[12.2rem] flex-1 bg-gradient-to-br ${TOPIC_BACKGROUNDS[topic]} p-5 text-white`}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/82">{card.status}</p>
                <h3 className="mt-3 line-clamp-3 text-[1.95rem] font-black leading-[1.02]">{card.title}</h3>
                <p className="mt-3 line-clamp-3 max-w-[14rem] text-sm leading-6 text-white/86">{card.subtitle}</p>
              </div>
              <div className="grid grid-cols-[1fr_auto] items-center gap-3 bg-[#221f1d] px-5 py-4 text-white">
                <div>
                  <p className="text-3xl font-black leading-none">{card.progressLabel}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.22em] text-white/70">Current state</p>
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-[6px] border-white/25 bg-[#151311] text-2xl">›</div>
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
}: {
  open: boolean;
  onClose: () => void;
  profile: ProfileResponse;
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
    <PopupPanel open={open} onClose={onClose} eyebrow="Chat agent" title="Find the next three useful notes">
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
            Ask one good question and this popup will return three strong directions you can turn into notes.
          </div>
        ) : (
          suggestions.map((item) => (
            <Link
              key={item.id}
              href={`${getModuleStagePath(item.topic)}?seed=${encodeURIComponent(item.seedText)}&title=${encodeURIComponent(item.title)}`}
              onClick={onClose}
              className="rounded-[1.3rem] border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-4"
            >
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--sandy-brown)]">{TOPIC_LABELS[item.topic]}</div>
              <h3 className="mt-2 text-lg font-black leading-6">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 opacity-80">{item.summary}</p>
            </Link>
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

export function HomeDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [cardsByTopic, setCardsByTopic] = useState<Record<string, ModuleCard[]>>({});
  const [chatOpen, setChatOpen] = useState(false);

  const loadHomeData = useCallback(async (currentProfile: ProfileResponse) => {
    const starterEntries = readStoredStarterGuideJobs();
    const initialWorkspaces = readStoredWorkspaces();
    const workspaceJobIds = initialWorkspaces.flatMap((workspace) => workspace.stages.map((stage) => stage.jobId).filter(Boolean) as string[]);
    const jobIds = [...new Set([...currentProfile.savedJobIds, ...starterEntries.map((entry) => entry.jobId), ...workspaceJobIds])];
    const jobs = await fetchJobs(jobIds);
    syncJobsIntoWorkspaces(jobs, currentProfile, starterEntries);
    const workspaceSummaries = readStoredWorkspaces().map(buildWorkspaceSummary).filter(Boolean);

    const cards = new Map<CulturalTopic, ModuleCard[]>();
    const pushCard = (topic: CulturalTopic, card: ModuleCard) => {
      const list = cards.get(topic) ?? [];
      cards.set(topic, [...list, card]);
    };

    workspaceSummaries.forEach((summary) => {
      if (!summary) return;
      pushCard(summary.topic, {
        id: `workspace-${summary.topic}`,
        topic: summary.topic,
        title: summary.latestStageTitle,
        subtitle: `${summary.stageCount} note${summary.stageCount === 1 ? '' : 's'} already live in this topic chain`,
        status: 'Workspace chain',
        href: getModuleStagePath(summary.topic, summary.latestStageId),
        progressLabel: summary.latestStageStatus === 'completed' ? 'Ready' : summary.latestStageStatus,
      });
    });

    starterEntries.forEach((entry) => {
      const starter = getStarterGuideById(entry.specId);
      if (!starter) return;
      const job = jobs.find((item) => item.jobId === entry.jobId);
      pushCard(starter.topic, {
        id: `starter-${entry.jobId}`,
        topic: starter.topic,
        title: starter.titleHint,
        subtitle: starter.tagline,
        status: 'Starter lesson',
        href: getModuleStagePath(starter.topic, `stage-${entry.jobId}`),
        progressLabel: job ? statusLabel(job.status) : 'Queued',
      });
    });

    jobs
      .filter((job) => currentProfile.savedJobIds.includes(job.jobId) && job.module?.topic)
      .forEach((job) => {
        const topic = job.module?.topic as CulturalTopic;
        pushCard(topic, {
          id: `favorite-${job.jobId}`,
          topic,
          title: job.module?.title || 'Saved note',
          subtitle: 'Pinned from your note history',
          status: 'Saved note',
          href: getModuleStagePath(topic, `stage-${job.jobId}`),
          removableJobId: job.jobId,
          progressLabel: 'Saved',
        });
      });

    const next = Object.fromEntries(
      Array.from(cards.entries())
        .map(([topic, items]) => [topic, dedupeCards(items)])
        .filter(([, items]) => items.length > 0),
    );
    setCardsByTopic(next);
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
        setProfile(data.profile);
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
    setProfile(data.profile);
    await loadHomeData(data.profile);
  }

  const orderedTopics = useMemo(() => Object.keys(cardsByTopic) as CulturalTopic[], [cardsByTopic]);

  if (!profile) {
    return <LoadingScreen message="Loading your saved profile and modules." />;
  }

  return (
    <>
      <main className="min-h-screen bg-[var(--lemon-chiffon)] px-3 py-4 text-[var(--regal-navy)] md:px-6 md:py-8">
        <div className="mx-auto max-w-7xl space-y-4 md:space-y-6">
          <section className="overflow-hidden rounded-[1.9rem] border-4 border-[var(--regal-navy)] bg-white shadow-[10px_10px_0_var(--royal-gold)]">
            <div className="bg-[linear-gradient(135deg,#0d3b66_0%,#245b8a_60%,#f4d35e_100%)] px-4 py-5 text-white md:px-6 md:py-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-white/82">Know Your Surroundings</p>
                  <h1 className="mt-3 text-3xl font-black leading-tight md:text-5xl">Modules that keep branching into deeper notes</h1>
                  <p className="mt-4 text-sm leading-6 text-white/88 md:text-base md:leading-7">
                    Keep the home page clean, open fixed lesson cards, and let every good passage spin off into another focused page.
                  </p>
                </div>
                <div className="grid w-full gap-3 sm:w-auto sm:min-w-[18rem]">
                  <button
                    type="button"
                    onClick={() => setChatOpen(true)}
                    className="rounded-full border-2 border-white/80 bg-white/14 px-5 py-3 text-center font-bold text-white backdrop-blur-sm"
                  >
                    Open chat agent
                  </button>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Link href="/profile" className="rounded-full border-2 border-white/80 bg-white/14 px-5 py-3 text-center font-bold text-white backdrop-blur-sm">
                      Profile
                    </Link>
                    <Link href="/experimental" className="rounded-full border-2 border-white/80 bg-white/14 px-5 py-3 text-center font-bold text-white backdrop-blur-sm">
                      Experimental
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid gap-3 px-4 py-4 md:grid-cols-3 md:px-6 md:py-5">
              <div className="rounded-[1.35rem] border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-4">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--sandy-brown)]">Topic shelves</div>
                <div className="mt-2 text-3xl font-black">{orderedTopics.length}</div>
              </div>
              <div className="rounded-[1.35rem] border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-4">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--sandy-brown)]">Saved notes</div>
                <div className="mt-2 text-3xl font-black">{profile.savedJobIds.length}</div>
              </div>
              <div className="rounded-[1.35rem] border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-4">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--sandy-brown)]">Priority route</div>
                <div className="mt-2 text-base font-black leading-6 md:text-lg">
                  {profile.originCountry || 'Unknown origin'} → {profile.destinationCountry || 'Unknown destination'}
                </div>
              </div>
            </div>
          </section>

          {orderedTopics.length === 0 ? (
            <section className="rounded-[1.75rem] border-4 border-[var(--regal-navy)] bg-white p-4 shadow-[8px_8px_0_var(--sandy-brown)] md:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--sandy-brown)]">No modules yet</p>
              <h2 className="mt-2 text-2xl font-black md:text-3xl">Your shelves will fill as you generate and save notes</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 opacity-80 md:text-base">
                Starter lessons, pinned notes, and every branching page will show up here once they exist.
              </p>
            </section>
          ) : (
            orderedTopics.map((topic) => (
              <TopicShelf key={topic} topic={topic} cards={cardsByTopic[topic] || []} onUnfollow={handleUnfollow} />
            ))
          )}
        </div>
      </main>

      <ChatAgentPopup open={chatOpen} onClose={() => setChatOpen(false)} profile={profile} />
    </>
  );
}

function dedupeCards(cards: ModuleCard[]) {
  const seen = new Set<string>();
  return cards.filter((card) => {
    const key = `${card.title}-${card.status}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
