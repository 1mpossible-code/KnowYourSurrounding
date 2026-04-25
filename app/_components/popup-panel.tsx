'use client';

import { ReactNode } from 'react';

export function PopupPanel({
  open,
  onClose,
  eyebrow,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[rgba(13,59,102,0.22)] p-3 md:items-center md:justify-center md:p-6">
      <button type="button" aria-label="Close panel" className="absolute inset-0" onClick={onClose} />
      <section className="relative max-h-[88vh] w-full overflow-hidden rounded-[1.9rem] border-4 border-[var(--regal-navy)] bg-white shadow-[12px_12px_0_var(--royal-gold)] md:max-w-2xl">
        <div className="flex items-start justify-between gap-4 border-b-2 border-dashed border-[var(--regal-navy)] px-4 py-4 md:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--sandy-brown)] md:text-sm">{eyebrow}</p>
            <h2 className="mt-2 text-2xl font-black leading-tight md:text-3xl">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] px-3 py-2 text-sm font-bold"
          >
            Close
          </button>
        </div>
        <div className="max-h-[calc(88vh-6.5rem)] overflow-y-auto px-4 py-4 md:px-6 md:py-5">{children}</div>
      </section>
    </div>
  );
}
