import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, Edit2, CalendarPlus, Trash2, MoreHorizontal, Check, X, PhoneCall, PanelRightOpen, Plus, Inbox, StickyNote } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { STATUS_COLORS, cn } from '@/lib/utils';
import { getLatestNoteText, getNotesCount } from '@/components/common/MultiNotesDialog';

const STATUSES = ['New Lead', 'No Answer', 'Not Interested', 'Callback', 'Follow Up', 'Appointment', 'Closed', 'DNC'];

// Clicks on these never open the lead modal; they have their own job.
const INTERACTIVE_SELECTOR = 'button, a, input, textarea, select, label, [role="combobox"], [role="menuitem"], [data-row-ignore]';
// Long enough to tell a single click (open modal) from a double click (edit cell).
const DOUBLE_CLICK_WINDOW_MS = 220;

interface LeadTableProps {
  leads: any[];
  isLoading: boolean;
  onUpdateLead: (id: string, data: any) => void;
  onDeleteLead: (id: string) => void;
  onViewNotes: (lead: any) => void;
  onBookAppointment: (lead: any) => void;
  onEdit: (lead: any) => void;
  onOpenLead: (lead: any) => void;
  activeLeadId?: string | null;
  isAddingRow?: boolean;
  onSaveNewLead?: (data: any) => Promise<void>;
  onCancelNewLead?: () => void;
}

