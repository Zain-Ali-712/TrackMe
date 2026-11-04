import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Bold, Italic, Highlighter, List, ListChecks, Eye, PenLine } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { MiniMarkdown, applyFormat, type FormatKind } from '@/lib/miniMarkdown';
import { cn } from '@/lib/utils';

const TOOLS: { kind: FormatKind; label: string; icon: React.ElementType }[] = [
  { kind: 'bold', label: 'Bold', icon: Bold },
  { kind: 'italic', label: 'Italic', icon: Italic },
  { kind: 'highlight', label: 'Highlight', icon: Highlighter },
  { kind: 'bullet', label: 'Bullet list', icon: List },
  { kind: 'check', label: 'Checklist', icon: ListChecks },
];

interface Props {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  autoFocus?: boolean;
  ariaLabel: string;
  /** "below": live preview under the box. "toggle": a Write / Preview switch in the toolbar. */
  preview?: 'below' | 'toggle' | 'none';
  className?: string;
  textareaClassName?: string;
}

/** Textarea with the formatting toolbar shared by plans, goals, achievements and journals. */
const RichTextEditor = forwardRef<HTMLTextAreaElement | null, Props>(function RichTextEditor(
  { value, onChange, onBlur, placeholder, rows = 5, maxLength, autoFocus, ariaLabel, preview = 'below', className, textareaClassName },
  ref
) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [previewing, setPreviewing] = useState(false);
  useImperativeHandle(ref, () => areaRef.current as HTMLTextAreaElement);

  const format = (kind: FormatKind) => {
    const el = areaRef.current;
    if (!el) return;
    const result = applyFormat(value, el.selectionStart, el.selectionEnd, kind);
    onChange(result.value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.start, result.end);
    });
  };

  const showingPreview = preview === 'toggle' && previewing;

  return (
    <div className={className}>
      <div className="rounded-lg border border-input overflow-hidden bg-white dark:bg-slate-900 focus-within:border-clay-500/70 focus-within:ring-[3px] focus-within:ring-clay-500/15">
        <div className="flex items-center gap-0.5 border-b border-slate-200/70 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 px-1.5 py-1">
          {TOOLS.map(({ kind, label, icon: Icon }) => (
            <button
              key={kind}
              type="button"
              title={label}
              aria-label={label}
              disabled={showingPreview}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => format(kind)}
              className="grid h-7 w-7 place-items-center rounded-md text-slate-500 hover:bg-white hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-50 disabled:opacity-40 disabled:pointer-events-none"
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
          {preview === 'toggle' && (
            <button
              type="button"
              onClick={() => setPreviewing((p) => !p)}
              aria-pressed={previewing}
              className="ml-auto flex h-7 items-center gap-1 rounded-md px-2 text-[11.5px] font-medium text-slate-500 hover:bg-white hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-50"
            >
              {previewing ? <PenLine className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {previewing ? 'Write' : 'Preview'}
            </button>
          )}
        </div>
        {showingPreview ? (
          <div className="min-h-[120px] px-3 py-2.5">
            {value.trim() ? <MiniMarkdown content={value} /> : <p className="text-[13px] text-slate-400">Nothing written yet.</p>}
          </div>
        ) : (
          <Textarea
            ref={areaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            rows={rows}
            maxLength={maxLength}
            autoFocus={autoFocus}
            aria-label={ariaLabel}
            className={cn('border-0 rounded-none focus-visible:ring-0 text-[13px] resize-y', textareaClassName)}
          />
        )}
      </div>

      {preview === 'below' && value.trim() && (
        <div className="mt-3 rounded-lg bg-slate-50 dark:bg-slate-850 p-3">
          <p className="mb-1.5 text-[10.5px] font-medium text-slate-400">Preview</p>
          <MiniMarkdown content={value} />
        </div>
      )}
    </div>
  );
});

export default RichTextEditor;
