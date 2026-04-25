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

function FavoriteShelf({ topic, cards, onUnfollow }: { topic: CulturalTopic; cards: ModuleCard[]; onUnfollow: (jobId: string) => void }) {
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-black md:text-3xl">{TOPIC_LABELS[topic]}</h2>
      <div className="-mx-3 flex gap-4 overflow-x-auto px-3 pb-1">
        {cards.map((card) => (
          <article
            key={card.id}
            className="relative h-[18.5rem] w-[18rem] shrink-0 overflow-hidden rounded-[1.8rem] border-4 border-[var(--regal-navy)] bg-white shadow-[8px_8px_0_var(--royal-gold)] md:h-[20rem] md:w-[19.5rem]"
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
                <h3 className="mt-8 line-clamp-3 text-[1.85rem] font-black leading-[1.04]">{card.title}</h3>
                <p className="mt-3 line-clamp-3 max-w-[13rem] text-sm leading-6 text-white/88">{card.subtitle}</p>
              </div>
              <div className="grid grid-cols-[1fr_auto] items-center gap-3 bg-[#2b1c14] px-5 py-4 text-white">
                <div>
                  <p className="text-3xl font-black leading-none">Open</p>
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

function ChatAgentPopup({ open, onClose, profile, onPick }: { open: boolean; onClose: () => void; profile: ProfileResponse; onPick: (suggestion: ChatSuggestion) => void }) {
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
        body: JSON.stringify({ question, profile, previousSuggestions: suggestions.map(({ title, topic }) => ({ title, topic })) }),
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
    <PopupPanel open={open} onClose={onClose} eyebrow="Chat agent" title="Ask once, start a new module thread">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Example: I keep sounding too direct in meetings and I want a better feel for polite disagreement."
          className="min-h-[150px] w-full rounded-[1.4rem] border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-4 text-sm leading-6 outline-none focus:border-[var(--sandy-brown)]"
        />
        {error ? <p className="rounded-[1.2rem] border-2 border-[var(--tomato)] bg-white px-4 py-3 text-[var(--tomato)]">{error}</p> : null}
        <button type="submit" disabled={loading || !question.trim()} className="w-full rounded-full border-2 border-[var(--regal-navy)] bg-[var(--royal-gold)] px-5 py-3 font-bold disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
          {loading ? 'Finding suggestions…' : 'Get 3 suggestions'}
        </button>
      </form>
      <div className="mt-5 grid gap-3">
        {suggestions.length === 0 ? (
          <div className="rounded-[1.3rem] border-2 border-dashed border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-4 text-sm leading-6 opacity-80">
            Ask one good question and pick a direction to immediately start a new module page.
          </div>
        ) : (
          suggestions.map((item) => (
            <button key={item.id} type="button" onClick={() => onPick(item)} className="rounded-[1.3rem] border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-4 text-left">
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

function EssentialsPopup({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (starter: (typeof ESSENTIAL_STARTERS)[number]) => void }) {
  return (
    <PopupPanel open={open} onClose={onClose} eyebrow="Essential topics" title="Start with something useful right away">
      <div className="grid gap-3 md:grid-cols-2">
        {ESSENTIAL_STARTERS.map((starter) => (
          <button key={`${starter.topic}-${starter.title}`} type="button" onClick={() => onPick(starter)} className="rounded-[1.3rem] border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-4 text-left">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--sandy-brown)]">{TOPIC_LABELS[starter.topic]}</div>
            <h3 className="mt-2 text-lg font-black leading-6">{starter.title}</h3>
            <p className="mt-2 text-sm leading-6 opacity-80">{starter.summary}</p>
          </button>
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

export function HomeDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [cardsByTopic, setCardsByTopic] = useState<Record<string, ModuleCard[]>>({});
  const [chatOpen, setChatOpen] = useState(false);
  const [essentialsOpen, setEssentialsOpen] = useState(false);

  const loadHomeData = useCallback(async (currentProfile: ProfileResponse) => {
    const workspaceJobIds = readStoredWorkspaces().flatMap((workspace) => workspace.stages.map((stage) => stage.jobId).filter(Boolean) as string[]);
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
    jobs.filter((job) => currentProfile.savedJobIds.includes(job.jobId) && job.module?.topic).forEach((job) => {
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
    return <LoadingScreen message="Loading your saved modules." />;
  }

  return (
    <>
      <main className="min-h-screen bg-[var(--lemon-chiffon)] px-3 py-4 text-[var(--regal-navy)] md:px-6 md:py-8">
        <div className="mx-auto max-w-7xl space-y-4 md:space-y-6">
          <section className="rounded-[1.85rem] border-4 border-[var(--regal-navy)] bg-white p-4 shadow-[10px_10px_0_var(--royal-gold)] md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--sandy-brown)]">Know Your Surroundings</p>
                <h1 className="mt-3 text-3xl font-black leading-tight md:text-5xl">Clean shelves, deeper notes only when you need them</h1>
                <p className="mt-4 text-sm leading-6 opacity-80 md:text-base md:leading-7">
                  Start from an essential topic or the chat agent. Only notes you explicitly save stay on the shelf.
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[16rem]">
                <button type="button" onClick={() => setEssentialsOpen(true)} className="rounded-full border-2 border-[var(--regal-navy)] bg-[var(--royal-gold)] px-5 py-3 font-bold">
                  Start essential topic
                </button>
                <button type="button" onClick={() => setChatOpen(true)} className="rounded-full border-2 border-[var(--regal-navy)] bg-white px-5 py-3 font-bold">
                  Ask the chat agent
                </button>
                <Link href="/profile" className="rounded-full border-2 border-[var(--regal-navy)] bg-white px-5 py-3 text-center font-bold">
                  Profile
                </Link>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-[1.5rem] border-4 border-[var(--regal-navy)] bg-white px-4 py-4 shadow-[8px_8px_0_var(--royal-gold)] md:px-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--sandy-brown)] md:text-sm">Personal Favorites ✦</p>
              <h2 className="mt-2 text-2xl font-black md:text-3xl">The notes worth keeping</h2>
            </div>

            {orderedTopics.length === 0 ? (
              <section className="rounded-[1.75rem] border-4 border-[var(--regal-navy)] bg-white p-4 shadow-[8px_8px_0_var(--sandy-brown)] md:p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--sandy-brown)]">No favorites yet</p>
                <h2 className="mt-2 text-2xl font-black md:text-3xl">Start with one essential topic and save the notes you actually want back</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 opacity-80 md:text-base">
                  Your shelves stay intentionally small. Generate what you need, then save only the useful notes.
                </p>
              </section>
            ) : (
              orderedTopics.map((topic) => <FavoriteShelf key={topic} topic={topic} cards={cardsByTopic[topic] || []} onUnfollow={handleUnfollow} />)
            )}
          </section>
        </div>
      </main>

      <ChatAgentPopup open={chatOpen} onClose={() => setChatOpen(false)} profile={profile} onPick={(item) => startThread(item.topic, item.title, item.seedText, item.summary)} />
      <EssentialsPopup open={essentialsOpen} onClose={() => setEssentialsOpen(false)} onPick={(starter) => startThread(starter.topic, starter.title, starter.seedText, starter.summary)} />
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
