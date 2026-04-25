'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { StarterGuidesPanel } from './starter-guides-panel';
import {
  getAvoidSelectionLabels,
  getHelpSelectionLabels,
  LOCAL_USER_ID_KEY,
  LEARNING_STYLE_LABELS,
  LANGUAGE_LEVEL_LABELS,
  TOPIC_LABELS,
} from '@/lib/onboarding';
import { ProfileResponse } from '@/lib/profile-api';

function LoadingScreen({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-[var(--lemon-chiffon)] px-6 py-10 text-[var(--regal-navy)]">
      <div className="mx-auto flex min-h-[80vh] max-w-5xl items-center justify-center">
        <div className="rounded-[2rem] border-4 border-[var(--regal-navy)] bg-white px-8 py-10 text-center shadow-[12px_12px_0_var(--royal-gold)]">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--sandy-brown)]">Loading</p>
          <h1 className="mt-3 text-3xl font-black">Preparing your space</h1>
          <p className="mt-3 max-w-md text-lg leading-8">{message}</p>
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.75rem] border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-4">
      <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--sandy-brown)]">{label}</div>
      <div className="mt-2 text-lg font-black leading-7">{value}</div>
    </div>
  );
}

function TopicChip({ label }: { label: string }) {
  return <span className="rounded-full border-2 border-[var(--regal-navy)] bg-white px-3 py-2 text-sm font-semibold">{label}</span>;
}

function ProfileSummary({ profile, onReset }: { profile: ProfileResponse; onReset: () => void }) {
  return (
    <main className="min-h-screen bg-[var(--lemon-chiffon)] px-6 py-8 text-[var(--regal-navy)] md:py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[2.5rem] border-4 border-[var(--regal-navy)] bg-white p-6 shadow-[12px_12px_0_var(--royal-gold)] md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--sandy-brown)]">Home</p>
              <h1 className="mt-3 text-4xl font-black md:text-5xl">
                Welcome{profile.name ? `, ${profile.name}` : ''}
              </h1>
              <p className="mt-4 text-lg leading-8">
                Your cultural orientation profile is ready. This home view now knows where you are coming from,
                where you are adapting to, and what kind of support feels most useful.
              </p>
            </div>
            <div className="rounded-[1.75rem] border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] px-5 py-4">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--sandy-brown)]">Route</div>
              <div className="mt-2 text-lg font-black">
                {profile.originCountry || 'Unknown origin'} → {profile.destinationCountry || 'Unknown destination'}
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Language comfort"
              value={profile.languageLevel ? LANGUAGE_LEVEL_LABELS[profile.languageLevel] : 'Not set'}
            />
            <StatCard
              label="Learning style"
              value={profile.preferredLearningStyle ? LEARNING_STYLE_LABELS[profile.preferredLearningStyle] : 'Not set'}
            />
            <StatCard label="Priority topics" value={`${profile.priorityTopics.length} selected`} />
            <StatCard label="Saved guides" value={`${profile.savedJobIds.length} favorited`} />
          </div>
        </section>

        <StarterGuidesPanel profile={profile} />

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-[2rem] border-4 border-[var(--regal-navy)] bg-white p-6 shadow-[12px_12px_0_var(--sandy-brown)]">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--sandy-brown)]">Focus areas</p>
            <h2 className="mt-2 text-3xl font-black">What matters to you right now</h2>
            <div className="mt-5 flex flex-wrap gap-3">
              {profile.priorityTopics.map((topic) => (
                <TopicChip key={topic} label={TOPIC_LABELS[topic]} />
              ))}
            </div>
            <div className="mt-6 rounded-[1.5rem] border-2 border-dashed border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-4 leading-7">
              <strong>Help wanted:</strong>{' '}
              {profile.wantsHelpWith.length > 0 ? getHelpSelectionLabels(profile.wantsHelpWith).join(', ') : 'No daily-life areas chosen yet.'}
            </div>
            {profile.avoidTopics.length > 0 ? (
              <div className="mt-4 rounded-[1.5rem] border-2 border-[var(--tomato)] bg-white p-4 leading-7 text-[var(--tomato)]">
                <strong>Topics to steer clear of:</strong> {getAvoidSelectionLabels(profile.avoidTopics).join(', ')}
              </div>
            ) : null}
          </article>

          <article className="rounded-[2rem] border-4 border-[var(--regal-navy)] bg-white p-6 shadow-[12px_12px_0_var(--royal-gold)]">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--sandy-brown)]">Next step</p>
            <h2 className="mt-2 text-3xl font-black">Ready for guided support</h2>
            <p className="mt-4 leading-8">
              The onboarding flow is complete. You can now move into module generation, chatbot prompting, and
              favorites with this saved profile as context.
            </p>
            <div className="mt-6 grid gap-3">
              <Link href="/dev" className="rounded-full border-2 border-[var(--regal-navy)] bg-[var(--royal-gold)] px-5 py-3 text-center font-bold transition hover:bg-[var(--sandy-brown)]">
                Open dev playground
              </Link>
              <Link href="/dev/chat-suggestions" className="rounded-full border-2 border-[var(--regal-navy)] bg-white px-5 py-3 text-center font-bold transition hover:bg-[var(--lemon-chiffon)]">
                Test chat suggestions
              </Link>
              <button
                type="button"
                onClick={onReset}
                className="rounded-full border-2 border-[var(--regal-navy)] bg-white px-5 py-3 text-center font-bold transition hover:bg-[var(--lemon-chiffon)]"
              >
                Reset local setup
              </button>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}

export function HomeDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);

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
      });
  }, [router]);

  function handleReset() {
    window.localStorage.removeItem(LOCAL_USER_ID_KEY);
    router.replace('/onboarding');
  }

  if (!profile) {
    return <LoadingScreen message="Loading your saved profile." />;
  }

  return <ProfileSummary profile={profile} onReset={handleReset} />;
}
