'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { EXPERIMENTAL_UNLOCK_KEY } from '@/lib/module-workspace';

export function ExperimentalGate({ children }: { children: React.ReactNode }) {
  const [allowed, setAllowed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setAllowed(window.localStorage.getItem(EXPERIMENTAL_UNLOCK_KEY) === 'true');
      setReady(true);
    });
  }, []);

  if (!ready) {
    return null;
  }

  if (!allowed) {
    return (
      <main className="min-h-screen bg-[var(--lemon-chiffon)] px-4 py-8 text-[var(--regal-navy)]">
        <div className="mx-auto max-w-3xl rounded-[1.75rem] border-4 border-[var(--regal-navy)] bg-white p-6 shadow-[8px_8px_0_var(--royal-gold)]">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--sandy-brown)]">Locked</p>
          <h1 className="mt-3 text-3xl font-black">Experimental routes are protected</h1>
          <p className="mt-3 text-base leading-7 opacity-80">
            Open the experimental area first and unlock it with the dev password.
          </p>
          <Link href="/experimental" className="mt-5 inline-flex rounded-full border-2 border-[var(--regal-navy)] bg-[var(--royal-gold)] px-5 py-3 font-bold">
            Go to experimental unlock
          </Link>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
