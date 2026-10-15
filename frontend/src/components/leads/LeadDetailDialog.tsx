import React, { useEffect, useRef, useState } from 'react';
import {
  Phone, Mail, Globe, MapPin, Clock, CircleAlert, Lightbulb, MessagesSquare,
  Copy, Check, ExternalLink, Store, StickyNote, Pencil, CalendarPlus, Loader2, CircleCheck, TriangleAlert, User,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { parseNoteEntries, getNotesCount } from '@/components/common/MultiNotesDialog';
import { STATUS_COLORS, cn, getNicheIcon } from '@/lib/utils';
import toast from 'react-hot-toast';

export type PrepField = 'bestCallTime' | 'nearbyExamples' | 'problem' | 'solution' | 'coldCallQuestions';
const PREP_FIELDS: PrepField[] = ['bestCallTime', 'nearbyExamples', 'problem', 'solution', 'coldCallQuestions'];

type Draft = Record<PrepField, string>;
type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

const draftFromLead = (lead: any): Draft => ({
  bestCallTime: lead?.bestCallTime || '',
  nearbyExamples: lead?.nearbyExamples || '',
  problem: lead?.problem || '',
  solution: lead?.solution || '',
  coldCallQuestions: lead?.coldCallQuestions || '',
});

const changedFields = (draft: Draft, baseline: Draft): Partial<Draft> => {
  const changes: Partial<Draft> = {};
  for (const field of PREP_FIELDS) {
    if (draft[field].trim() !== baseline[field].trim()) changes[field] = draft[field].trim();
  }
  return changes;
};

const websiteHref = (site: string) => (/^https?:\/\//i.test(site) ? site : `https://${site}`);

interface LeadDetailDialogProps {
  lead: any | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, changes: Partial<Draft>) => Promise<void>;
  onOpenNotes: (lead: any) => void;
  onEdit: (lead: any) => void;
  onBookAppointment: (lead: any) => void;
}

export default function LeadDetailDialog({
  lead,
  open,
  onClose,
  onSave,
  onOpenNotes,
  onEdit,
  onBookAppointment,
}: LeadDetailDialogProps) {
  const [draft, setDraft] = useState<Draft>(() => draftFromLead(lead));
  const [saveState, setSaveState] = useState<SaveState>('idle');
  // Latest draft for commits fired from blur/close handlers.
  const draftRef = useRef(draft);
  draftRef.current = draft;
  // What the server has (or is about to have). Advanced optimistically when a
  // save starts, so a blur and a close firing together don't save twice.
  const baselineRef = useRef<Draft>(draftFromLead(lead));

  // Reset only when a different lead opens, so a background refresh of the
  // same lead never wipes what is being typed.
  useEffect(() => {
    if (open && lead) {
      setDraft(draftFromLead(lead));
      baselineRef.current = draftFromLead(lead);
      setSaveState('idle');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lead?._id]);

  if (!lead) return null;

  const commit = async () => {
    const changes = changedFields(draftRef.current, baselineRef.current);
    if (Object.keys(changes).length === 0) {
      setSaveState((s) => (s === 'dirty' ? 'saved' : s));
      return;
    }
    const previous = baselineRef.current;
    baselineRef.current = { ...previous, ...changes };
    setSaveState('saving');
    try {
      await onSave(lead._id, changes);
      setSaveState('saved');
    } catch {
      baselineRef.current = previous;
      setSaveState('error');
      toast.error('Could not save call prep. Your text is still here, try again.');
    }
  };

  const setField = (field: PrepField, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setSaveState('dirty');
  };

  const handleClose = () => {
    void commit();
    onClose();
  };

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}`);
    }
  };

  const firstNote = parseNoteEntries(lead.notes, lead.createdAt)[0];
  const notesCount = getNotesCount(lead.notes);
  const status = STATUS_COLORS[lead.status] || STATUS_COLORS['New Lead'];
  const NicheIcon = getNicheIcon(lead.niche?.icon);

  const contactItems = [
    {
      key: 'phone',
      icon: Phone,
      label: 'Phone',
      value: lead.contact,
      href: lead.contact ? `tel:${lead.contact.replace(/[^\d+]/g, '')}` : undefined,
    },
    {
      key: 'email',
      icon: Mail,
      label: 'Email',
      value: lead.email,
      href: lead.email ? `mailto:${lead.email}` : undefined,
    },
    {
      key: 'website',
      icon: Globe,
      label: 'Website',
      value: lead.website?.replace(/^https?:\/\//i, '').replace(/\/$/, ''),
      href: lead.website ? websiteHref(lead.website) : undefined,
      external: true,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent
        className="sm:max-w-[780px] w-[calc(100vw-1.5rem)] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            void commit();
          }
        }}
      >
        {/* Header */}
        <header className="relative px-6 sm:px-8 pt-7 pb-5 border-b border-slate-200/80 dark:border-slate-800 bg-gradient-to-b from-clay-50/90 via-clay-50/30 to-transparent dark:from-clay-950/40 dark:via-clay-950/10">
          <div className="flex flex-wrap items-center gap-2 pr-8">
            {lead.niche?.name && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                <NicheIcon className="h-3 w-3" style={{ color: lead.niche.color || undefined }} />
                {lead.niche.name}
              </span>
            )}
            <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium', status.bg, status.text, status.border)}>
              <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
              {lead.status}
            </span>
            {lead.coldCalled && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-clay-700 dark:text-clay-300">
                <Check className="h-3 w-3" strokeWidth={2.5} /> Called
              </span>
            )}
          </div>

          <DialogTitle className="mt-3 font-display text-[28px] sm:text-[32px] leading-[1.1] font-medium text-slate-900 dark:text-slate-50 text-balance">
            {lead.businessName}
          </DialogTitle>
          <DialogDescription className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-slate-500 dark:text-slate-400">
            {lead.personName && (
              <span className="inline-flex items-center gap-1.5"><User className="h-3.5 w-3.5" />{lead.personName}</span>
            )}
            {lead.location && (
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{lead.location}</span>
            )}
            {!lead.personName && !lead.location && <span>Added {new Date(lead.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
          </DialogDescription>
        </header>

        <div className="flex-1 overflow-y-auto">
          {/* Contact strip */}
          <dl className="grid grid-cols-1 sm:grid-cols-3 border-b border-slate-200/80 dark:border-slate-800 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-slate-800">
            {contactItems.map((item) => (
              <div key={item.key} className="group/contact flex items-center gap-3 px-6 sm:px-5 first:sm:pl-8 py-3.5 min-w-0">
                <span className="grid place-items-center h-8 w-8 shrink-0 rounded-lg bg-clay-50 text-clay-700 dark:bg-clay-950/50 dark:text-clay-300">
                  <item.icon className="h-[15px] w-[15px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <dt className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{item.label}</dt>
                  <dd className="text-[13px] font-medium text-slate-900 dark:text-slate-100 [overflow-wrap:anywhere] leading-snug">
                    {item.value ? (
                      <a
                        href={item.href}
                        target={item.external ? '_blank' : undefined}
                        rel={item.external ? 'noreferrer' : undefined}
                        className="hover:text-clay-700 dark:hover:text-clay-300 hover:underline"
                      >
                        <span>{item.value}</span>
                        {item.external && <ExternalLink className="inline h-3 w-3 ml-1 -mt-0.5 opacity-60" />}
                      </a>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 font-normal">Not added</span>
                    )}
                  </dd>
                </div>
                {item.value && !item.external && (
                  <button
                    type="button"
                    onClick={() => copy(item.value, item.label)}
                    className="shrink-0 rounded-md p-1.5 text-slate-400 opacity-0 group-hover/contact:opacity-100 focus-visible:opacity-100 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
                    aria-label={`Copy ${item.label.toLowerCase()}`}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </dl>

          <div className="px-6 sm:px-8 py-6 space-y-7">
            {/* Description (the lead's first note) + best call time */}
            <div className="grid gap-6 md:grid-cols-[1fr_240px]">
              <section aria-labelledby="lead-description">
                <h3 id="lead-description" className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  Description
                </h3>
                {firstNote ? (
                  <figure>
                    <blockquote className="font-display text-[17px] leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                      {firstNote.text}
                    </blockquote>
                    <figcaption className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                      From the first note, {new Date(firstNote.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </figcaption>
                  </figure>
                ) : (
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    No description yet. The first note you add to this lead becomes its description.{' '}
                    <button type="button" onClick={() => onOpenNotes(lead)} className="font-medium text-clay-700 dark:text-clay-300 hover:underline">
                      Add a note
                    </button>
                  </p>
                )}
              </section>

              <section aria-labelledby="lead-call-time" className="rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/70 dark:border-slate-800 p-4">
                <label id="lead-call-time" htmlFor="best-call-time" className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-600 dark:text-slate-300">
                  <Clock className="h-3.5 w-3.5 text-clay-600 dark:text-clay-400" />
                  Best call time
                </label>
                <Input
                  id="best-call-time"
                  value={draft.bestCallTime}
                  onChange={(e) => setField('bestCallTime', e.target.value)}
                  onBlur={commit}
                  onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
                  placeholder="e.g. Tue–Thu, 10–11:30 AM"
                  className="mt-2 h-9 text-[13px] font-medium"
                />
                <p className="mt-2 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                  Filled from business hours on import when available.
                </p>
              </section>
            </div>

            {/* Nearby examples to name-drop on the call */}
            <PrepTextarea
              id="prep-nearby"
              icon={Store}
              label="Nearby examples"
              hint={lead.location ? `Businesses near ${lead.location} that already use what you're offering` : "Businesses near this lead that already use what you're offering"}
              placeholder={'Up to 3, one per line, e.g.\nSmile Studio, 2 blocks away: online booking + SMS reminders (smilestudio.com)'}
              value={draft.nearbyExamples}
              onChange={(v) => setField('nearbyExamples', v)}
              onBlur={commit}
            />

            {/* Call prep */}
            <section aria-labelledby="call-prep" className="space-y-4">
              <h3 id="call-prep" className="font-display text-xl font-medium text-slate-900 dark:text-slate-50">
                Call prep
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <PrepTextarea
                  id="prep-problem"
                  icon={CircleAlert}
                  label="What's the problem"
                  placeholder="What's broken or missing for them right now?"
                  value={draft.problem}
                  onChange={(v) => setField('problem', v)}
                  onBlur={commit}
                />
                <PrepTextarea
                  id="prep-solution"
                  icon={Lightbulb}
                  label="What's the solution"
                  placeholder="The service you'll pitch and why it fixes it."
                  value={draft.solution}
                  onChange={(v) => setField('solution', v)}
                  onBlur={commit}
                />
              </div>
              <PrepTextarea
                id="prep-questions"
                icon={MessagesSquare}
                label="Cold call questions"
                placeholder={'One question per line, e.g.\nHow are you getting new customers today?'}
                value={draft.coldCallQuestions}
                onChange={(v) => setField('coldCallQuestions', v)}
                onBlur={commit}
                minRows={4}
              />
            </section>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 px-6 sm:px-8 py-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900">
          <SaveIndicator state={saveState} />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenNotes(lead)} className="text-xs">
              <StickyNote className="h-3.5 w-3.5 mr-1.5" />
              Notes{notesCount > 0 ? ` (${notesCount})` : ''}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onEdit(lead)} className="text-xs">
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Edit details
            </Button>
            <Button variant="outline" size="sm" onClick={() => onBookAppointment(lead)} className="text-xs">
              <CalendarPlus className="h-3.5 w-3.5 mr-1.5" />
              Book call
            </Button>
            <Button size="sm" onClick={handleClose} className="text-xs px-4">
              Done
            </Button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