export default function LeadTable({
  leads,
  isLoading,
  onUpdateLead,
  onDeleteLead,
  onViewNotes,
  onBookAppointment,
  onEdit,
  onOpenLead,
  activeLeadId,
  isAddingRow,
  onSaveNewLead,
  onCancelNewLead,
}: LeadTableProps) {
  const [editingCell, setEditingCell] = useState<{ id: string, field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const openTimer = useRef<number | null>(null);

  // Draft new lead row state
  const [newBusinessName, setNewBusinessName] = useState('');
  const [newPersonName, setNewPersonName] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newWebsite, setNewWebsite] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newStatus, setNewStatus] = useState('New Lead');
  const [newColdCalled, setNewColdCalled] = useState(false);
  const [newNotes, setNewNotes] = useState('');
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // Reset draft every time the row is opened so cancelled data never persists
  useEffect(() => {
    if (isAddingRow) {
      resetDraft();
    }
  }, [isAddingRow]);

  useEffect(() => () => {
    if (openTimer.current) window.clearTimeout(openTimer.current);
  }, []);

  const resetDraft = () => {
    setNewBusinessName('');
    setNewPersonName('');
    setNewContact('');
    setNewEmail('');
    setNewWebsite('');
    setNewLocation('');
    setNewStatus('New Lead');
    setNewColdCalled(false);
    setNewNotes('');
  };

  const handleSaveNewRow = async () => {
    if (!newBusinessName.trim() || !onSaveNewLead) return;
    try {
      setIsSubmittingNew(true);
      await onSaveNewLead({
        businessName: newBusinessName.trim(),
        personName: newPersonName.trim(),
        contact: newContact.trim(),
        email: newEmail.trim(),
        website: newWebsite.trim(),
        location: newLocation.trim(),
        status: newStatus || 'New Lead',
        coldCalled: newColdCalled,
        notes: newNotes.trim()
      });
      resetDraft();
    } finally {
      setIsSubmittingNew(false);
    }
  };

  const cancelPendingOpen = () => {
    if (openTimer.current) {
      window.clearTimeout(openTimer.current);
      openTimer.current = null;
    }
  };

  const startEdit = (id: string, field: string, value: string) => {
    cancelPendingOpen();
    setEditingCell({ id, field });
    setEditValue(value || '');
  };

  const saveEdit = (id: string, field: string) => {
    if (editingCell) {
      onUpdateLead(id, { [field]: editValue });
      setEditingCell(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string, field: string) => {
    if (e.key === 'Enter') saveEdit(id, field);
    if (e.key === 'Escape') setEditingCell(null);
  };

  const handleRowClick = (e: React.MouseEvent<HTMLTableRowElement>, lead: any) => {
    const target = e.target as HTMLElement;
    // React bubbles clicks from portaled menus (status select, actions) up
    // through the row; those aren't in the row's DOM, so ignore them.
    if (!e.currentTarget.contains(target)) return;
    if (target.closest(INTERACTIVE_SELECTOR)) return;
    if (editingCell) return;
    if (window.getSelection()?.toString()) return;

    if (target.closest('[data-editable]')) {
      if (e.detail > 1) return;
      cancelPendingOpen();
      openTimer.current = window.setTimeout(() => {
        openTimer.current = null;
        onOpenLead(lead);
      }, DOUBLE_CLICK_WINDOW_MS);
      return;
    }
    onOpenLead(lead);
  };

  const draftKeys = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveNewRow();
    if (e.key === 'Escape') onCancelNewLead?.();
  };

  const getStatusBadge = (status: string) => {
    const color = STATUS_COLORS[status] || STATUS_COLORS['New Lead'];
    return (
      <span className={cn('inline-flex items-center gap-1.5 px-2 py-[3px] rounded-full text-[11px] font-medium border truncate max-w-full', color.bg, color.text, color.border)}>
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', color.dot)} />
        <span className="truncate">{status}</span>
      </span>
    );
  };

  const renderEditableCell = (lead: any, field: string, placeholder: string) => {
    const isEditing = editingCell?.id === lead._id && editingCell?.field === field;
    const val = lead[field];

    if (isEditing) {
      return (
        <Input
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => saveEdit(lead._id, field)}
          onKeyDown={(e) => handleKeyDown(e, lead._id, field)}
          className="h-7 text-xs px-2 w-full"
        />
      );
    }

    return (
      <div
        data-editable
        title="Double-click to edit"
        onDoubleClick={() => startEdit(lead._id, field, val)}
        className="px-1.5 py-0.5 -mx-1.5 rounded-md hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.05] transition-colors min-h-[22px] flex items-center truncate"
      >
        <span className="truncate">
          {val || <span className="text-slate-400 dark:text-slate-500 font-normal">{placeholder}</span>}
        </span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-5 space-y-3" aria-busy="true" aria-label="Loading leads">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 animate-pulse" style={{ opacity: 1 - i * 0.11 }}>
            <div className="h-8 w-8 rounded-lg bg-slate-200/70 dark:bg-slate-800" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-1/4 rounded bg-slate-200/80 dark:bg-slate-800" />
              <div className="h-2.5 w-1/6 rounded bg-slate-200/50 dark:bg-slate-800/70" />
            </div>
            <div className="h-5 w-20 rounded-full bg-slate-200/60 dark:bg-slate-800" />
          </div>
        ))}
      </div>
    );
  }

  if (leads.length === 0 && !isAddingRow) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-10 text-center">
        <span className="grid place-items-center h-12 w-12 rounded-2xl bg-clay-50 dark:bg-clay-950/50 text-clay-600 dark:text-clay-400 mb-4">
          <Inbox className="h-5 w-5" />
        </span>
        <h3 className="font-display text-lg font-medium text-slate-900 dark:text-slate-100">No leads with this status</h3>
        <p className="text-slate-500 dark:text-slate-400 text-[13px] max-w-sm mt-1 leading-relaxed">
          Add a lead inline, import a spreadsheet, or pick another status above.
        </p>
      </div>
    );
  }

  const draftInput = 'h-7 text-xs bg-white dark:bg-slate-900';

  return (
    <div className="overflow-auto flex-1 h-full relative">
      <table className="w-full table-fixed text-xs text-left border-collapse min-w-[860px] lg:min-w-full">
        <colgroup>
          <col className="w-[3.5%]" />
          <col className="w-[21%]" />
          <col className="w-[16%]" />
          <col className="w-[15%]" />
          <col className="w-[8%]" />
          <col className="w-[13%]" />
          <col className="w-[17%]" />
          <col className="w-[6.5%]" />
        </colgroup>

        <thead className="sticky top-0 z-20 bg-slate-50/95 dark:bg-slate-850/95 backdrop-blur-sm text-[11px] font-medium text-slate-500 dark:text-slate-400 shadow-[inset_0_-1px_0_rgb(var(--color-slate-200))] dark:shadow-[inset_0_-1px_0_rgb(var(--color-slate-700))]">
          <tr>
            <th scope="col" className="px-2 py-2.5 text-center font-medium">#</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Business</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Phone &amp; email</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Location &amp; website</th>
            <th scope="col" className="px-1 py-2.5 text-center font-medium">Cold call</th>
            <th scope="col" className="px-2 py-2.5 font-medium">Status</th>
            <th scope="col" className="px-3 py-2.5 font-medium">Notes</th>
            <th scope="col" className="px-2 py-2.5 text-center font-medium"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800">
          {/* Spreadsheet Inline New Lead Row */}
          {isAddingRow && (
            <tr className="bg-clay-50/70 dark:bg-clay-950/25 shadow-[inset_0_-1px_0_rgb(193_95_60/0.35)]">
              <td className="px-2 py-2.5 text-center align-top">
                <span className="inline-grid place-items-center h-5 w-5 mt-1 rounded-md bg-clay-600 text-white">
                  <Plus className="h-3 w-3" strokeWidth={2.5} />
                </span>
              </td>
              <td className="px-3 py-2.5 space-y-1">
                <Input autoFocus placeholder="Business name (required)" value={newBusinessName} onChange={(e) => setNewBusinessName(e.target.value)} onKeyDown={draftKeys} className={cn(draftInput, 'font-semibold')} />
                <Input placeholder="Person name" value={newPersonName} onChange={(e) => setNewPersonName(e.target.value)} onKeyDown={draftKeys} className={draftInput} />
              </td>
              <td className="px-3 py-2.5 space-y-1">
                <Input placeholder="Phone number" value={newContact} onChange={(e) => setNewContact(e.target.value)} onKeyDown={draftKeys} className={draftInput} />
                <Input placeholder="name@company.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} onKeyDown={draftKeys} className={draftInput} />
              </td>
              <td className="px-3 py-2.5 space-y-1">
                <Input placeholder="City, State" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} onKeyDown={draftKeys} className={draftInput} />
                <Input placeholder="website.com" value={newWebsite} onChange={(e) => setNewWebsite(e.target.value)} onKeyDown={draftKeys} className={draftInput} />
              </td>
              <td className="px-1 py-2.5 text-center align-top">
                <ColdCallToggle checked={newColdCalled} onToggle={() => setNewColdCalled(!newColdCalled)} />
              </td>
              <td className="px-2 py-2.5 align-top">
                <Select
                  value={newStatus}
                  onValueChange={(val) => {
                    setNewStatus(val);
                    if (val !== 'New Lead') setNewColdCalled(true);
                  }}
                >
                  <SelectTrigger className={draftInput}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-3 py-2.5 align-top">
                <Input placeholder="First note (becomes the description)" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} onKeyDown={draftKeys} className={draftInput} />
              </td>
              <td className="px-2 py-2.5 align-top">
                <div className="flex flex-col items-center gap-1">
                  <Button
                    size="sm"
                    onClick={handleSaveNewRow}
                    disabled={!newBusinessName.trim() || isSubmittingNew}
                    className="h-7 w-full px-2 text-[11px]"
                    title="Save lead (Enter)"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      resetDraft();
                      onCancelNewLead?.();
                    }}
                    className="h-6 w-full px-2 text-[11px]"
                    title="Cancel (Esc)"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </td>
            </tr>
          )}

          {leads.map((lead, idx) => {
            const latestNote = getLatestNoteText(lead.notes);
            const notesCount = getNotesCount(lead.notes);
            const isActive = activeLeadId === lead._id;

            return (
              <tr
                key={lead._id}
                tabIndex={0}
                onClick={(e) => handleRowClick(e, lead)}
                onKeyDown={(e) => {
                  if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onOpenLead(lead);
                  }
                }}
                className={cn(
                  'group cursor-pointer transition-colors outline-none focus-visible:bg-clay-50/70 dark:focus-visible:bg-clay-950/25',
                  isActive
                    ? 'bg-clay-50 dark:bg-clay-950/30'
                    : 'hover:bg-[rgb(250_246_239)] dark:hover:bg-slate-850'
                )}
              >
                <td className="px-2 py-2.5 text-center text-slate-400 dark:text-slate-500 text-[11px] tabular-nums">
                  {idx + 1}
                </td>

                {/* Business & person */}
                <td className="px-3 py-2.5 overflow-hidden">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      aria-hidden
                      className={cn(
                        'grid place-items-center h-8 w-8 shrink-0 rounded-lg text-[12px] font-semibold transition-colors',
                        isActive
                          ? 'bg-clay-600 text-white'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 group-hover:bg-clay-100 group-hover:text-clay-800 dark:group-hover:bg-clay-950/60 dark:group-hover:text-clay-200'
                      )}
                    >
                      {(lead.businessName || '?').trim().charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-50 truncate leading-tight">
                        {renderEditableCell(lead, 'businessName', 'Business name')}
                      </div>
                      <div className="text-[11.5px] text-slate-500 dark:text-slate-400 truncate">
                        {renderEditableCell(lead, 'personName', 'Add person')}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Phone & email */}
                <td className="px-3 py-2.5 overflow-hidden">
                  <div className="text-slate-800 dark:text-slate-200 font-medium truncate leading-tight tabular-nums">
                    {renderEditableCell(lead, 'contact', 'Add phone')}
                  </div>
                  <div className="text-[11.5px] text-slate-500 dark:text-slate-400 truncate">
                    {renderEditableCell(lead, 'email', 'Add email')}
                  </div>
                </td>

                {/* Location & website */}
                <td className="px-3 py-2.5 overflow-hidden">
                  <div className="text-slate-700 dark:text-slate-300 truncate leading-tight">
                    {renderEditableCell(lead, 'location', 'Add location')}
                  </div>
                  <div className="text-[11.5px] truncate flex items-center gap-1 group/link">
                    {lead.website ? (
                      <a
                        href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-clay-700 dark:text-clay-300 hover:underline flex items-center gap-1 truncate"
                      >
                        <span className="truncate">{lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                        <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                      </a>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400 w-full">{renderEditableCell(lead, 'website', 'Add website')}</span>
                    )}
                  </div>
                </td>

                <td className="px-1 py-2.5 text-center">
                  <ColdCallToggle checked={!!lead.coldCalled} onToggle={() => onUpdateLead(lead._id, { coldCalled: !lead.coldCalled })} />
                </td>

                {/* Status (choosing Appointment opens the booking dialog) */}
                <td className="px-2 py-2.5 overflow-hidden">
                  <Select
                    value={lead.status}
                    onValueChange={(val) => {
                      if (val === 'Appointment') {
                        onBookAppointment(lead);
                        return;
                      }
                      const updates: any = { status: val };
                      if (val !== 'New Lead' && !lead.coldCalled) {
                        updates.coldCalled = true;
                      }
                      onUpdateLead(lead._id, updates);
                    }}
                  >
                    <SelectTrigger className="h-7 border-none bg-transparent dark:bg-transparent hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.05] focus:ring-0 px-1 py-0 shadow-none w-full rounded-md transition-colors overflow-hidden [&>svg]:opacity-0 group-hover:[&>svg]:opacity-40">
                      {getStatusBadge(lead.status)}
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className={s === 'Appointment' ? 'text-clay-700 dark:text-clay-300 font-medium' : undefined}>
                          {s === 'Appointment' ? 'Appointment (schedule)' : s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>

                {/* Notes */}
                <td className="px-3 py-2.5 overflow-hidden">
                  <button
                    onClick={() => onViewNotes(lead)}
                    className="text-left w-full hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.05] px-1.5 py-1 -mx-1.5 rounded-md transition-colors flex items-center justify-between gap-1.5 overflow-hidden"
                    title="View, edit or add dated notes"
                  >
                    <span className="truncate text-xs text-slate-600 dark:text-slate-300">
                      {latestNote || <span className="text-slate-400 dark:text-slate-500">Add note</span>}
                    </span>
                    {notesCount > 0 ? (
                      <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-px rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 tabular-nums">
                        <StickyNote className="h-2.5 w-2.5" />
                        {notesCount}
                      </span>
                    ) : null}
                  </button>
                </td>

                <td className="px-2 py-2.5 text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="p-1.5 rounded-md hover:bg-slate-900/[0.06] dark:hover:bg-white/[0.08] transition-colors text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 inline-flex items-center justify-center"
                      aria-label={`Actions for ${lead.businessName}`}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => onOpenLead(lead)} className="text-xs cursor-pointer">
                        <PanelRightOpen className="h-3.5 w-3.5 mr-2" /> Open lead
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(lead)} className="text-xs cursor-pointer">
                        <Edit2 className="h-3.5 w-3.5 mr-2" /> Edit details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onBookAppointment(lead)} className="text-xs cursor-pointer">
                        <CalendarPlus className="h-3.5 w-3.5 mr-2" /> Book call
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => { if (window.confirm(`Delete ${lead.businessName}? This also removes its appointments.`)) onDeleteLead(lead._id); }}
                        className="text-xs text-rose-600 dark:text-rose-400 focus:bg-rose-50 focus:text-rose-700 dark:focus:bg-rose-950/40 dark:focus:text-rose-300 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ColdCallToggle({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className={cn(
        'inline-flex items-center gap-1 h-6 pl-1.5 pr-2 rounded-full text-[11px] font-medium border transition-all',
        checked
          ? 'bg-clay-600 text-white border-clay-600 hover:bg-clay-700 dark:bg-clay-500 dark:border-clay-500 dark:text-slate-950'
          : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-clay-300 hover:text-clay-700 dark:hover:border-clay-700 dark:hover:text-clay-300'
      )}
      title={checked ? 'Cold call logged (click to undo)' : 'Mark as cold called'}
    >
      {checked ? <Check className="h-3 w-3" strokeWidth={2.75} /> : <PhoneCall className="h-3 w-3" />}
      {checked ? 'Called' : 'Call'}
    </button>
  );
}
