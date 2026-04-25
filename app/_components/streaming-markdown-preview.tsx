'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { normalizeMarkdown } from '@/lib/cultural-orientation';

type StreamingMarkdownPreviewProps = {
  content: string;
  complete?: boolean;
  compact?: boolean;
};

const FRAME_INTERVAL_MS = 120;

function splitBlocks(markdown: string) {
  return markdown
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function tone(block: string) {
  if (block.startsWith('# ')) return 'heading-1';
  if (block.startsWith('## ')) return 'heading-2';
  if (block.startsWith('### ')) return 'heading-3';
  if (block.startsWith('- ') || block.startsWith('* ') || /^\d+\.\s/.test(block)) return 'list';
  if (block.startsWith('>')) return 'quote';
  return 'paragraph';
}

function blockClasses(kind: ReturnType<typeof tone>, compact: boolean) {
  if (kind === 'heading-1') return compact ? 'text-2xl font-black leading-tight' : 'text-3xl font-black leading-tight md:text-4xl';
  if (kind === 'heading-2') return compact ? 'border-t-2 border-dashed border-[var(--regal-navy)] pt-4 text-xl font-black' : 'border-t-2 border-dashed border-[var(--regal-navy)] pt-5 text-2xl font-black';
  if (kind === 'heading-3') return compact ? 'text-lg font-black' : 'text-xl font-black';
  if (kind === 'quote') return 'rounded-[1.25rem] border-l-4 border-[var(--royal-gold)] bg-white/70 px-4 py-3';
  return compact ? 'text-sm leading-6 md:text-base' : 'text-base leading-7 md:text-lg md:leading-8';
}

function renderBlock(block: string) {
  return block
    .replace(/^###\s+/gm, '')
    .replace(/^##\s+/gm, '')
    .replace(/^#\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*]\s+/gm, '• ');
}

export function StreamingMarkdownPreview({ content, complete = false, compact = false }: StreamingMarkdownPreviewProps) {
  const latestContentRef = useRef(normalizeMarkdown(content));
  const [displayText, setDisplayText] = useState(() => normalizeMarkdown(content));
  const [revealedCount, setRevealedCount] = useState(0);
  const [animatedKeys, setAnimatedKeys] = useState<string[]>([]);

  useEffect(() => {
    latestContentRef.current = normalizeMarkdown(content);
  }, [content]);

  useEffect(() => {
    if (complete) {
      setDisplayText(latestContentRef.current);
      return;
    }

    const interval = window.setInterval(() => {
      setDisplayText((current) => (current === latestContentRef.current ? current : latestContentRef.current));
    }, FRAME_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [complete]);

  const blocks = useMemo(() => splitBlocks(displayText), [displayText]);
  const committedBlocks = complete ? blocks : blocks.slice(0, -1);
  const tailBlock = complete ? '' : blocks.at(-1) ?? '';

  useEffect(() => {
    if (committedBlocks.length <= revealedCount) return;
    const newKeys = committedBlocks.slice(revealedCount).map((block, index) => `${revealedCount + index}:${block.slice(0, 24)}`);
    setAnimatedKeys((current) => [...current, ...newKeys]);
    setRevealedCount(committedBlocks.length);
  }, [committedBlocks, revealedCount]);

  useEffect(() => {
    if (animatedKeys.length === 0) return;
    const timeout = window.setTimeout(() => setAnimatedKeys([]), 260);
    return () => window.clearTimeout(timeout);
  }, [animatedKeys]);

  if (!displayText.trim()) {
    return <p className="text-sm leading-7 opacity-80 md:text-base">Your generated text will appear here.</p>;
  }

  return (
    <article className={`max-w-none text-[var(--regal-navy)] ${compact ? 'space-y-3' : 'space-y-4 md:space-y-5'}`}>
      {committedBlocks.map((block, index) => {
        const key = `${index}:${block.slice(0, 24)}`;
        const animateIn = animatedKeys.includes(key);
        const kind = tone(block);
        return (
          <div
            key={key}
            className={`${blockClasses(kind, compact)} whitespace-pre-wrap transition duration-200 ease-out ${animateIn ? 'translate-y-1 opacity-0' : 'translate-y-0 opacity-100'}`}
          >
            {renderBlock(block)}
          </div>
        );
      })}

      {tailBlock ? (
        <div
          className={`${blockClasses(tone(tailBlock), compact)} whitespace-pre-wrap opacity-88 transition-opacity duration-150`}
          aria-live="polite"
        >
          {renderBlock(tailBlock)}
          {!complete ? <span className="ml-1 inline-block h-[1em] w-0.5 animate-pulse rounded-full bg-[var(--sandy-brown)] align-[-0.15em]" /> : null}
        </div>
      ) : null}
    </article>
  );
}
