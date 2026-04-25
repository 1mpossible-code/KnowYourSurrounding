'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  getAvoidSelectionLabels,
  getHelpSelectionLabels,
  LANGUAGE_LEVEL_LABELS,
  LEARNING_STYLE_LABELS,
  LOCAL_USER_ID_KEY,
  getSelectedLabels,
} from '@/lib/onboarding';
import type { ProfileResponse } from '@/lib/profile-api';

function Avatar({ name }: { name?: string | null }) {
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-[var(--regal-navy)] bg-[var(--royal-gold)] text-lg font-bold text-[var(--regal-navy)]">
      {initials}
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-faint)] bg-[var(--surface-card)] p-4 transition-shadow hover:shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--sandy-brown)]">{label}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--foreground)] md:text-base">{value || '—'}</p>
    </div>
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-shimmer rounded-xl ${className}`} />;
}

export function ProfileScreen() {
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

  if (!profile) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)]">
        <div className="mx-auto max-w-3xl space-y-6">
          <SkeletonBlock className="h-32" />
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-20" />
            ))}
          </div>
          <SkeletonBlock className="h-40" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)] md:px-6 md:py-10">
      <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">

        {/* Header card */}
        <section className="rounded-[1.75rem] border-2 border-[var(--regal-navy)] bg-[var(--surface-card)] p-5 shadow-[6px_6px_0_var(--royal-gold)] md:p-7">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--sandy-brown)] transition-opacity hover:opacity-70"
          >
            ← Back home
          </Link>

          <div className="mt-5 flex items-center gap-4">
            <Avatar name={profile.name} />
            <div>
              <h1 className="font-serif text-2xl font-medium leading-tight text-[var(--regal-navy)] md:text-3xl">
                {profile.name ? profile.name : 'Your Profile'}
              </h1>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {profile.originCountry && profile.destinationCountry
                  ? `${profile.originCountry} → ${profile.destinationCountry}`
                  : 'Cultural orientation profile'}
              </p>
            </div>
          </div>

          <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--text-muted)] md:text-base md:leading-8">
            This context shapes your modules, suggestions, and saved notes.
          </p>
        </section>

        {/* Detail cards grid */}
        <section className="grid gap-3 md:grid-cols-2">
          <DetailCard
            label="Journey"
            value={`${profile.originCountry || 'Unknown origin'} → ${profile.destinationCountry || 'Unknown destination'}`}
          />
          <DetailCard
            label="Language comfort"
            value={profile.languageLevel ? LANGUAGE_LEVEL_LABELS[profile.languageLevel] : 'Not set'}
          />
          <DetailCard
            label="Learning style"
            value={profile.preferredLearningStyle ? LEARNING_STYLE_LABELS[profile.preferredLearningStyle] : 'Not set'}
          />
          <DetailCard label="Saved notes" value={`${profile.savedJobIds.length} favorited`} />
          <DetailCard
            label="Priority topics"
            value={profile.priorityTopics.length ? getSelectedLabels(profile.priorityTopics).join(', ') : 'None yet'}
          />
          <DetailCard
            label="Daily-life support"
            value={profile.wantsHelpWith.length ? getHelpSelectionLabels(profile.wantsHelpWith).join(', ') : 'None yet'}
          />
          <div className="md:col-span-2">
            <DetailCard
              label="Topics to avoid"
              value={profile.avoidTopics.length ? getAvoidSelectionLabels(profile.avoidTopics).join(', ') : 'None selected'}
            />
          </div>
        </section>

        {/* Account actions */}
        <section className="rounded-[1.75rem] border border-[var(--border-faint)] bg-[var(--surface-card)] p-5 md:p-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--sandy-brown)]">Account</p>
          <h2 className="mt-2 font-serif text-2xl font-medium text-[var(--regal-navy)] md:text-3xl">Reset this device</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-muted)] md:text-base md:leading-7">
            Removes your local user ID and sends you back through onboarding. Server-side data tied to that user ID is not deleted.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                window.localStorage.removeItem(LOCAL_USER_ID_KEY);
                router.replace('/onboarding');
              }}
              className="inline-flex items-center justify-center rounded-xl border-2 border-[var(--regal-navy)] bg-[var(--royal-gold)] px-5 py-2.5 text-sm font-semibold text-[var(--regal-navy)] transition-all hover:bg-[var(--sandy-brown)] hover:text-white active:scale-[0.98] sm:w-auto"
            >
              Reset onboarding
            </button>
          </div>

          <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-sunken)] p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--sandy-brown)]">Experimental</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Hidden here so the main app stays clean.</p>
            <Link
              href="/experimental"
              className="mt-3 inline-flex rounded-xl border border-[var(--border-soft)] bg-[var(--surface-card)] px-4 py-2 text-sm font-semibold text-[var(--regal-navy)] transition-all hover:border-[var(--regal-navy)] hover:bg-[var(--lemon-chiffon)]"
            >
              Open experimental area →
            </Link>
          </div>
        </section>

      </div>
    </main>
  );
}
