'use client';

import { ReactNode, useEffect } from 'react';

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
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[var(--regal-navy)]/25 p-3 backdrop-blur-sm animate-fade-in md:items-center md:justify-center md:p-6">
      <button type="button" aria-label="Close panel" className="absolute inset-0 cursor-default" onClick={onClose} />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="popup-title"
        className="relative max-h-[90vh] w-full overflow-hidden rounded-[1.75rem] border-2 border-[var(--regal-navy)] bg-[var(--surface-card)] shadow-[8px_8px_0_var(--royal-gold)] animate-slide-up md:max-w-xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-faint)] px-5 py-5 md:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--sandy-brown)]">{eyebrow}</p>
            <h2 id="popup-title" className="mt-2 font-serif text-2xl font-medium leading-snug text-[var(--regal-navy)] md:text-[1.7rem]">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--lemon-chiffon)] text-sm text-[var(--regal-navy)] transition-all hover:bg-[var(--royal-gold)] hover:border-[var(--regal-navy)] focus-visible:outline-2 focus-visible:outline-[var(--sandy-brown)]"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[calc(90vh-7.5rem)] overflow-y-auto px-5 py-5 md:px-6">
          {children}
        </div>
      </section>
    </div>
  );
}
