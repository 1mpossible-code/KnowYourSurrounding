'use client';

import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

import { normalizeMarkdown } from '@/lib/cultural-orientation';

export function MarkdownRenderer({ content, compact = false }: { content: string; compact?: boolean }) {
  const markdown = normalizeMarkdown(content);

  return (
    <article
      className={`prose max-w-none text-[var(--foreground)] prose-headings:text-[var(--regal-navy)] prose-p:text-[var(--foreground)] prose-strong:text-[var(--regal-navy)] prose-a:text-[var(--tomato)] prose-a:underline-offset-2 prose-li:marker:text-[var(--sandy-brown)] prose-hr:border-[var(--border-faint)] ${
        compact ? 'prose-sm' : 'prose-base md:prose-lg'
      }`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-4 mt-0 font-serif text-3xl font-medium leading-snug text-[var(--regal-navy)] md:text-4xl">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-3 mt-8 font-serif text-2xl font-medium leading-snug text-[var(--regal-navy)] [&:not(:first-child)]:border-t [&:not(:first-child)]:border-[var(--border-faint)] [&:not(:first-child)]:pt-6">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-6 font-serif text-xl font-medium leading-snug text-[var(--regal-navy)]">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="my-4 leading-8">{children}</p>,
          ul: ({ children }) => <ul className="my-4 space-y-2 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-4 space-y-2 pl-5">{children}</ol>,
          li: ({ children }) => <li className="pl-1 leading-7">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-6 rounded-2xl border-l-[3px] border-[var(--royal-gold)] bg-[var(--lemon-chiffon)] px-5 py-4 not-italic text-[var(--regal-navy)]">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const isBlock = Boolean(className);
            if (isBlock) {
              return (
                <code className="block overflow-x-auto rounded-xl bg-[var(--regal-navy)]/92 px-4 py-3 font-mono text-sm leading-6 text-[var(--lemon-chiffon)]">
                  {children}
                </code>
              );
            }
            return (
              <code className="rounded-md bg-[var(--regal-navy)]/7 px-1.5 py-0.5 font-mono text-[0.875em]">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="my-5 overflow-x-auto rounded-2xl bg-[var(--regal-navy)] p-1">{children}</pre>
          ),
          hr: () => <hr className="my-8 border-[var(--border-faint)]" />,
          table: ({ children }) => (
            <div className="my-5 overflow-x-auto rounded-xl border border-[var(--border-faint)]">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-[var(--border-faint)] bg-[var(--lemon-chiffon)] px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--sandy-brown)]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-[var(--border-faint)] px-4 py-2.5 leading-6 last:border-b-0">
              {children}
            </td>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
