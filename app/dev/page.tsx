import Link from 'next/link';

const cards = [
  {
    href: '/onboarding',
    title: 'Onboarding flow',
    description: 'Walk through the real multi-step profile creation experience used when no local uid exists.',
  },
  {
    href: '/dev/module-gen',
    title: 'Module generation',
    description: 'Create persisted generation jobs, stream markdown, and inspect recent stored jobs.',
  },
  {
    href: '/dev/chat-suggestions',
    title: 'Chat suggestions',
    description: 'Ask a situation-based question and get 3 alternative module directions with a simple loader.',
  },
  {
    href: '/dev/profile-lab',
    title: 'Profile + favorites',
    description: 'Load a profile by user id, patch onboarding fields, and add or remove favorite generation jobs.',
  },
];

export default function DevIndexPage() {
  return (
    <main className="min-h-screen bg-[var(--lemon-chiffon)] px-4 py-8 text-[var(--regal-navy)] md:px-6 md:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--sandy-brown)]">Dev playground</p>
          <h1 className="mt-2 text-3xl font-black md:text-4xl">API testing routes</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 md:text-lg md:leading-8">Use these internal pages to test generation, chatbot suggestion prompts, and profile favorites against the current API contracts.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-[1.75rem] border-4 border-[var(--regal-navy)] bg-white p-5 shadow-[8px_8px_0_var(--royal-gold)] transition hover:-translate-y-1 md:rounded-[2rem] md:p-6 md:shadow-[10px_10px_0_var(--royal-gold)]"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--sandy-brown)]">{card.href}</p>
              <h2 className="mt-3 text-xl font-black md:text-2xl">{card.title}</h2>
              <p className="mt-3 leading-7">{card.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
