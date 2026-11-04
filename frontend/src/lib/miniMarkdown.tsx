import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A tiny formatter for goal cards. Supports exactly what the editor toolbar
 * writes:  **bold**, *italic*, ==highlight==, "- " bullets and "- [ ] " / "- [x] " checklist
 * items. Text is rendered as React nodes, never raw HTML.
 */

const CHECK_RE = /^(\s*)- \[( |x|X)\] (.*)$/;
const BULLET_RE = /^(\s*)[-*] (.*)$/;

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|==([^=]+)==|\*([^*]+)\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = re.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    if (match[2] !== undefined) nodes.push(<strong key={`${keyPrefix}-b${i++}`} className="font-semibold text-slate-900 dark:text-slate-50">{match[2]}</strong>);
    else if (match[3] !== undefined)
      nodes.push(
        <mark key={`${keyPrefix}-h${i++}`} className="rounded-[3px] bg-amber-200/80 px-0.5 text-slate-900 dark:bg-amber-400/30 dark:text-amber-50">
          {match[3]}
        </mark>
      );
    else nodes.push(<em key={`${keyPrefix}-i${i++}`}>{match[4]}</em>);
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function MiniMarkdown({
  content,
  onToggleChecklist,
  className,
}: {
  content: string;
  /** Called with the line index of a checklist item that was clicked. */
  onToggleChecklist?: (lineIndex: number) => void;
  className?: string;
}) {
  const lines = (content || '').split('\n');
  const blocks: React.ReactNode[] = [];
  let list: { type: 'ul' | 'check'; items: React.ReactNode[] } | null = null;

  const flush = (key: string) => {
    if (!list) return;
    blocks.push(
      list.type === 'ul' ? (
        <ul key={key} className="list-disc pl-5 space-y-0.5 marker:text-slate-400">{list.items}</ul>
      ) : (
        <ul key={key} className="space-y-1">{list.items}</ul>
      )
    );
    list = null;
  };

  lines.forEach((line, index) => {
    const check = CHECK_RE.exec(line);
    const bullet = !check && BULLET_RE.exec(line);
    if (check) {
      if (list?.type !== 'check') flush(`f${index}`);
      list ??= { type: 'check', items: [] };
      const done = check[2].toLowerCase() === 'x';
      list.items.push(
        <li key={index} className="flex items-start gap-2">
          <button
            type="button"
            disabled={!onToggleChecklist}
            onClick={() => onToggleChecklist?.(index)}
            aria-label={done ? 'Mark as not done' : 'Mark as done'}
            className={cn(
              'mt-[3px] grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border transition-colors',
              done ? 'border-transparent bg-[#116329] text-white dark:bg-[#56d364] dark:text-slate-950' : 'border-slate-300 dark:border-slate-600 hover:border-slate-500',
              !onToggleChecklist && 'cursor-default'
            )}
          >
            {done && <Check className="h-3 w-3" strokeWidth={3} />}
          </button>
          <span className={cn(done && 'text-slate-400 line-through decoration-slate-300 dark:text-slate-500')}>
            {renderInline(check[3], `c${index}`)}
          </span>
        </li>
      );
    } else if (bullet) {
      if (list?.type !== 'ul') flush(`f${index}`);
      list ??= { type: 'ul', items: [] };
      list.items.push(<li key={index}>{renderInline(bullet[2], `u${index}`)}</li>);
    } else {
      flush(`f${index}`);
      if (line.trim()) blocks.push(<p key={index}>{renderInline(line, `p${index}`)}</p>);
      else if (index > 0 && index < lines.length - 1) blocks.push(<div key={index} className="h-1.5" />);
    }
  });
  flush('end');

  return <div className={cn('space-y-1.5 text-[13px] leading-relaxed text-slate-700 dark:text-slate-200', className)}>{blocks}</div>;
}

/** Flip the checklist item on a given line. */
export function toggleChecklistLine(content: string, lineIndex: number): string {
  const lines = content.split('\n');
  const m = CHECK_RE.exec(lines[lineIndex] || '');
  if (!m) return content;
  lines[lineIndex] = `${m[1]}- [${m[2].toLowerCase() === 'x' ? ' ' : 'x'}] ${m[3]}`;
  return lines.join('\n');
}

/** Checklist progress, e.g. { done: 2, total: 5 }. */
export function checklistProgress(content: string) {
  let done = 0;
  let total = 0;
  for (const line of (content || '').split('\n')) {
    const m = CHECK_RE.exec(line);
    if (!m) continue;
    total += 1;
    if (m[2].toLowerCase() === 'x') done += 1;
  }
  return { done, total };
}

export type FormatKind = 'bold' | 'italic' | 'highlight' | 'bullet' | 'check';

/**
 * Toolbar actions for a textarea: wrap the selection (bold / italic) or prefix
 * the selected lines (bullet / checklist). Returns the new text and selection.
 */
export function applyFormat(
  value: string,
  start: number,
  end: number,
  kind: FormatKind
): { value: string; start: number; end: number } {
  if (kind === 'bold' || kind === 'italic' || kind === 'highlight') {
    const mark = kind === 'bold' ? '**' : kind === 'highlight' ? '==' : '*';
    const selected = value.slice(start, end) || `${kind} text`;
    const next = value.slice(0, start) + mark + selected + mark + value.slice(end);
    return { value: next, start: start + mark.length, end: start + mark.length + selected.length };
  }
  const prefix = kind === 'bullet' ? '- ' : '- [ ] ';
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const lineEndIdx = value.indexOf('\n', end);
  const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
  const block = value.slice(lineStart, lineEnd);
  const prefixed = block
    .split('\n')
    .map((l) => (l.startsWith(prefix) ? l : prefix + l.replace(/^- (\[[ xX]\] )?/, '')))
    .join('\n');
  const next = value.slice(0, lineStart) + prefixed + value.slice(lineEnd);
  return { value: next, start: lineStart, end: lineStart + prefixed.length };
}
