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

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.35rem] border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-4">
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--sandy-brown)]">{label}</div>
      <div className="mt-2 text-sm leading-6 md:text-base">{value}</div>
    </div>
  );
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
      <main className="min-h-screen bg-[var(--lemon-chiffon)] px-4 py-8 text-[var(--regal-navy)]">
        <div className="mx-auto max-w-4xl rounded-[1.75rem] border-4 border-[var(--regal-navy)] bg-white p-6 shadow-[8px_8px_0_var(--royal-gold)]">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--sandy-brown)]">Loading profile</p>
          <h1 className="mt-3 text-3xl font-black">Preparing your settings</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--lemon-chiffon)] px-3 py-4 text-[var(--regal-navy)] md:px-6 md:py-8">
      <div className="mx-auto max-w-5xl space-y-4 md:space-y-6">
        <section className="rounded-[1.75rem] border-4 border-[var(--regal-navy)] bg-white p-4 shadow-[8px_8px_0_var(--royal-gold)] md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <Link href="/" className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--sandy-brown)]">
                ← Back home
              </Link>
              <h1 className="mt-3 text-3xl font-black md:text-4xl">Profile</h1>
              <p className="mt-3 text-base leading-7 md:text-lg md:leading-8">
                This is the context shaping your modules, suggestions, and saved notes.
              </p>
            </div>
            <div className="rounded-[1.5rem] border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] px-4 py-3 text-sm font-semibold">
              {profile.name ? `Signed in as ${profile.name}` : 'Demo profile'}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <DetailCard label="Route" value={`${profile.originCountry || 'Unknown origin'} → ${profile.destinationCountry || 'Unknown destination'}`} />
          <DetailCard label="Language comfort" value={profile.languageLevel ? LANGUAGE_LEVEL_LABELS[profile.languageLevel] : 'Not set'} />
          <DetailCard label="Learning style" value={profile.preferredLearningStyle ? LEARNING_STYLE_LABELS[profile.preferredLearningStyle] : 'Not set'} />
          <DetailCard label="Saved notes" value={`${profile.savedJobIds.length} favorited`} />
          <DetailCard label="Priority topics" value={profile.priorityTopics.length ? getSelectedLabels(profile.priorityTopics).join(', ') : 'None yet'} />
          <DetailCard label="Daily-life support" value={profile.wantsHelpWith.length ? getHelpSelectionLabels(profile.wantsHelpWith).join(', ') : 'None yet'} />
          <DetailCard label="Avoid topics" value={profile.avoidTopics.length ? getAvoidSelectionLabels(profile.avoidTopics).join(', ') : 'None'} />
        </section>

        <section className="rounded-[1.75rem] border-4 border-[var(--regal-navy)] bg-white p-4 shadow-[8px_8px_0_var(--sandy-brown)] md:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--sandy-brown)]">Account actions</p>
          <h2 className="mt-2 text-2xl font-black md:text-3xl">Reset this demo device</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 opacity-80 md:text-base">
            This removes your local user id and sends you back through onboarding. Server-side profile data remains tied to that generated user id unless replaced later.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                window.localStorage.removeItem(LOCAL_USER_ID_KEY);
                router.replace('/onboarding');
              }}
              className="w-full rounded-full border-2 border-[var(--regal-navy)] bg-[var(--royal-gold)] px-5 py-3 font-bold sm:w-auto"
            >
              Reset onboarding
            </button>
            <Link href="/experimental" className="w-full rounded-full border-2 border-[var(--regal-navy)] bg-white px-5 py-3 text-center font-bold sm:w-auto">
              Experimental area
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
