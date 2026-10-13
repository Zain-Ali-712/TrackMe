import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Plus, X, Upload, RotateCcw, Download, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { fetchNiches, fetchLeads, updateLead, deleteLead, createLead, createNiche, updateNiche, deleteNiche, createAppointment, batchDeleteLeads } from '@/lib/api';
import NicheTabBar from '@/components/leads/NicheTabBar';
import LeadTable from '@/components/leads/LeadTable';
import LeadFormDialog from '@/components/leads/LeadFormDialog';
import LeadDetailDialog from '@/components/leads/LeadDetailDialog';
import MultiNotesDialog, { serializeNoteEntries } from '@/components/common/MultiNotesDialog';
import BookAppointmentDialog from '@/components/leads/BookAppointmentDialog';
import NicheFormDialog from '@/components/NicheFormDialog';
import { cn } from '@/lib/utils';
import { buildHeaderMap, inferBestCallTime } from '@/lib/leadImport';
import toast from 'react-hot-toast';

const STATUS_TABS = [
  { value: 'New Lead',       label: 'New Leads',      dot: 'bg-slate-400' },
  { value: 'No Answer',      label: 'No Answer',      dot: 'bg-slate-400' },
  { value: 'Not Interested', label: 'Not Interested', dot: 'bg-rose-500' },
  { value: 'Callback',       label: 'Callback',       dot: 'bg-amber-500' },
  { value: 'Follow Up',      label: 'Follow Up',      dot: 'bg-sky-500' },
  { value: 'Appointment',    label: 'Appointment',    dot: 'bg-clay-600' },
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
  const [isImporting, setIsImporting] = useState(false);
  const [lastImportedLeadIds, setLastImportedLeadIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('trackme_last_imported_leads');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isUndoingImport, setIsUndoingImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dialog states for editing existing items
  const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<any | null>(null);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [notesLead, setNotesLead] = useState<any | null>(null);
  const [isBookApptOpen, setIsBookApptOpen] = useState(false);
  const [bookApptLead, setBookApptLead] = useState<any | null>(null);
  const [isNicheFormOpen, setIsNicheFormOpen] = useState(false);
  // Lead detail modal; read from `leads` so it always shows the latest data.
  const [detailLeadId, setDetailLeadId] = useState<string | null>(null);
  const detailLead = detailLeadId ? leads.find((l) => l._id === detailLeadId) ?? null : null;
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

  // Excel / CSV import — loads SheetJS from CDN dynamically (no npm install needed)
  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset file input so the same file can be re-imported if needed
    e.target.value = '';

    const assignedNiche = activeNicheId && activeNicheId !== 'all' ? activeNicheId : niches[0]?._id;
    if (!assignedNiche) {
      toast.error('Please create a niche first before importing');
      setIsNicheFormOpen(true);
      return;
    }

    setIsImporting(true);
    try {
      // Dynamically load SheetJS from CDN (avoids any npm/disk space requirement)
      const XLSX: any = await new Promise((resolve, reject) => {
        if ((window as any).XLSX) { resolve((window as any).XLSX); return; }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
        script.onload = () => resolve((window as any).XLSX);
        script.onerror = () => reject(new Error('Failed to load SheetJS'));
        document.head.appendChild(script);
      });

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (rows.length === 0) {
        toast.error('No data rows found in the file');
        setIsImporting(false);
        return;
      }

      // Fuzzy, case-insensitive header matching; unmatched fields stay empty.
      const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
      const headerMap = buildHeaderMap(headers);

      let created = 0;
      let skipped = 0;
      const newlyCreatedIds: string[] = [];
      for (const row of rows) {
        const lead: any = { niche: assignedNiche, status: 'New Lead', coldCalled: false };
        let businessHours = '';
        for (const [rawKey, val] of Object.entries(row)) {
          const mappedField = headerMap.get(rawKey);
          const text = String(val ?? '').trim();
          if (!mappedField || !text) continue;
          if (mappedField === 'businessHours') businessHours = text;
          else lead[mappedField] = text;
        }
        if (!lead.bestCallTime && businessHours) {
          lead.bestCallTime = inferBestCallTime(businessHours);
        }
        if (lead.notes) {
          lead.notes = serializeNoteEntries([{ id: `note-${Date.now()}-${created}`, text: lead.notes, createdAt: new Date().toISOString() }]);
        }
        // Require at least a business name to create the lead
        if (!lead.businessName) { skipped++; continue; }
        try {
          const saved = await createLead(lead);
          if (saved && saved._id) newlyCreatedIds.push(saved._id);
          created++;
        } catch { skipped++; }
      }

      if (created > 0) {
        setLastImportedLeadIds(newlyCreatedIds);
        try {
          localStorage.setItem('trackme_last_imported_leads', JSON.stringify(newlyCreatedIds));
        } catch {}
        toast.success(`${created} lead${created > 1 ? 's' : ''} imported successfully${skipped > 0 ? ` (${skipped} rows skipped — missing business name)` : ''}`);
        loadLeads();
      } else {
        toast.error(`No leads were imported. Make sure the file has a "Business Name" column.`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to import file');
    } finally {
      setIsImporting(false);
    }
  };

  const handleUndoLastImport = async () => {
    if (!lastImportedLeadIds || lastImportedLeadIds.length === 0) return;
    const count = lastImportedLeadIds.length;
    const confirmed = window.confirm(`Are you sure you want to undo the last import? This will delete all ${count} leads created during that import.`);
    if (!confirmed) return;

    setIsUndoingImport(true);
    try {
      await batchDeleteLeads(lastImportedLeadIds);
      toast.success(`Successfully undid last import (${count} leads removed)`);
      setLastImportedLeadIds([]);
      localStorage.removeItem('trackme_last_imported_leads');
      loadLeads();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to undo import');
    } finally {
      setIsUndoingImport(false);
    }
  };

  // Export currently visible leads (filtered by niche + status + search) to Excel
  const handleExcelExport = async () => {
    if (filteredLeads.length === 0) {
      toast.error('No leads to export with the current filters');
      return;
    }

    try {
      // Load SheetJS from CDN (same as import — cached after first load)
      const XLSX: any = await new Promise((resolve, reject) => {
        if ((window as any).XLSX) { resolve((window as any).XLSX); return; }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
        script.onload = () => resolve((window as any).XLSX);
        script.onerror = () => reject(new Error('Failed to load SheetJS'));
        document.head.appendChild(script);
      });

      // Build rows — clean human-readable columns
      const rows = filteredLeads.map((lead, idx) => ({
        '#': idx + 1,
        'Business Name': lead.businessName || '',
        'Person Name': lead.personName || '',
        'Phone': lead.contact || '',
        'Email': lead.email || '',
        'Location': lead.location || '',
        'Website': lead.website || '',
        'Status': lead.status || '',
        'Cold Called': lead.coldCalled ? 'Yes' : 'No',
        'Notes': (() => {
          try {
            const parsed = JSON.parse(lead.notes || '[]');
            if (Array.isArray(parsed)) return parsed.map((n: any) => n.text).join(' | ');
          } catch {}
          return lead.notes || '';
        })(),
        'Best Call Time': lead.bestCallTime || '',
        'Problem': lead.problem || '',
        'Solution': lead.solution || '',
        'Cold Call Questions': lead.coldCallQuestions || '',
        'Created At': lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      // Auto column widths
      const colWidths = Object.keys(rows[0] || {}).map(key => ({
        wch: Math.max(key.length, ...rows.map(r => String((r as any)[key] || '').length), 10)
      }));
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');

      // Build filename from active filters
      const nicheName = activeNicheId && activeNicheId !== 'all'
        ? (niches.find(n => n._id === activeNicheId)?.name || 'Niche')
        : 'All Niches';
      const date = new Date().toISOString().slice(0, 10);
      const filename = `TrackMe_${nicheName}_${activeStatus}_${date}.xlsx`.replace(/\s+/g, '_');

      XLSX.writeFile(workbook, filename);
      toast.success(`Exported ${filteredLeads.length} lead${filteredLeads.length > 1 ? 's' : ''} to ${filename}`);
    } catch (err: any) {
      toast.error(err?.message || 'Export failed');
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

  // Call-prep edits from the detail modal save quietly; the modal shows its own status.
  const handleSaveCallPrep = async (id: string, changes: Record<string, string>) => {
    await updateLead(id, changes);
    setLeads((prev) => prev.map((l) => (l._id === id ? { ...l, ...changes } : l)));
  };

  const openNotes = (lead: any) => {
    setNotesLead(lead);
    setIsNotesOpen(true);
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

      {/* Status segmented control */}
      <div role="tablist" aria-label="Lead status" className="rounded-xl bg-slate-200/50 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 p-1">
        <div className="flex overflow-x-auto scrollbar-hide gap-0.5 w-full sm:grid sm:grid-cols-8">
          {STATUS_TABS.map((tab) => {
            const count = statusCounts[tab.value] ?? 0;
            const isActive = activeStatus === tab.value;
            return (
              <button
                key={tab.value}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveStatus(tab.value)}
                className={cn(
                  'flex shrink-0 items-center justify-center gap-1.5 px-2.5 h-8 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all duration-150',
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-card'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-800/50'
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', tab.dot, !isActive && 'opacity-70')} />
                <span className="truncate">{tab.label}</span>
                <span className={cn(
                  'rounded-md px-1.5 min-w-[1.25rem] text-[10px] font-semibold leading-[1.125rem] tabular-nums',
                  isActive
                    ? 'bg-clay-600 text-white dark:bg-clay-500 dark:text-slate-950'
                    : 'bg-slate-900/[0.06] dark:bg-white/[0.07] text-slate-500 dark:text-slate-400'
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table surface: toolbar + leads */}
      <div className="flex-1 surface overflow-hidden flex flex-col min-h-0">
        <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between px-3 py-2.5 border-b border-slate-200/80 dark:border-slate-800">
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              type="search"
              aria-label="Search leads"
              placeholder="Search business, person or location"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-slate-50 dark:bg-slate-850"
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-1.5 w-full sm:w-auto">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleExcelImport}
            />

            {lastImportedLeadIds.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndoLastImport}
                disabled={isUndoingImport || isImporting}
                className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                title={`Delete the ${lastImportedLeadIds.length} leads created by the last import`}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                {isUndoingImport ? 'Undoing' : `Undo import (${lastImportedLeadIds.length})`}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="h-8 text-xs"
              title="Import leads from .xlsx, .xls or .csv"
            >
              {isImporting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
              {isImporting ? 'Importing' : 'Import'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExcelExport}
              disabled={filteredLeads.length === 0}
              className="h-8 text-xs"
              title={filteredLeads.length > 0 ? `Export ${filteredLeads.length} visible lead${filteredLeads.length > 1 ? 's' : ''} to Excel` : 'No leads to export'}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export
              <span className="ml-1.5 text-slate-400 tabular-nums">{filteredLeads.length}</span>
            </Button>

            {isAddingLeadRow ? (
              <Button variant="outline" size="sm" onClick={() => setIsAddingLeadRow(false)} className="h-8 text-xs">
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel new row
              </Button>
            ) : (
              <Button size="sm" onClick={() => setIsAddingLeadRow(true)} className="h-8 text-xs px-3.5">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add lead
              </Button>
            )}
          </div>
        </div>

        <LeadTable
          leads={filteredLeads}
          isLoading={isLoading}
          onUpdateLead={handleUpdateLeadInline}
          onDeleteLead={handleDeleteLead}
          onViewNotes={openNotes}
          onBookAppointment={(lead) => { setBookApptLead(lead); setIsBookApptOpen(true); }}
          onEdit={(lead) => { setEditingLead(lead); setIsLeadFormOpen(true); }}
          onOpenLead={(lead) => setDetailLeadId(lead._id)}
          activeLeadId={detailLeadId}
          isAddingRow={isAddingLeadRow}
          onSaveNewLead={handleSaveInlineNewLead}
          onCancelNewLead={() => setIsAddingLeadRow(false)}
        />
      </div>

      <LeadDetailDialog
        lead={detailLead}
        open={!!detailLead}
        onClose={() => setDetailLeadId(null)}
        onSave={handleSaveCallPrep}
        onOpenNotes={openNotes}
        onEdit={(lead) => { setEditingLead(lead); setIsLeadFormOpen(true); }}
        onBookAppointment={(lead) => { setBookApptLead(lead); setIsBookApptOpen(true); }}
      />

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
