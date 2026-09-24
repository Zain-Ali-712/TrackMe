import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { fetchNiches, fetchLeads, updateLead, deleteLead, createLead, createNiche, updateNiche, deleteNiche, createAppointment } from '@/lib/api';
import NicheTabBar from '@/components/leads/NicheTabBar';
import LeadTable from '@/components/leads/LeadTable';
import LeadFormDialog from '@/components/leads/LeadFormDialog';
import MultiNotesDialog, { serializeNoteEntries } from '@/components/common/MultiNotesDialog';
import BookAppointmentDialog from '@/components/leads/BookAppointmentDialog';
import NicheFormDialog from '@/components/NicheFormDialog';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const STATUS_TABS = [
  { value: 'New Lead',       label: 'New Leads',      dot: 'bg-slate-400' },
  { value: 'No Answer',      label: 'No Answer',      dot: 'bg-slate-400' },
  { value: 'Not Interested', label: 'Not Interested', dot: 'bg-rose-500' },
  { value: 'Callback',       label: 'Callback',       dot: 'bg-amber-500' },
  { value: 'Follow Up',      label: 'Follow Up',      dot: 'bg-sky-500' },
  { value: 'Appointment',    label: 'Appointment',    dot: 'bg-blue-600' },
  { value: 'Closed',         label: 'Closed',         dot: 'bg-emerald-500' },
  { value: 'DNC',            label: 'DNC',            dot: 'bg-red-500' },
];

