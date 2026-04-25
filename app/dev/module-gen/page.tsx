'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type JobSummary = {
  jobId: string;
  status: string;
  progress: number;
  partialText?: string;
  module?: {
    title: string;
    topic: string;
    text: string;
  };
  error?: string;
  createdAt: string;
  updatedAt: string;
};

type JobState = Partial<JobSummary>;

const demoPayload = {
  userId: 'demo-user',
  highlightedText:
    'People in Germany often value direct communication and may say no clearly instead of softening the message.',
  contextText:
    'This article explains how everyday workplace and social interactions in Germany often prioritize clarity, reliability, and respecting shared expectations. Readers should learn how these values shape conversation, conflict, and collaboration.',
  profile: {
    originCountry: 'Ukraine',
    destinationCountry: 'Germany',
    languageLevel: 'intermediate',
    preferredLearningStyle: 'real_life_examples',
    priorityTopics: ['communication', 'work'],
  },
};

function parseEventData(event: Event) {
  return JSON.parse((event as MessageEvent<string>).data);
}

export default function ModuleGenDevPage() {
  const [payload, setPayload] = useState(JSON.stringify(demoPayload, null, 2));
  const [job, setJob] = useState<JobState>({});
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);

  const renderedMarkdown = useMemo(() => job.module?.text || job.partialText || '', [job]);

  async function loadJobs(showSpinner = true) {
    if (showSpinner) setRefreshing(true);
    try {
      const response = await fetch('/api/modules/generate/jobs?limit=10', { cache: 'no-store' });
      const data = await response.json();
      setJobs(data.jobs || []);
    } finally {
      if (showSpinner) setRefreshing(false);
    }
  }

  useEffect(() => {
    fetch('/api/modules/generate/jobs?limit=10', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => setJobs(data.jobs || []))
      .catch(() => setJobs([]));

    return () => sourceRef.current?.close();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sourceRef.current?.close();
    setLoading(true);
    setJob({});

    try {
      const response = await fetch('/api/modules/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      const created = await response.json();
      if (!response.ok) throw new Error(created.error || 'Failed to create job.');

      setJob(created);
      await loadJobs();

      const source = new EventSource(`/api/modules/generate/${created.jobId}/stream`);
      sourceRef.current = source;

      source.addEventListener('status', (message) => {
        const data = parseEventData(message);
        setJob((current) => ({ ...current, ...data }));
      });

      source.addEventListener('partial', (message) => {
        const data = parseEventData(message);
        setJob((current) => ({ ...current, partialText: data.partialText, progress: data.progress, status: 'generating' }));
      });

      source.addEventListener('completed', async (message) => {
        const data = parseEventData(message);
        setJob((current) => ({ ...current, module: data.module, status: 'completed', progress: 100, partialText: data.module.text }));
        setLoading(false);
        await loadJobs();
        source.close();
      });

      source.addEventListener('failed', async (message) => {
        const data = parseEventData(message);
        setJob((current) => ({ ...current, error: data.error || 'Generation failed.', status: 'failed' }));
        setLoading(false);
        await loadJobs();
        source.close();
      });

      source.onerror = async () => {
        source.close();
        if (!created.jobId) return;
        const fallback = await fetch(`/api/modules/generate/${created.jobId}`, { cache: 'no-store' })
          .then((res) => res.json())
          .catch(() => null);
        if (fallback) setJob((current) => ({ ...current, ...fallback }));
        await loadJobs();
        setLoading(false);
      };
    } catch (error) {
      setJob({ error: error instanceof Error ? error.message : 'Something went wrong.' });
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--lemon-chiffon)] px-4 py-6 text-[var(--regal-navy)] md:px-6">
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2rem] border-4 border-[var(--regal-navy)] bg-white p-5 shadow-[10px_10px_0_var(--royal-gold)]">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--sandy-brown)]">Simple dev testing route</p>
              <h1 className="text-3xl font-black md:text-4xl">Generate + persist module jobs</h1>
              <p className="mt-2 max-w-2xl leading-7">This page is only for testing. Paste JSON, generate a module, watch markdown stream in, then refresh the persisted job list.</p>
            </div>
            <button
              type="button"
              onClick={() => void loadJobs()}
              className="rounded-full border-2 border-[var(--regal-navy)] bg-white px-4 py-2 font-bold hover:bg-[var(--lemon-chiffon)]"
            >
              {refreshing ? 'Refreshing…' : 'Refresh jobs'}
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <textarea
              value={payload}
              onChange={(event) => setPayload(event.target.value)}
              className="min-h-[280px] w-full rounded-[1.5rem] border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-4 font-mono text-sm leading-6 outline-none focus:border-[var(--sandy-brown)]"
              spellCheck={false}
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="rounded-full border-2 border-[var(--regal-navy)] bg-[var(--royal-gold)] px-5 py-3 font-bold transition hover:-translate-y-0.5 hover:bg-[var(--sandy-brown)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Generating…' : 'Generate module'}
              </button>
              <div className="rounded-full border-2 border-[var(--regal-navy)] bg-white px-4 py-2 text-sm font-semibold">
                Status: {job.status || 'idle'} {job.progress ? `· ${job.progress}%` : ''}
              </div>
              {job.jobId ? (
                <div className="rounded-full border-2 border-[var(--regal-navy)] bg-white px-4 py-2 text-sm font-semibold">
                  Job: {job.jobId}
                </div>
              ) : null}
            </div>
            {job.error ? <p className="rounded-2xl border-2 border-[var(--tomato)] bg-white px-4 py-3 text-[var(--tomato)]">{job.error}</p> : null}
          </form>

          <article className="prose prose-slate mt-5 max-w-none rounded-[1.5rem] border-2 border-dashed border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-5 prose-headings:text-[var(--regal-navy)] prose-a:text-[var(--tomato)] prose-strong:text-[var(--regal-navy)]">
            {renderedMarkdown ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{renderedMarkdown}</ReactMarkdown> : <p>Your generated markdown will appear here.</p>}
          </article>
        </section>

        <section className="rounded-[2rem] border-4 border-[var(--regal-navy)] bg-white p-5 shadow-[10px_10px_0_var(--sandy-brown)]">
          <div className="mb-4">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--sandy-brown)]">Persisted jobs</p>
            <h2 className="text-3xl font-black">Recent generation history</h2>
          </div>

          <div className="space-y-3">
            {jobs.length === 0 ? (
              <div className="rounded-[1.5rem] border-2 border-dashed border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-4">
                No jobs found yet. If this stays empty after generation, your Supabase persistence is not configured or lacks access.
              </div>
            ) : (
              jobs.map((item) => (
                <button
                  key={item.jobId}
                  type="button"
                  onClick={() => setJob(item)}
                  className="block w-full rounded-[1.5rem] border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-4 text-left transition hover:-translate-y-0.5 hover:bg-white"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--sandy-brown)]">{item.status}</div>
                      <div className="mt-1 text-lg font-black">{item.module?.title || item.partialText?.split('\n')[0]?.replace(/^#\s*/, '') || 'Untitled job'}</div>
                      <div className="mt-1 text-xs opacity-70">{item.jobId}</div>
                    </div>
                    <div className="rounded-full border-2 border-[var(--regal-navy)] bg-white px-3 py-1 text-sm font-bold">
                      {item.progress}%
                    </div>
                  </div>
                  <div className="mt-3 line-clamp-3 text-sm leading-6 opacity-80">
                    {item.module?.text || item.partialText || item.error || 'No text yet.'}
                  </div>
                </button>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
