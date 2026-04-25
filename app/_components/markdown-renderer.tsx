'use client';

import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

import { normalizeMarkdown } from '@/lib/cultural-orientation';

export function MarkdownRenderer({ content, compact = false }: { content: string; compact?: boolean }) {
  const markdown = normalizeMarkdown(content);

  return (
    <article
      className={`prose prose-slate max-w-none text-[var(--regal-navy)] prose-headings:font-black prose-headings:text-[var(--regal-navy)] prose-p:text-[var(--regal-navy)] prose-strong:text-[var(--regal-navy)] prose-a:text-[var(--tomato)] prose-li:marker:text-[var(--sandy-brown)] ${
        compact ? 'prose-sm' : 'prose-base md:prose-lg'
      }`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          h1: ({ children }) => <h1 className="mb-4 mt-0 text-3xl md:text-4xl">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-3 mt-8 border-t-2 border-dashed border-[var(--regal-navy)] pt-5 text-2xl">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-2 mt-6 text-xl">{children}</h3>,
          p: ({ children }) => <p className="my-4 leading-8">{children}</p>,
          ul: ({ children }) => <ul className="my-4 space-y-2 pl-6">{children}</ul>,
          ol: ({ children }) => <ol className="my-4 space-y-2 pl-6">{children}</ol>,
          li: ({ children }) => <li className="pl-1 leading-8">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-6 rounded-[1.25rem] border-l-4 border-[var(--royal-gold)] bg-[var(--lemon-chiffon)] px-5 py-4 not-italic">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const isBlock = Boolean(className);
            if (isBlock) {
              return (
                <code className="block overflow-x-auto rounded-[1rem] bg-[var(--regal-navy)]/95 px-4 py-3 font-mono text-sm text-[var(--lemon-chiffon)]">
                  {children}
                </code>
              );
            }
            return <code className="rounded-md bg-[var(--regal-navy)]/8 px-1.5 py-1 font-mono text-sm">{children}</code>;
          },
          pre: ({ children }) => <pre className="my-5 overflow-x-auto rounded-[1.25rem] bg-[var(--regal-navy)] p-1">{children}</pre>,
          hr: () => <hr className="my-8 border-[var(--regal-navy)]/20" />,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