export default function LeadsPage() {
  const location = useLocation();
  const [niches, setNiches] = useState<any[]>([]);
  const [activeNicheId, setActiveNicheId] = useState<string | null>(() => location.state?.nicheId ?? null);
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState<string>(() => location.state?.status ?? 'New Lead');

  // Inline spreadsheet adding state
  const [isAddingLeadRow, setIsAddingLeadRow] = useState(false);

  // Dialog states for editing existing items
  const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<any | null>(null);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [notesLead, setNotesLead] = useState<any | null>(null);
  const [isBookApptOpen, setIsBookApptOpen] = useState(false);
  const [bookApptLead, setBookApptLead] = useState<any | null>(null);
  const [isNicheFormOpen, setIsNicheFormOpen] = useState(false);
  const [editingNiche, setEditingNiche] = useState<any | null>(null);

  useEffect(() => {
    if (location.state) {
      if (location.state.status) {
        setActiveStatus(location.state.status);
      }
      if (location.state.nicheId !== undefined) {
        setActiveNicheId(location.state.nicheId);
      }
    }
  }, [location.state]);

  useEffect(() => { loadNiches(); }, []);
  useEffect(() => { loadLeads(); }, [activeNicheId]);

  const loadNiches = async () => {
    try {
      const data = await fetchNiches();
      setNiches(data);
    } catch { toast.error('Failed to load niches'); }
  };

  const loadLeads = async () => {
    try {
      setIsLoading(true);
      const params: Record<string, string> = {};
      if (activeNicheId && activeNicheId !== 'all') params.niche = activeNicheId;
      const data = await fetchLeads(Object.keys(params).length > 0 ? params : undefined);
      setLeads(data);
    } catch { toast.error('Failed to load leads'); }
    finally { setIsLoading(false); }
  };

  // Count leads per status tab (for the current niche)
  const statusCounts = STATUS_TABS.reduce<Record<string, number>>((acc, t) => {
    acc[t.value] = leads.filter(l => l.status === t.value).length;
    return acc;
  }, {});

  const filteredLeads = leads.filter(lead => {
    const matchesSearch =
      (lead.businessName?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (lead.personName?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (lead.location?.toLowerCase() || '').includes(search.toLowerCase());
    return matchesSearch && lead.status === activeStatus;
  });

  // Spreadsheet-style inline lead creation
  const handleSaveInlineNewLead = async (data: any) => {
    try {
      const assignedNiche = activeNicheId && activeNicheId !== 'all' ? activeNicheId : niches[0]?._id;
      if (!assignedNiche) {
        toast.error('Please create a niche first');
        setIsNicheFormOpen(true);
        return;
      }
      await createLead({ ...data, niche: assignedNiche });
      toast.success('Lead added');
      setIsAddingLeadRow(false);
      // If added with another status, switch tab to that status so it is visible
      if (data.status && data.status !== activeStatus) {
        setActiveStatus(data.status);
      }
      loadLeads();
    } catch {
      toast.error('Failed to create lead');
    }
  };

  const handleUpdateLeadInline = async (id: string, updates: any) => {
    try {
      setLeads(leads.map(l => l._id === id ? { ...l, ...updates } : l));
      await updateLead(id, updates);
      toast.success('Updated');
      loadLeads();
    } catch {
      toast.error('Failed to update lead');
      loadLeads();
    }
  };

  const handleDeleteLead = async (id: string) => {
    try {
      await deleteLead(id);
      toast.success('Lead deleted');
      loadLeads();
    } catch { toast.error('Failed to delete lead'); }
  };

  const handleCreateNiche = async (data: any) => {
    try {
      if (editingNiche) {
        await updateNiche(editingNiche._id, data);
        toast.success('Niche updated');
      } else {
        const newNiche = await createNiche(data);
        toast.success('Niche created');
        setActiveNicheId(newNiche._id);
      }
      setIsNicheFormOpen(false);
      setEditingNiche(null);
      loadNiches();
    } catch { toast.error('Failed to save niche'); }
  };

  const handleDeleteNiche = async (id: string) => {
    if (!window.confirm('Are you sure? All leads in this niche will be removed.')) return;
    try {
      await deleteNiche(id);
      toast.success('Niche deleted');
      if (activeNicheId === id) setActiveNicheId(null);
      loadNiches();
    } catch { toast.error('Failed to delete niche'); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-3 min-h-0">
      {/* Niche Tabs */}
      <NicheTabBar
        niches={niches}
        activeNicheId={activeNicheId}
        onSelect={setActiveNicheId}
        onCreateNiche={() => { setEditingNiche(null); setIsNicheFormOpen(true); }}
        onEditNiche={(n) => { setEditingNiche(n); setIsNicheFormOpen(true); }}
        onDeleteNiche={handleDeleteNiche}
      />

      {/* Status Tabs Bar — Compact single row without horizontal scroll */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-1">
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 w-full">
          {STATUS_TABS.map((tab) => {
            const count = statusCounts[tab.value] ?? 0;
            const isActive = activeStatus === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveStatus(tab.value)}
                className={cn(
                  'flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 border',
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-sm'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', tab.dot, !isActive && 'opacity-60')} />
                <span className="truncate">{tab.label}</span>
                <span className={cn(
                  'ml-0.5 rounded-full px-1.5 py-0.2 text-[9px] font-bold tabular-nums',
                  isActive
                    ? 'bg-white/20 text-white dark:bg-slate-800 dark:text-slate-100'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Toolbar: Search + Add Lead button (triggers inline spreadsheet row) */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search by business, contact, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50 rounded-lg focus-visible:ring-slate-900 dark:focus-visible:ring-slate-100"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {isAddingLeadRow ? (
            <Button
              variant="outline"
              onClick={() => setIsAddingLeadRow(false)}
              className="w-full sm:w-auto h-8 px-3 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Cancel New Row
            </Button>
          ) : (
            <Button
              onClick={() => setIsAddingLeadRow(true)}
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 h-8 px-3.5 text-xs font-semibold shadow-sm shadow-slate-900/10 rounded-lg"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Lead (Inline)
            </Button>
          )}
        </div>
      </div>

      {/* Lead Table Container with sticky header */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-[0_1px_3px_0_rgba(15,23,42,0.06)] overflow-hidden flex flex-col min-h-0">
        <LeadTable
          leads={filteredLeads}
          isLoading={isLoading}
          onUpdateLead={handleUpdateLeadInline}
          onDeleteLead={handleDeleteLead}
          onViewNotes={(lead) => { setNotesLead(lead); setIsNotesOpen(true); }}
          onBookAppointment={(lead) => { setBookApptLead(lead); setIsBookApptOpen(true); }}
          onEdit={(lead) => { setEditingLead(lead); setIsLeadFormOpen(true); }}
          isAddingRow={isAddingLeadRow}
          onSaveNewLead={handleSaveInlineNewLead}
          onCancelNewLead={() => setIsAddingLeadRow(false)}
          activeStatus={activeStatus}
        />
      </div>

      {/* Dialogs for details / appointments */}
      <LeadFormDialog
        open={isLeadFormOpen}
        onClose={() => setIsLeadFormOpen(false)}
        onSubmit={async (data) => {
          if (editingLead) {
            await updateLead(editingLead._id, data);
            toast.success('Lead updated');
            setIsLeadFormOpen(false);
            setEditingLead(null);
            loadLeads();
          }
        }}
        lead={editingLead}
        nicheId={activeNicheId === 'all' ? undefined : activeNicheId || undefined}
      />
      <MultiNotesDialog
        open={isNotesOpen}
        onClose={() => {
          setIsNotesOpen(false);
          setNotesLead(null);
        }}
        title={`Notes for ${notesLead?.businessName || notesLead?.personName || 'Lead'}`}
        subtitle={notesLead?.createdAt ? `Lead created on ${new Date(notesLead.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}` : undefined}
        initialNotesRaw={notesLead?.notes}
        fallbackDate={notesLead?.createdAt}
        onSave={async (serialized) => {
          if (notesLead) {
            await handleUpdateLeadInline(notesLead._id, { notes: serialized });
          }
        }}
      />
      <BookAppointmentDialog
        open={isBookApptOpen}
        onClose={() => {
          setIsBookApptOpen(false);
          setBookApptLead(null);
        }}
        lead={bookApptLead}
        onSubmit={async (data) => {
          try {
            const formattedNotes = data.notes
              ? serializeNoteEntries([{
                  id: `note-${Date.now()}`,
                  text: data.notes,
                  createdAt: new Date().toISOString()
                }])
              : undefined;

            await createAppointment({
              leadId: bookApptLead._id,
              dateTime: data.dateTime,
              duration: data.duration,
              notes: formattedNotes
            });
            await handleUpdateLeadInline(bookApptLead._id, { status: 'Appointment', coldCalled: true });
            toast.success('Appointment booked successfully');
            setIsBookApptOpen(false);
            setBookApptLead(null);
            loadLeads();
          } catch {
            toast.error('Failed to book appointment');
          }
        }}
      />
      <NicheFormDialog
        open={isNicheFormOpen}
        onClose={() => setIsNicheFormOpen(false)}
        onSubmit={handleCreateNiche}
        niche={editingNiche}
      />
    </div>
  );
}
