'use client';

import Link from 'next/link';
import { STARTER_GUIDE_SPECS } from '@/lib/starter-modules';
import { TOPIC_LABELS } from '@/lib/onboarding';
import type { ProfileResponse } from '@/lib/profile-api';

export function StarterGuidesPanel({
  profile,
}: {
  profile: ProfileResponse;
}) {
  return (
    <section className="rounded-[1.75rem] border-4 border-[var(--regal-navy)] bg-white p-4 shadow-[8px_8px_0_var(--sandy-brown)] md:rounded-[2.5rem] md:p-8 md:shadow-[12px_12px_0_var(--sandy-brown)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--sandy-brown)]">Quick start</p>
          <h2 className="mt-2 text-3xl font-black md:text-4xl">
            Starter guides for {profile.destinationCountry || 'your destination'}
          </h2>
          <p className="mt-3 text-base leading-7 md:text-lg md:leading-8">
            Essential topics to help you get oriented. Click any guide to explore it further.
          </p>
        </div>
      </div>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STARTER_GUIDE_SPECS.map((spec) => (
          <li key={spec.id}>
            <Link
              href={`/modules/${spec.topic}`}
              className="block h-full rounded-[1.75rem] border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--sandy-brown)]">
                {TOPIC_LABELS[spec.topic]}
              </p>
              <h3 className="mt-2 text-xl font-black leading-tight">{spec.titleHint}</h3>
              <p className="mt-2 text-sm leading-6 opacity-80">{spec.tagline}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--regal-navy)]">
                Explore <span aria-hidden>→</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
