'use client';

import { FormEvent, useEffect, useState } from 'react';

type Profile = {
  exists: boolean;
  userId: string;
  name: string | null;
  originCountry: string | null;
  destinationCountry: string | null;
  languageLevel: string | null;
  priorityTopics: string[];
  preferredLearningStyle: string | null;
  wantsHelpWith: string[];
  avoidTopics: string[];
  savedJobIds: string[];
};

type Job = {
  jobId: string;
  status: string;
  module?: { title: string; topic: string };
};

const defaultUserId = 'demo-user';

export default function ProfileLabPage() {
  const [userId, setUserId] = useState(defaultUserId);
  const [patchBody, setPatchBody] = useState(JSON.stringify({ name: 'Mila', originCountry: 'Ukraine', destinationCountry: 'Germany', languageLevel: 'intermediate' }, null, 2));
  const [favoriteJobId, setFavoriteJobId] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadProfile() {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const [profileResponse, jobsResponse] = await Promise.all([
        fetch(`/api/profile/${encodeURIComponent(userId)}`, { cache: 'no-store' }),
        fetch('/api/modules/generate/jobs?limit=20', { cache: 'no-store' }),
      ]);
      const profileData = await profileResponse.json();
      const jobsData = await jobsResponse.json();
      if (!profileResponse.ok) throw new Error(profileData.error || 'Failed to load profile.');
      setProfile(profileData.profile);
      setJobs(jobsData.jobs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Promise.all([
      fetch(`/api/profile/${encodeURIComponent(defaultUserId)}`, { cache: 'no-store' }),
      fetch('/api/modules/generate/jobs?limit=20', { cache: 'no-store' }),
    ])
      .then(async ([profileResponse, jobsResponse]) => {
        const profileData = await profileResponse.json();
        const jobsData = await jobsResponse.json();
        if (!profileResponse.ok) throw new Error(profileData.error || 'Failed to load profile.');
        setProfile(profileData.profile);
        setJobs(jobsData.jobs || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Something went wrong.'));
  }, []);

  async function handlePatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/profile/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: patchBody,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update profile.');
      setProfile(data.profile);
      setMessage('Profile updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  async function updateFavorite(jobId: string, action: 'add' | 'remove') {
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/profile/${encodeURIComponent(userId)}/favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update favorites.');
      setProfile(data.profile);
      setMessage(`Favorite ${action === 'add' ? 'added' : 'removed'}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  return (
    <main className="min-h-screen bg-[var(--lemon-chiffon)] px-4 py-6 text-[var(--regal-navy)] md:px-6">
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[2rem] border-4 border-[var(--regal-navy)] bg-white p-5 shadow-[10px_10px_0_var(--royal-gold)]">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--sandy-brown)]">Dev route</p>
          <h1 className="mt-2 text-4xl font-black">Profile + favorites lab</h1>
          <div className="mt-4 flex gap-3">
            <input
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              className="flex-1 rounded-full border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] px-4 py-3 outline-none"
              placeholder="demo-user"
            />
            <button type="button" onClick={() => void loadProfile()} className="rounded-full border-2 border-[var(--regal-navy)] bg-white px-4 py-3 font-bold">
              {loading ? 'Loading…' : 'Load'}
            </button>
          </div>

          <form className="mt-5 space-y-4" onSubmit={handlePatch}>
            <textarea
              value={patchBody}
              onChange={(event) => setPatchBody(event.target.value)}
              className="min-h-[220px] w-full rounded-[1.5rem] border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-4 font-mono text-sm leading-6 outline-none focus:border-[var(--sandy-brown)]"
              spellCheck={false}
            />
            <button type="submit" className="rounded-full border-2 border-[var(--regal-navy)] bg-[var(--royal-gold)] px-5 py-3 font-bold transition hover:bg-[var(--sandy-brown)]">
              Update profile
            </button>
          </form>

          <div className="mt-5 rounded-[1.5rem] border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--sandy-brown)]">Manual favorite mutation</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                value={favoriteJobId}
                onChange={(event) => setFavoriteJobId(event.target.value)}
                className="flex-1 rounded-full border-2 border-[var(--regal-navy)] bg-white px-4 py-3 outline-none"
                placeholder="Paste job UUID"
              />
              <button type="button" onClick={() => void updateFavorite(favoriteJobId, 'add')} className="rounded-full border-2 border-[var(--regal-navy)] bg-white px-4 py-3 font-bold">
                Add
              </button>
              <button type="button" onClick={() => void updateFavorite(favoriteJobId, 'remove')} className="rounded-full border-2 border-[var(--regal-navy)] bg-white px-4 py-3 font-bold">
                Remove
              </button>
            </div>
          </div>

          {message ? <p className="mt-4 rounded-2xl border-2 border-[var(--regal-navy)] bg-white px-4 py-3">{message}</p> : null}
          {error ? <p className="mt-4 rounded-2xl border-2 border-[var(--tomato)] bg-white px-4 py-3 text-[var(--tomato)]">{error}</p> : null}
        </section>

        <section className="space-y-6">
          <article className="rounded-[2rem] border-4 border-[var(--regal-navy)] bg-white p-5 shadow-[10px_10px_0_var(--sandy-brown)]">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--sandy-brown)]">Loaded profile</p>
            <pre className="mt-4 overflow-x-auto rounded-[1.5rem] bg-[var(--lemon-chiffon)] p-4 text-sm leading-6">{JSON.stringify(profile, null, 2)}</pre>
          </article>

          <article className="rounded-[2rem] border-4 border-[var(--regal-navy)] bg-white p-5 shadow-[10px_10px_0_var(--royal-gold)]">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--sandy-brown)]">Completed jobs</p>
            <div className="mt-4 space-y-3">
              {jobs.map((job) => {
                const saved = profile?.savedJobIds.includes(job.jobId);
                return (
                  <div key={job.jobId} className="rounded-[1.5rem] border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--sandy-brown)]">{job.status}</div>
                        <div className="mt-1 text-lg font-black">{job.module?.title || job.jobId}</div>
                        <div className="mt-1 text-sm opacity-70">{job.jobId}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void updateFavorite(job.jobId, saved ? 'remove' : 'add')}
                        className="rounded-full border-2 border-[var(--regal-navy)] bg-white px-4 py-2 text-sm font-bold"
                      >
                        {saved ? 'Remove favorite' : 'Add favorite'}
                      </button>
                    </div>
                  </div>
                );
              })}
              {jobs.length === 0 ? <p>No jobs found yet.</p> : null}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
