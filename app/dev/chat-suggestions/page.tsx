'use client';

import { FormEvent, useState } from 'react';

type Suggestion = {
  id: string;
  title: string;
  topic: string;
  summary: string;
  seedText: string;
};

const demoPayload = {
  question: 'I had a weird interaction with my manager in Germany and I think I sounded rude without meaning to.',
  contextText:
    'I was trying to be efficient, but my manager looked offended after I answered very directly during a meeting.',
  feedback: '',
  previousSuggestions: [],
  profile: {
    originCountry: 'Ukraine',
    destinationCountry: 'Germany',
    languageLevel: 'intermediate',
    preferredLearningStyle: 'real_life_examples',
    priorityTopics: ['communication', 'work'],
  },
};

export default function ChatSuggestionsDevPage() {
  const [payload, setPayload] = useState(JSON.stringify(demoPayload, null, 2));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuggestions([]);

    try {
      const response = await fetch('/api/chat/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate suggestions.');
      setSuggestions(data.suggestions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--lemon-chiffon)] px-4 py-6 text-[var(--regal-navy)] md:px-6">
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2rem] border-4 border-[var(--regal-navy)] bg-white p-5 shadow-[10px_10px_0_var(--royal-gold)]">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--sandy-brown)]">Dev route</p>
          <h1 className="mt-2 text-4xl font-black">Chat suggestion prompt tester</h1>
          <p className="mt-2 max-w-2xl leading-7">This route simulates the chatbot popup flow. It sends one synchronous request and shows a loader until 3 topic/module suggestions return.</p>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <textarea
              value={payload}
              onChange={(event) => setPayload(event.target.value)}
              className="min-h-[320px] w-full rounded-[1.5rem] border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-4 font-mono text-sm leading-6 outline-none focus:border-[var(--sandy-brown)]"
              spellCheck={false}
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-full border-2 border-[var(--regal-navy)] bg-[var(--royal-gold)] px-5 py-3 font-bold transition hover:-translate-y-0.5 hover:bg-[var(--sandy-brown)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Thinking…' : 'Get 3 suggestions'}
            </button>
            {error ? <p className="rounded-2xl border-2 border-[var(--tomato)] bg-white px-4 py-3 text-[var(--tomato)]">{error}</p> : null}
          </form>
        </section>

        <section className="rounded-[2rem] border-4 border-[var(--regal-navy)] bg-white p-5 shadow-[10px_10px_0_var(--sandy-brown)]">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--sandy-brown)]">Suggestions</p>
          <h2 className="mt-2 text-3xl font-black">3 candidate directions</h2>
          <div className="mt-5 space-y-4">
            {suggestions.length === 0 ? (
              <div className="rounded-[1.5rem] border-2 border-dashed border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-4">
                {loading ? 'Generating suggestions…' : 'Suggestions will appear here.'}
              </div>
            ) : (
              suggestions.map((suggestion) => (
                <article key={suggestion.id} className="rounded-[1.5rem] border-2 border-[var(--regal-navy)] bg-[var(--lemon-chiffon)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--sandy-brown)]">{suggestion.topic}</div>
                      <h3 className="mt-1 text-xl font-black">{suggestion.title}</h3>
                    </div>
                  </div>
                  <p className="mt-3 leading-7">{suggestion.summary}</p>
                  <div className="mt-4 rounded-2xl border-2 border-dashed border-[var(--regal-navy)] bg-white p-4 text-sm leading-7">
                    {suggestion.seedText}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
