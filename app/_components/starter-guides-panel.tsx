'use client';

import { useCallback, useEffect, useState } from 'react';

import { MarkdownRenderer } from '@/app/_components/markdown-renderer';

import {
  clearStoredStarterGuideJobs,
  getStarterGuideById,
  readStoredStarterGuideJobs,
  StoredStarterGuideJob,
} from '@/lib/starter-modules';
import { TOPIC_LABELS } from '@/lib/onboarding';
import type { ProfileResponse } from '@/lib/profile-api';

type JobStatusPayload = {
  jobId: string;
  status: string;
  progress?: number;
  partialText?: string;
  module?: { title: string; topic: string; text: string };
  error?: string;
};

async function fetchJobs(jobIds: string[]) {
  const query = encodeURIComponent(jobIds.join(','));
  const res = await fetch(`/api/modules/generate/jobs?ids=${query}`, { cache: 'no-store' });
  const data = (await res.json()) as { jobs?: JobStatusPayload[]; error?: string };
  if (!res.ok) throw new Error(data.error || 'Failed to load jobs.');
  return data.jobs || [];
}

function statusLabel(status: string) {
  if (status === 'queued') return 'Queued';
  if (status === 'generating') return 'Writing…';
  if (status === 'completed') return 'Ready';
  if (status === 'failed') return 'Failed';
  return status;
}

export function StarterGuidesPanel({
  profile,
}: {
  profile: ProfileResponse;
}) {
  const [entries, setEntries] = useState<StoredStarterGuideJob[]>(() => readStoredStarterGuideJobs());
  const [jobStates, setJobStates] = useState<Record<string, JobStatusPayload | undefined>>({});

  const allTerminal =
    entries.length > 0 &&
    entries.every((entry) => {
      const status = jobStates[entry.jobId]?.status;
      return status === 'completed' || status === 'failed';
    });

  const pollJobs = useCallback(async (items: StoredStarterGuideJob[]) => {
    const jobIds = items.map((entry) => entry.jobId);
    const jobs = await fetchJobs(jobIds);
    const next = Object.fromEntries(jobs.map((job) => [job.jobId, job])) as Record<string, JobStatusPayload>;
    setJobStates((prev) => ({ ...prev, ...next }));
    return next;
  }, []);

  useEffect(() => {
    if (entries.length === 0) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      if (cancelled) return;
      try {
        const latest = await pollJobs(entries);
        if (cancelled) return;
        const done = entries.every((entry) => {
          const status = latest[entry.jobId]?.status;
          return status === 'completed' || status === 'failed';
        });
        if (!done) {
          timer = setTimeout(tick, 4000);
        }
      } catch {
        if (!cancelled) {
          timer = setTimeout(tick, 6000);
        }
      }
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [entries, pollJobs]);

  if (entries.length === 0) {
    return (
      <section className="rounded-[1.75rem] border-4 border-[var(--regal-navy)] bg-white p-4 shadow-[8px_8px_0_var(--sandy-brown)] md:rounded-[2.5rem] md:p-8 md:shadow-[12px_12px_0_var(--sandy-brown)]">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--sandy-brown)]">Starter guide</p>
        <h2 className="mt-2 text-3xl font-black md:text-4xl">Your first guide will appear here</h2>
        <p className="mt-3 max-w-3xl text-base leading-7 md:text-lg md:leading-8">
          Once your profile creates a starter guide, this section will show its progress and the finished markdown.
        </p>
      </section>
    );
  }

  const showLoader = !allTerminal;

  return (
    <section className="rounded-[1.75rem] border-4 border-[var(--regal-navy)] bg-white p-4 shadow-[8px_8px_0_var(--sandy-brown)] md:rounded-[2.5rem] md:p-8 md:shadow-[12px_12px_0_var(--sandy-brown)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--sandy-brown)]">Your first guide</p>
          <h2 className="mt-2 text-3xl font-black md:text-4xl">We’re building your starter guide</h2>
          <p className="mt-3 text-base leading-7 md:text-lg md:leading-8">
            Based on the daily-life situations you asked for help with, we started one practical guide for {profile.destinationCountry || 'your destination'}.
          </p>
        </div>
      </div>

      {showLoader ? (
        <div className="mt-6 rounded-[1.75rem] border-2 border-dashed border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] px-4 py-5 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--sandy-brown)]">Preparing your dashboard</p>
          <p className="mt-2 text-lg font-semibold">Your first guide is generating now. It will appear below as soon as it is ready.</p>
          <div className="mx-auto mt-4 h-2 w-full max-w-sm overflow-hidden rounded-full bg-white">
            <div className="h-2 w-1/2 animate-pulse rounded-full bg-[var(--regal-navy)]" />
          </div>
        </div>
      ) : null}

      <ul className="mt-6 space-y-4">
        {entries.map((entry, index) => {
          const spec = getStarterGuideById(entry.specId);
          if (!spec) return null;
          const state = jobStates[entry.jobId];
          return (
            <li key={entry.jobId} className="rounded-[1.75rem] border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--sandy-brown)]">Guide {index + 1}</p>
                  <h3 className="mt-1 text-2xl font-black">{spec.titleHint}</h3>
                  <p className="mt-1 text-sm opacity-80">{spec.tagline}</p>
                  <p className="mt-1 text-sm font-semibold">
                    Topic: <span className="font-bold">{TOPIC_LABELS[spec.topic]}</span> ({spec.topic})
                  </p>
                </div>
                <div className="rounded-full border-2 border-[var(--regal-navy)] bg-white px-3 py-2 text-sm font-bold">
                  {state ? statusLabel(state.status) : '…'}
                  {state?.status === 'generating' && typeof state.progress === 'number' ? ` · ${state.progress}%` : ''}
                </div>
              </div>

              {state?.status === 'failed' && state.error ? <p className="mt-3 text-sm text-[var(--tomato)]">{state.error}</p> : null}
              {state?.status === 'completed' && state.module ? (
                <div className="mt-4 rounded-[1.25rem] border-2 border-dashed border-[var(--regal-navy)] bg-white p-4">
                  <MarkdownRenderer content={state.module.text} compact />
                </div>
              ) : state?.status === 'generating' && state.partialText ? (
                <p className="mt-3 line-clamp-4 text-sm leading-6 opacity-80">{state.partialText}</p>
              ) : null}
            </li>
          );
        })}
      </ul>

      {allTerminal ? (
        <div className="mt-6 border-t-2 border-dashed border-[var(--regal-navy)] pt-4">
          <button
            type="button"
            onClick={() => {
              setEntries([]);
              setJobStates({});
              clearStoredStarterGuideJobs();
            }}
            className="text-sm font-bold underline decoration-[var(--sandy-brown)] underline-offset-4 hover:opacity-80"
          >
            Clear starter guide session
          </button>
        </div>
      ) : null}
    </section>
  );
}