function PrepTextarea({
  id,
  icon: Icon,
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  minRows = 3,
  hint,
}: {
  id: string;
  icon: React.ElementType;
  label: string;
  hint?: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  minRows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-600 dark:text-slate-300">
        <Icon className="h-3.5 w-3.5 text-clay-600 dark:text-clay-400" />
        {label}
        {hint && <span className="font-normal text-slate-400 dark:text-slate-500 truncate">· {hint}</span>}
      </label>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={minRows}
        className="text-[13px] resize-none [field-sizing:content] max-h-72 bg-slate-50/60 dark:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-600 focus-visible:bg-white dark:focus-visible:bg-slate-900"
        style={{ minHeight: `${minRows * 1.6 + 1.25}rem` }}
      />
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const content: Record<SaveState, { icon: React.ElementType; text: string; className: string; spin?: boolean }> = {
    idle: { icon: CircleCheck, text: 'Changes save automatically', className: 'text-slate-400 dark:text-slate-500' },
    dirty: { icon: Pencil, text: 'Editing, saves when you leave the field', className: 'text-slate-500 dark:text-slate-400' },
    saving: { icon: Loader2, text: 'Saving', className: 'text-slate-500 dark:text-slate-400', spin: true },
    saved: { icon: CircleCheck, text: 'All changes saved', className: 'text-emerald-700 dark:text-emerald-400' },
    error: { icon: TriangleAlert, text: 'Not saved, click a field and try again', className: 'text-rose-600 dark:text-rose-400' },
  };
  const { icon: Icon, text, className, spin } = content[state];
  return (
    <p className={cn('flex items-center gap-1.5 text-[11px] font-medium', className)} aria-live="polite">
      <Icon className={cn('h-3.5 w-3.5', spin && 'animate-spin')} />
      {text}
    </p>
  );
}
