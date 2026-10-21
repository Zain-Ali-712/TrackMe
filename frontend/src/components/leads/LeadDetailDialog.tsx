import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  Phone, Mail, Globe, MapPin, Clock, CircleAlert, Lightbulb, MessagesSquare,
  Copy, Check, X, ExternalLink, Store, StickyNote, Pencil, CalendarPlus, Loader2, CircleCheck, User, PhoneCall,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { parseNoteEntries, serializeNoteEntries, getNotesCount, type NoteEntry } from '@/components/common/MultiNotesDialog';
import { STATUS_COLORS, cn, getNicheIcon } from '@/lib/utils';
import toast from 'react-hot-toast';

const STATUSES = ['New Lead', 'No Answer', 'Not Interested', 'Callback', 'Follow Up', 'Appointment', 'Closed', 'DNC'];

const websiteHref = (site: string) => (/^https?:\/\//i.test(site) ? site : `https://${site}`);
const shortDate = (iso: string) => new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

/**
 * Lets the dialog know when a field is mid-edit, so Escape cancels the edit
 * instead of closing the whole dialog.
 */
const EditingContext = createContext<(editing: boolean) => void>(() => {});

interface LeadDetailDialogProps {
  lead: any | null;
  open: boolean;
  onClose: () => void;
  /** Persist changes to the lead; rejects on failure. */
  onSave: (id: string, changes: Record<string, any>) => Promise<void>;
  onOpenNotes: (lead: any) => void;
  onBookAppointment: (lead: any) => void;
}

export default function LeadDetailDialog({
  lead,
  open,
  onClose,
  onSave,
  onOpenNotes,
  onBookAppointment,
}: LeadDetailDialogProps) {
  const editingCount = useRef(0);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (open) setSavedAt(null);
  }, [open, lead?._id]);

  if (!lead) return null;

  const save = async (changes: Record<string, any>) => {
    try {
      await onSave(lead._id, changes);
      setSavedAt(Date.now());
    } catch (err) {
      toast.error('Could not save that change. Check your connection and try again.');
      throw err;
    }
  };

  const setEditing = (editing: boolean) => {
    editingCount.current = Math.max(0, editingCount.current + (editing ? 1 : -1));
  };

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}`);
    }
  };

  // Notes: the first entry doubles as the description; the newest is shown under it.
  const notes = parseNoteEntries(lead.notes, lead.createdAt);
  const firstNote = notes[0];
  const latestNote = notes.length > 1 ? notes[notes.length - 1] : null;
  const notesCount = getNotesCount(lead.notes);

  const saveNote = (index: number | 'new', text: string) => {
    const next: NoteEntry[] = notes.map((n) => ({ ...n }));
    if (index === 'new') {
      if (!text) return Promise.resolve();
      next.unshift({ id: `note-${Date.now()}`, text, createdAt: new Date().toISOString() });
    } else if (!text) {
      next.splice(index, 1);
    } else {
      next[index] = { ...next[index], text };
    }
    return save({ notes: serializeNoteEntries(next) });
  };

  const status = STATUS_COLORS[lead.status] || STATUS_COLORS['New Lead'];
  const NicheIcon = getNicheIcon(lead.niche?.icon);

  const changeStatus = (value: string) => {
    if (value === lead.status) return;
    if (value === 'Appointment') {
      onBookAppointment(lead);
      return;
    }
    const changes: Record<string, any> = { status: value };
    if (value !== 'New Lead' && !lead.coldCalled) changes.coldCalled = true;
    save(changes).catch(() => {});
  };

  const contactItems = [
    {
      key: 'contact',
      icon: Phone,
      label: 'Phone',
      href: (v: string) => `tel:${v.replace(/[^\d+]/g, '')}`,
      copyable: true,
    },
    {
      key: 'email',
      icon: Mail,
      label: 'Email',
      href: (v: string) => `mailto:${v}`,
      copyable: true,
    },
    {
      key: 'website',
      icon: Globe,
      label: 'Website',
      href: websiteHref,
      external: true,
      format: (v: string) => v.replace(/^https?:\/\//i, '').replace(/\/$/, ''),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className="sm:max-w-[760px] w-[calc(100vw-1.5rem)] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col"
        onEscapeKeyDown={(e) => {
          if (editingCount.current > 0) e.preventDefault();
        }}
      >
        <EditingContext.Provider value={setEditing}>
          {/* Header */}
          <header className="relative px-5 sm:px-7 pt-6 pb-4 border-b border-slate-200/80 dark:border-slate-800 bg-gradient-to-b from-clay-50/90 via-clay-50/30 to-transparent dark:from-clay-950/40 dark:via-clay-950/10">
            <div className="flex flex-wrap items-center gap-2 pr-8">
              {lead.niche?.name && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-2.5 h-6 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  <NicheIcon className="h-3 w-3" style={{ color: lead.niche.color || undefined }} />
                  {lead.niche.name}
                </span>
              )}

              <Select value={lead.status} onValueChange={changeStatus}>
                <SelectTrigger
                  aria-label="Change status"
                  className={cn('h-6 w-auto gap-1.5 rounded-full border px-2.5 py-0 text-[11px] font-medium shadow-none [&>svg]:h-3 [&>svg]:w-3 [&>svg]:opacity-60', status.bg, status.text, status.border)}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
                  {lead.status}
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {s === 'Appointment' ? 'Appointment (schedule)' : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <button
                type="button"
                role="switch"
                aria-checked={!!lead.coldCalled}
                onClick={() => save({ coldCalled: !lead.coldCalled }).catch(() => {})}
                className={cn(
                  'inline-flex items-center gap-1 h-6 pl-2 pr-2.5 rounded-full text-[11px] font-medium border transition-colors',
                  lead.coldCalled
                    ? 'bg-clay-600 text-white border-clay-600 hover:bg-clay-700 dark:bg-clay-500 dark:border-clay-500 dark:text-slate-950'
                    : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-clay-300 hover:text-clay-700 dark:hover:text-clay-300'
                )}
                title={lead.coldCalled ? 'Cold call logged (click to undo)' : 'Mark as cold called'}
              >
                {lead.coldCalled ? <Check className="h-3 w-3" strokeWidth={2.75} /> : <PhoneCall className="h-3 w-3" />}
                {lead.coldCalled ? 'Called' : 'Mark called'}
              </button>
            </div>

            <DialogTitle asChild>
              <div className="mt-3">
                <EditableField
                  label="Business name"
                  value={lead.businessName || ''}
                  required
                  onSave={(v) => save({ businessName: v })}
                  inputClassName="h-11 font-display text-2xl"
                  renderValue={(v) => (
                    <span className="font-display text-[26px] sm:text-[30px] leading-[1.15] font-medium text-slate-900 dark:text-slate-50">{v}</span>
                  )}
                />
              </div>
            </DialogTitle>
            <DialogDescription asChild>
              <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[13px] text-slate-500 dark:text-slate-400">
                <EditableField
                  label="Contact person"
                  icon={User}
                  value={lead.personName || ''}
                  placeholder="Add contact person"
                  onSave={(v) => save({ personName: v })}
                />
                <EditableField
                  label="Location"
                  icon={MapPin}
                  value={lead.location || ''}
                  placeholder="Add location"
                  onSave={(v) => save({ location: v })}
                />
              </div>
            </DialogDescription>
          </header>

          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {/* Contact strip */}
            <dl className="grid grid-cols-1 sm:grid-cols-3 border-b border-slate-200/80 dark:border-slate-800 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-slate-800">
              {contactItems.map((item) => {
                const value: string = lead[item.key] || '';
                return (
                  <div key={item.key} className="flex items-start gap-3 px-5 sm:px-4 first:sm:pl-7 py-3 min-w-0">
                    <span className="grid place-items-center h-8 w-8 shrink-0 mt-0.5 rounded-lg bg-clay-50 text-clay-700 dark:bg-clay-950/50 dark:text-clay-300">
                      <item.icon className="h-[15px] w-[15px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <dt className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{item.label}</dt>
                      <dd className="text-[13px] font-medium text-slate-900 dark:text-slate-100">
                        <EditableField
                          label={item.label}
                          value={value}
                          placeholder={`Add ${item.label.toLowerCase()}`}
                          onSave={(v) => save({ [item.key]: v })}
                          extraActions={
                            value && item.copyable ? (
                              <IconAction label={`Copy ${item.label.toLowerCase()}`} onClick={() => copy(value, item.label)}>
                                <Copy className="h-3.5 w-3.5" />
                              </IconAction>
                            ) : null
                          }
                          renderValue={(v) => (
                            <a
                              href={item.href(v)}
                              target={item.external ? '_blank' : undefined}
                              rel={item.external ? 'noreferrer' : undefined}
                              className="hover:text-clay-700 dark:hover:text-clay-300 hover:underline"
                            >
                              {item.format ? item.format(v) : v}
                              {item.external && <ExternalLink className="inline h-3 w-3 ml-1 -mt-0.5 opacity-60" />}
                            </a>
                          )}
                        />
                      </dd>
                    </div>
                  </div>
                );
              })}
            </dl>

            <div className="px-5 sm:px-7 py-5 space-y-6">
              <div className="grid gap-5 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                {/* Notes: description (first note) + latest note */}
                <section aria-labelledby="lead-notes" className="min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 id="lead-notes" className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Notes</h3>
                    <button
                      type="button"
                      onClick={() => onOpenNotes(lead)}
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-clay-700 dark:text-clay-300 hover:bg-clay-50 dark:hover:bg-clay-950/40"
                    >
                      <StickyNote className="h-3 w-3" />
                      {notesCount > 0 ? `All notes (${notesCount})` : 'Add notes'}
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500 mb-0.5">
                        Description{firstNote ? `, ${shortDate(firstNote.createdAt)}` : ''}
                      </p>
                      <EditableField
                        label="Description"
                        multiline
                        value={firstNote?.text || ''}
                        placeholder="Add a description (saved as the first note)"
                        onSave={(v) => saveNote(firstNote ? 0 : 'new', v)}
                        renderValue={(v) => <span className="text-[12.5px] leading-relaxed text-slate-700 dark:text-slate-200">{v}</span>}
                      />
                    </div>

                    {latestNote && (
                      <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800">
                        <p className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500 mb-0.5">
                          Latest note, {shortDate(latestNote.createdAt)}
                        </p>
                        <EditableField
                          label="Latest note"
                          multiline
                          value={latestNote.text}
                          onSave={(v) => saveNote(notes.length - 1, v)}
                          renderValue={(v) => <span className="text-[12.5px] leading-relaxed text-slate-700 dark:text-slate-200">{v}</span>}
                        />
                      </div>
                    )}
                  </div>
                </section>

                {/* Best call time + nearby examples */}
                <section className="min-w-0 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/70 dark:border-slate-800 p-4 space-y-3.5">
                  <div>
                    <FieldLabel icon={Clock}>Best call time</FieldLabel>
                    <EditableField
                      label="Best call time"
                      value={lead.bestCallTime || ''}
                      placeholder="e.g. Tue–Thu, 10–11:30 AM"
                      onSave={(v) => save({ bestCallTime: v })}
                      renderValue={(v) => <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-50">{v}</span>}
                    />
                  </div>
                  <div className="pt-3.5 border-t border-slate-200/80 dark:border-slate-700/70">
                    <FieldLabel icon={Store}>Nearby examples</FieldLabel>
                    <EditableField
                      label="Nearby examples"
                      multiline
                      value={lead.nearbyExamples || ''}
                      placeholder={lead.location ? `Up to 3 businesses near ${lead.location}, one per line` : 'Up to 3 nearby businesses, one per line'}
                      onSave={(v) => save({ nearbyExamples: v })}
                      renderValue={(v) => <span className="text-[12.5px] leading-relaxed text-slate-700 dark:text-slate-200">{v}</span>}
                    />
                  </div>
                </section>
              </div>

              {/* Call prep */}
              <section aria-labelledby="call-prep" className="space-y-3">
                <h3 id="call-prep" className="font-display text-lg font-medium text-slate-900 dark:text-slate-50">Call prep</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <PrepBlock icon={CircleAlert} label="What's the problem">
                    <EditableField
                      label="Problem"
                      multiline
                      value={lead.problem || ''}
                      placeholder="What's broken or missing for them right now?"
                      onSave={(v) => save({ problem: v })}
                    />
                  </PrepBlock>
                  <PrepBlock icon={Lightbulb} label="What's the solution">
                    <EditableField
                      label="Solution"
                      multiline
                      value={lead.solution || ''}
                      placeholder="The service you'll pitch and why it fixes it."
                      onSave={(v) => save({ solution: v })}
                    />
                  </PrepBlock>
                </div>
                <PrepBlock icon={MessagesSquare} label="Cold call questions">
                  <EditableField
                    label="Cold call questions"
                    multiline
                    value={lead.coldCallQuestions || ''}
                    placeholder="One question per line"
                    onSave={(v) => save({ coldCallQuestions: v })}
                  />
                </PrepBlock>
              </section>
            </div>
          </div>

          {/* Footer */}
          <footer className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 px-5 sm:px-7 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900">
            <p className={cn('flex items-center gap-1.5 text-[11px] font-medium', savedAt ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500')} aria-live="polite">
              <CircleCheck className="h-3.5 w-3.5" />
              {savedAt ? 'Saved' : 'Use the pencil next to any field to edit it'}
            </p>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => onOpenNotes(lead)} className="text-xs">
                <StickyNote className="h-3.5 w-3.5 mr-1.5" />
                Notes{notesCount > 0 ? ` (${notesCount})` : ''}
              </Button>
              <Button variant="outline" size="sm" onClick={() => onBookAppointment(lead)} className="text-xs">
                <CalendarPlus className="h-3.5 w-3.5 mr-1.5" />
                Book call
              </Button>
              <Button size="sm" onClick={onClose} className="text-xs px-4">
                Done
              </Button>
            </div>
          </footer>
        </EditingContext.Provider>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */

function FieldLabel({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
      <Icon className="h-3.5 w-3.5 text-clay-600 dark:text-clay-400" />
      {children}
    </p>
  );
}

function PrepBlock({ icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200/80 dark:border-slate-800 px-3.5 py-3">
      <FieldLabel icon={icon}>{label}</FieldLabel>
      {children}
    </div>
  );
}

function IconAction({ label, onClick, children, className }: { label: string; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      // Keep focus in the input, so pressing Save/Cancel doesn't trigger blur-save first.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn('shrink-0 grid place-items-center h-6 w-6 rounded-md text-slate-400 hover:bg-slate-900/[0.06] hover:text-slate-800 dark:hover:bg-white/[0.08] dark:hover:text-slate-100 transition-colors', className)}
    >
      {children}
    </button>
  );
}

/**
 * Shows a value with its own edit button. Editing saves on Enter (Ctrl+Enter
 * for multi-line), on Save, or when focus leaves the field; Escape cancels.
 */
function EditableField({
  label,
  value,
  onSave,
  placeholder,
  multiline,
  required,
  icon: Icon,
  renderValue,
  extraActions,
  inputClassName,
}: {
  label: string;
  value: string;
  onSave: (value: string) => Promise<void>;
  placeholder?: string;
  multiline?: boolean;
  required?: boolean;
  icon?: React.ElementType;
  renderValue?: (value: string) => React.ReactNode;
  extraActions?: React.ReactNode;
  inputClassName?: string;
}) {
  const setEditingInDialog = useContext(EditingContext);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const finishing = useRef(false);
  const registered = useRef(false);

  const register = (on: boolean) => {
    if (registered.current === on) return;
    registered.current = on;
    setEditingInDialog(on);
  };

  const start = () => {
    setDraft(value);
    setEditing(true);
    finishing.current = false;
    register(true);
  };

  const stop = () => {
    setEditing(false);
    register(false);
  };

  // Release the dialog's Escape guard if this field unmounts mid-edit.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => register(false), []);

  const cancel = () => {
    finishing.current = true;
    setDraft(value);
    stop();
  };

  const commit = async () => {
    if (finishing.current) return;
    const next = draft.trim();
    if (next === value.trim()) {
      finishing.current = true;
      stop();
      return;
    }
    if (required && !next) {
      toast.error(`${label} can't be empty`);
      return;
    }
    finishing.current = true;
    setSaving(true);
    try {
      await onSave(next);
      stop();
    } catch {
      finishing.current = false; // keep editing so nothing typed is lost
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    const shared = {
      autoFocus: true,
      value: draft,
      disabled: saving,
      'aria-label': label,
      onChange: (e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => setDraft(e.target.value),
      onBlur: () => { void commit(); },
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          cancel();
        } else if (e.key === 'Enter' && (!multiline || e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          void commit();
        }
      },
    };
    return (
      <div className="flex items-start gap-1 min-w-0 w-full">
        {multiline ? (
          <Textarea
            {...shared}
            placeholder={placeholder}
            rows={3}
            className={cn('flex-1 min-w-0 text-[13px] resize-none [field-sizing:content] min-h-[4.5rem] max-h-64', inputClassName)}
          />
        ) : (
          <Input {...shared} placeholder={placeholder} className={cn('flex-1 min-w-0 h-8 text-[13px]', inputClassName)} />
        )}
        <div className={cn('flex shrink-0', multiline ? 'flex-col gap-0.5' : 'items-center')}>
          {saving ? (
            <span className="grid place-items-center h-6 w-6 text-slate-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /></span>
          ) : (
            <IconAction label={`Save ${label.toLowerCase()}`} onClick={() => void commit()} className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
              <Check className="h-4 w-4" strokeWidth={2.5} />
            </IconAction>
          )}
          <IconAction label="Cancel" onClick={cancel}>
            <X className="h-4 w-4" />
          </IconAction>
        </div>
      </div>
    );
  }

  return (
    <div className="group/field flex items-start gap-1.5 min-w-0">
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0 mt-[3px]" />}
      <div className="min-w-0 flex-1 [overflow-wrap:anywhere] whitespace-pre-wrap">
        {value ? (
          renderValue ? renderValue(value) : <span className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">{value}</span>
        ) : (
          <button type="button" onClick={start} className="text-left text-[12.5px] font-normal text-slate-400 dark:text-slate-500 hover:text-clay-700 dark:hover:text-clay-300">
            {placeholder || `Add ${label.toLowerCase()}`}
          </button>
        )}
      </div>
      <div className="flex shrink-0 items-center opacity-60 group-hover/field:opacity-100 focus-within:opacity-100 transition-opacity">
        {extraActions}
        <IconAction label={`Edit ${label.toLowerCase()}`} onClick={start}>
          <Pencil className="h-3.5 w-3.5" />
        </IconAction>
      </div>
    </div>
  );
}
