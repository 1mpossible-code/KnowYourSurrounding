'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';

import { EXPERIMENTAL_UNLOCK_KEY } from '@/lib/module-workspace';

const DEV_PASSWORD = 'dev';

const DEV_LINKS = [
  { href: '/dev', title: 'Dev index', description: 'Overview of internal routes and API checks.' },
  { href: '/dev/module-gen', title: 'Module generation', description: 'Directly test generation jobs and streaming.' },
  { href: '/dev/chat-suggestions', title: 'Chat suggestions', description: 'Inspect the suggestion prompt and response flow.' },
  { href: '/dev/profile-lab', title: 'Profile lab', description: 'Patch and inspect profile behavior manually.' },
];

export function ExperimentalScreen() {
  const [value, setValue] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    queueMicrotask(() => {
      setUnlocked(window.localStorage.getItem(EXPERIMENTAL_UNLOCK_KEY) === 'true');
    });
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (value.trim() !== DEV_PASSWORD) {
      setError('Wrong password.');
      return;
    }
    window.localStorage.setItem(EXPERIMENTAL_UNLOCK_KEY, 'true');
    setUnlocked(true);
    setError('');
  }

  return (
    <main className="min-h-screen bg-[var(--lemon-chiffon)] px-3 py-4 text-[var(--regal-navy)] md:px-6 md:py-8">
      <div className="mx-auto max-w-4xl space-y-4 md:space-y-6">
        <section className="rounded-[1.75rem] border-4 border-[var(--regal-navy)] bg-white p-4 shadow-[8px_8px_0_var(--royal-gold)] md:p-6">
          <Link href="/profile" className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--sandy-brown)]">
            ← Back to profile
          </Link>
          <h1 className="mt-3 text-3xl font-black md:text-4xl">Experimental</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 md:text-lg md:leading-8">
            Internal tools live here so the main product stays clean. Unlock with the dev password when you need diagnostics.
          </p>
        </section>

        {!unlocked ? (
          <section className="rounded-[1.75rem] border-4 border-[var(--regal-navy)] bg-white p-4 shadow-[8px_8px_0_var(--sandy-brown)] md:p-6">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.2em] text-[var(--sandy-brown)]">Password</span>
                <input
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  type="password"
                  className="w-full rounded-[1.5rem] border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] px-4 py-3 outline-none focus:border-[var(--sandy-brown)]"
                />
              </label>
              {error ? <p className="rounded-[1.25rem] border-2 border-[var(--tomato)] bg-white px-4 py-3 text-[var(--tomato)]">{error}</p> : null}
              <button type="submit" className="rounded-full border-2 border-[var(--regal-navy)] bg-[var(--royal-gold)] px-5 py-3 font-bold">
                Unlock experimental area
              </button>
            </form>
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2">
            {DEV_LINKS.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-[1.75rem] border-4 border-[var(--regal-navy)] bg-white p-5 shadow-[8px_8px_0_var(--royal-gold)]">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--sandy-brown)]">Experimental route</p>
                <h2 className="mt-3 text-2xl font-black">{item.title}</h2>
                <p className="mt-3 text-sm leading-6 opacity-80">{item.description}</p>
              </Link>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
