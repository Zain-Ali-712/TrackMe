import React, { useState, useEffect } from 'react';
import { ExternalLink, Edit2, CalendarPlus, Trash2, MoreHorizontal, Check, X, PhoneCall } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { STATUS_COLORS, cn } from '@/lib/utils';
import { getLatestNoteText, getNotesCount } from '@/components/common/MultiNotesDialog';

interface LeadTableProps {
  leads: any[];
  isLoading: boolean;
  onUpdateLead: (id: string, data: any) => void;
  onDeleteLead: (id: string) => void;
  onViewNotes: (lead: any) => void;
  onBookAppointment: (lead: any) => void;
  onEdit: (lead: any) => void;
  isAddingRow?: boolean;
  onSaveNewLead?: (data: any) => Promise<void>;
  onCancelNewLead?: () => void;
  activeStatus?: string;
}

export default function LeadTable({
  leads,
  isLoading,
  onUpdateLead,
  onDeleteLead,
  onViewNotes,
  onBookAppointment,
  onEdit,
  isAddingRow,
  onSaveNewLead,
  onCancelNewLead,
  activeStatus = 'New Lead'
}: LeadTableProps) {
  const [editingCell, setEditingCell] = useState<{ id: string, field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

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

  useEffect(() => {
    // User requirement: When adding new lead, status is strictly "New Lead" and call checkbox is empty/unchecked
    setNewStatus('New Lead');
    setNewColdCalled(false);
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

  const startEdit = (id: string, field: string, value: string) => {
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

  const getStatusBadge = (status: string) => {
    const color = STATUS_COLORS[status] || { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${color.bg} ${color.text} ${color.border} truncate max-w-full`}>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color.dot || 'bg-slate-400'}`} />
        <span className="truncate">{status}</span>
      </span>
    );
  };

  const renderEditableCell = (lead: any, field: string, displayValue?: React.ReactNode) => {
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
          className="h-7 text-xs px-1.5 w-full"
        />
      );
    }

    return (
      <div 
        className="px-1 py-0.5 -mx-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer transition-colors min-h-[22px] flex items-center truncate"
        onClick={() => startEdit(lead._id, field, val)}
      >
        <span className="truncate">
          {displayValue || val || <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">Empty</span>}
        </span>
      </div>
    );
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400 font-medium">Loading leads...</div>;
  }

  if (leads.length === 0 && !isAddingRow) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">No leads in this status</h3>
        <p className="text-slate-400 text-xs max-w-sm mt-1">
          Click &ldquo;Add Lead&rdquo; above to insert a new row directly into this table.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-auto flex-1 h-full relative">
      <table className="w-full table-fixed text-xs text-left border-collapse min-w-[800px] lg:min-w-full">
        {/* Balanced Column Allocation: Actions has 8.5% preventing header or button truncation */}
        <colgroup>
          <col className="w-[3.5%]" />   {/* # */}
          <col className="w-[20%]" />    {/* Business & Contact */}
          <col className="w-[16.5%]" />  {/* Phone & Email */}
          <col className="w-[15%]" />    {/* Location & Website */}
          <col className="w-[7.5%]" />   {/* Cold Call */}
          <col className="w-[13%]" />    {/* Status */}
          <col className="w-[16%]" />    {/* Notes */}
          <col className="w-[8.5%]" />   {/* Actions */}
        </colgroup>

        <thead className="text-[10.5px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20 shadow-xs backdrop-blur-sm">
          <tr>
            <th className="px-2 py-2.5 text-center">#</th>
            <th className="px-2.5 py-2.5">Business &amp; Contact</th>
            <th className="px-2.5 py-2.5">Phone &amp; Email</th>
            <th className="px-2.5 py-2.5">Location &amp; Website</th>
            <th className="px-1 py-2.5 text-center">Cold Call</th>
            <th className="px-2 py-2.5">Status</th>
            <th className="px-2.5 py-2.5">Notes</th>
            <th className="px-2 py-2.5 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {/* Spreadsheet Inline New Lead Row */}
          {isAddingRow && (
            <tr className="bg-blue-50/70 dark:bg-blue-950/40 border-b-2 border-blue-500/50 transition-colors">
              <td className="px-2 py-2 text-center">
                <span className="inline-flex items-center justify-center h-4.5 w-4.5 rounded-full bg-blue-600 text-white text-[9px] font-bold shadow-xs">
                  +
                </span>
              </td>
              <td className="px-2.5 py-2 space-y-1">
                <Input
                  autoFocus
                  placeholder="Business Name *"
                  value={newBusinessName}
                  onChange={(e) => setNewBusinessName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveNewRow();
                    if (e.key === 'Escape') onCancelNewLead?.();
                  }}
                  className="h-6 text-xs font-bold bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-xs"
                />
                <Input
                  placeholder="Person Name (optional)"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveNewRow();
                    if (e.key === 'Escape') onCancelNewLead?.();
                  }}
                  className="h-5 text-[11px] bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                />
              </td>
              <td className="px-2.5 py-2 space-y-1">
                <Input
                  placeholder="Phone number"
                  value={newContact}
                  onChange={(e) => setNewContact(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveNewRow();
                    if (e.key === 'Escape') onCancelNewLead?.();
                  }}
                  className="h-6 text-xs bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                />
                <Input
                  placeholder="contact@email.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveNewRow();
                    if (e.key === 'Escape') onCancelNewLead?.();
                  }}
                  className="h-5 text-[11px] bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                />
              </td>
              <td className="px-2.5 py-2 space-y-1">
                <Input
                  placeholder="City, State"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveNewRow();
                    if (e.key === 'Escape') onCancelNewLead?.();
                  }}
                  className="h-6 text-xs bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                />
                <Input
                  placeholder="website.com"
                  value={newWebsite}
                  onChange={(e) => setNewWebsite(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveNewRow();
                    if (e.key === 'Escape') onCancelNewLead?.();
                  }}
                  className="h-5 text-[11px] bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                />
              </td>
              {/* Cold Call Checkbox Draft */}
              <td className="px-1 py-2 text-center">
                <button
                  type="button"
                  onClick={() => setNewColdCalled(!newColdCalled)}
                  className={cn(
                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer",
                    newColdCalled
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                      : "bg-white dark:bg-slate-800/80 text-slate-400 border-slate-300 dark:border-slate-700"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={newColdCalled}
                    onChange={() => {}}
                    className="rounded text-amber-600 h-3 w-3 pointer-events-none"
                  />
                  <span>Call</span>
                </button>
              </td>
              <td className="px-2 py-2">
                <Select
                  value={newStatus}
                  onValueChange={(val) => {
                    setNewStatus(val);
                    if (val !== 'New Lead') setNewColdCalled(true);
                  }}
                >
                  <SelectTrigger className="h-6 text-xs bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <SelectItem value="New Lead">New Lead</SelectItem>
                    <SelectItem value="No Answer">No Answer</SelectItem>
                    <SelectItem value="Not Interested">Not Interested</SelectItem>
                    <SelectItem value="Callback">Callback</SelectItem>
                    <SelectItem value="Follow Up">Follow Up</SelectItem>
                    <SelectItem value="Appointment">Appointment</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                    <SelectItem value="DNC">DNC</SelectItem>
                  </SelectContent>
                </Select>
              </td>
              <td className="px-2 py-2">
                <Input
                  placeholder="Notes..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveNewRow();
                    if (e.key === 'Escape') onCancelNewLead?.();
                  }}
                  className="h-6 text-xs bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                />
              </td>
              <td className="px-2 py-2 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <Button
                    size="sm"
                    onClick={handleSaveNewRow}
                    disabled={!newBusinessName.trim() || isSubmittingNew}
                    className="h-6 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold shrink-0 shadow-xs"
                    title="Save Lead (Enter)"
                  >
                    <Check className="h-3 w-3 mr-0.5" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      resetDraft();
                      onCancelNewLead?.();
                    }}
                    className="h-6 w-6 p-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded shrink-0"
                    title="Cancel (Esc)"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          )}

          {leads.map((lead, idx) => {
            const latestNote = getLatestNoteText(lead.notes);
            const notesCount = getNotesCount(lead.notes);

            return (
              <tr key={lead._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 group transition-colors">
                {/* Index # */}
                <td className="px-2 py-2 text-center text-slate-400 dark:text-slate-500 font-semibold text-[11px] tabular-nums truncate">
                  {idx + 1}
                </td>

                {/* Business & Person Contact */}
                <td className="px-2.5 py-2 overflow-hidden">
                  <div className="font-bold text-slate-900 dark:text-white tracking-tight truncate leading-tight">
                    {renderEditableCell(lead, 'businessName')}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                    {renderEditableCell(lead, 'personName')}
                  </div>
                </td>

                {/* Contact & Email */}
                <td className="px-2.5 py-2 overflow-hidden">
                  <div className="text-slate-800 dark:text-slate-200 font-medium truncate leading-tight">
                    {renderEditableCell(lead, 'contact')}
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                    {renderEditableCell(lead, 'email')}
                  </div>
                </td>

                {/* Location & Website */}
                <td className="px-2.5 py-2 overflow-hidden">
                  <div className="text-slate-700 dark:text-slate-300 font-medium truncate leading-tight">
                    {renderEditableCell(lead, 'location')}
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate flex items-center gap-1 group/link">
                    {lead.website ? (
                      <a 
                        href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 font-medium truncate"
                      >
                        <span className="truncate">{lead.website.replace(/^https?:\/\//, '')}</span>
                        <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                      </a>
                    ) : (
                      renderEditableCell(lead, 'website')
                    )}
                  </div>
                </td>

                {/* Cold Call Checkbox Column */}
                <td className="px-1 py-2 text-center overflow-hidden">
                  <button
                    type="button"
                    onClick={() => onUpdateLead(lead._id, { coldCalled: !lead.coldCalled })}
                    className={cn(
                      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold border transition-all cursor-pointer",
                      lead.coldCalled
                        ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700/80 shadow-2xs"
                        : "bg-slate-50 dark:bg-slate-800/60 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                    )}
                    title={lead.coldCalled ? "Cold call logged (click to uncheck)" : "Click to mark as cold called"}
                  >
                    <input
                      type="checkbox"
                      checked={!!lead.coldCalled}
                      onChange={() => {}}
                      className="rounded text-amber-600 focus:ring-amber-500 h-3 w-3 pointer-events-none"
                    />
                    <span>{lead.coldCalled ? 'Done' : 'Call'}</span>
                  </button>
                </td>

                {/* Status Select Column (triggers appointment modal if set to Appointment) */}
                <td className="px-2 py-2 overflow-hidden">
                  <Select
                    value={lead.status}
                    onValueChange={(val) => {
                      if (val === 'Appointment') {
                        // User requirement: When marked Appointment, show modal for date/time!
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
                    <SelectTrigger className="h-7 border-none bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/80 focus:ring-0 px-1 py-0 shadow-none w-full rounded transition-colors overflow-hidden">
                      {getStatusBadge(lead.status)}
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <SelectItem value="New Lead">New Lead</SelectItem>
                      <SelectItem value="No Answer">No Answer</SelectItem>
                      <SelectItem value="Not Interested">Not Interested</SelectItem>
                      <SelectItem value="Callback">Callback</SelectItem>
                      <SelectItem value="Follow Up">Follow Up</SelectItem>
                      <SelectItem value="Appointment" className="text-blue-600 dark:text-blue-400 font-bold">
                        Appointment (Schedule)
                      </SelectItem>
                      <SelectItem value="Closed">Closed</SelectItem>
                      <SelectItem value="DNC">DNC</SelectItem>
                    </SelectContent>
                  </Select>
                </td>

                {/* Notes Column with Multi-Note preview & count */}
                <td className="px-2.5 py-2 overflow-hidden">
                  <button 
                    onClick={() => onViewNotes(lead)}
                    className="text-left w-full hover:bg-slate-100 dark:hover:bg-slate-800/80 p-1 -mx-1 rounded transition-colors group flex items-center justify-between gap-1.5 overflow-hidden"
                    title="Click to view history, edit, or add new dated notes"
                  >
                    <span className="truncate text-xs text-slate-700 dark:text-slate-300 font-medium">
                      {latestNote || <span className="italic text-slate-400 dark:text-slate-500 text-[11px]">Add note...</span>}
                    </span>
                    {notesCount > 0 && (
                      <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {notesCount}
                      </span>
                    )}
                  </button>
                </td>

                {/* Actions Column */}
                <td className="px-2 py-2 text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-900 dark:hover:text-white inline-flex items-center justify-center">
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <DropdownMenuItem onClick={() => onEdit(lead)} className="text-xs cursor-pointer">
                        <Edit2 className="h-3 w-3 mr-2" /> Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onBookAppointment(lead)} className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer">
                        <CalendarPlus className="h-3 w-3 mr-2" /> Book Call
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { if(window.confirm('Delete lead?')) onDeleteLead(lead._id) }} className="text-xs text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30 cursor-pointer">
                        <Trash2 className="h-3 w-3 mr-2" /> Delete
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
