import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Trash2, Clock, CheckCircle, XCircle, FileText, CalendarClock, 
  Search, Phone, Mail, MapPin, Globe, LayoutGrid, Table, User, AlertCircle
} from 'lucide-react';
import { fetchAppointments, updateAppointment, deleteAppointment, fetchNiches } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MultiNotesDialog, { getLatestNoteText, getNotesCount, parseNoteEntries, serializeNoteEntries } from '@/components/common/MultiNotesDialog';
import RescheduleDialog from '@/components/appointments/RescheduleDialog';
import { cn, getNicheIcon } from '@/lib/utils';
import toast from 'react-hot-toast';

const STATUS_TABS = [
  { value: 'all',         label: 'All Calls',   dot: 'bg-slate-400' },
  { value: 'upcoming',    label: 'Upcoming',    dot: 'bg-sky-500' },
  { value: 'Scheduled',   label: 'Scheduled',   dot: 'bg-amber-500' },
  { value: 'Completed',   label: 'Completed',   dot: 'bg-emerald-500' },
  { value: 'Rescheduled', label: 'Rescheduled', dot: 'bg-purple-500' },
  { value: 'No Show',     label: 'No Show',     dot: 'bg-slate-500' },
  { value: 'Cancelled',   label: 'Cancelled',   dot: 'bg-rose-500' },
];

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [niches, setNiches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtering states
  const [activeNicheId, setActiveNicheId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Multi-note dialog state
  const [notesApt, setNotesApt] = useState<any | null>(null);
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  // Reschedule dialog state
  const [rescheduleApt, setRescheduleApt] = useState<any | null>(null);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);

  useEffect(() => {
    Promise.all([loadAppointments(), loadNiches()]);
  }, []);

  const loadAppointments = async () => {
    try {
      setIsLoading(true);
      const data = await fetchAppointments();
      setAppointments(data);
    } catch {
      toast.error('Failed to load appointments');
    } finally {
      setIsLoading(false);
    }
  };

  const loadNiches = async () => {
    try {
      const data = await fetchNiches();
      setNiches(data);
    } catch {}
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    if (status === 'Rescheduled') {
      const apt = appointments.find(a => a._id === id);
      if (apt) {
        setRescheduleApt(apt);
        setIsRescheduleOpen(true);
        return;
      }
    }

    try {
      setAppointments(appointments.map(a => a._id === id ? { ...a, status } : a));
      await updateAppointment(id, { status });
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
      loadAppointments(); // Revert
    }
  };

  const handleConfirmReschedule = async (newDateTime: string, reason?: string) => {
    if (!rescheduleApt) return;
    try {
      const updates: any = {
        status: 'Rescheduled',
        dateTime: newDateTime
      };
      if (reason) {
        const existingNotes = parseNoteEntries(rescheduleApt.notes, rescheduleApt.lead?.createdAt || rescheduleApt.createdAt);
        existingNotes.push({
          id: `reschedule-${Date.now()}`,
          text: `Rescheduled to ${new Date(newDateTime).toLocaleString()}: ${reason}`,
          createdAt: new Date().toISOString()
        });
        updates.notes = serializeNoteEntries(existingNotes);
      }
      await updateAppointment(rescheduleApt._id, updates);
      toast.success('Appointment rescheduled');
      setRescheduleApt(null);
      setIsRescheduleOpen(false);
      loadAppointments();
    } catch {
      toast.error('Failed to reschedule appointment');
    }
  };

  const handleSaveNotes = async (serializedNotes: string) => {
    if (!notesApt) return;
    try {
      await updateAppointment(notesApt._id, { notes: serializedNotes });
      setAppointments(appointments.map(a => a._id === notesApt._id ? { ...a, notes: serializedNotes } : a));
      toast.success('Notes saved');
    } catch {
      toast.error('Failed to save notes');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Cancel and delete this appointment?')) return;
    try {
      await deleteAppointment(id);
      setAppointments(appointments.filter(a => a._id !== id));
      toast.success('Appointment deleted');
    } catch {
      toast.error('Failed to delete appointment');
    }
  };

  // Status breakdown counts
  const statusCounts = useMemo(() => {
    const now = Date.now();
    const counts: Record<string, number> = {
      all: appointments.length,
      upcoming: 0,
      Scheduled: 0,
      Completed: 0,
      Rescheduled: 0,
      'No Show': 0,
      Cancelled: 0,
    };

    appointments.forEach(a => {
      if ((a.status === 'Scheduled' || a.status === 'Rescheduled') && new Date(a.dateTime).getTime() >= now) {
        counts.upcoming++;
      }
      if (counts[a.status] !== undefined) {
        counts[a.status]++;
      }
    });

    return counts;
  }, [appointments]);

  // Niche breakdown counts
  const nicheCounts = useMemo(() => {
    const counts: Record<string, number> = { all: appointments.length };
    appointments.forEach(a => {
      const nId = a.niche?._id || a.niche;
      if (nId) counts[nId] = (counts[nId] || 0) + 1;
    });
    return counts;
  }, [appointments]);

  // Filtered appointments
  const filteredAppointments = useMemo(() => {
    const now = Date.now();
    const q = search.trim().toLowerCase();

    return appointments.filter(a => {
      // 1. Niche filter
      if (activeNicheId !== 'all') {
        const nId = a.niche?._id || a.niche;
        if (nId !== activeNicheId) return false;
      }

      // 2. Status filter
      if (statusFilter === 'upcoming') {
        const isFuture = new Date(a.dateTime).getTime() >= now;
        if (!((a.status === 'Scheduled' || a.status === 'Rescheduled') && isFuture)) {
          return false;
        }
      } else if (statusFilter !== 'all') {
        if (a.status !== statusFilter) return false;
      }

      // 3. Search query
      if (q) {
        const bName = a.lead?.businessName?.toLowerCase() || '';
        const pName = a.lead?.personName?.toLowerCase() || '';
        const contact = a.lead?.contact?.toLowerCase() || '';
        const email = a.lead?.email?.toLowerCase() || '';
        const loc = a.lead?.location?.toLowerCase() || '';
        const notesStr = typeof a.notes === 'string' ? a.notes.toLowerCase() : '';
        if (
          !bName.includes(q) &&
          !pName.includes(q) &&
          !contact.includes(q) &&
          !email.includes(q) &&
          !loc.includes(q) &&
          !notesStr.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [appointments, activeNicheId, statusFilter, search]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed': return <CheckCircle className="h-3.5 w-3.5 mr-1 text-emerald-500" />;
      case 'Cancelled': case 'No Show': return <XCircle className="h-3.5 w-3.5 mr-1 text-rose-500" />;
      case 'Rescheduled': return <CalendarClock className="h-3.5 w-3.5 mr-1 text-purple-500" />;
      default: return <Clock className="h-3.5 w-3.5 mr-1 text-amber-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Scheduled': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800/50';
      case 'Completed': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50';
      case 'Cancelled': return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800/50';
      case 'No Show': return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
      case 'Rescheduled': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800/50';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRelativeTime = (dateTimeStr: string) => {
    const target = new Date(dateTimeStr);
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return diffMs < 0 ? 'Earlier today' : 'Today';
    }
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 1) return `In ${diffDays} days`;
    return `${Math.abs(diffDays)} days ago`;
  };

  const getInitials = (name?: string) => {
    if (!name) return 'AP';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-3.5 min-h-0">
      {/* 1. TOP NICHE TABS (Matching Leads Pipeline Page) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setActiveNicheId('all')}
          className={cn(
            "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 border",
            activeNicheId === 'all'
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-sm shadow-slate-900/10"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-800"
          )}
        >
          <Globe className="h-3.5 w-3.5" />
          <span>All Niches</span>
          <span className={cn(
            "ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums",
            activeNicheId === 'all' ? "bg-white/20 text-white dark:bg-slate-800 dark:text-slate-200" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
          )}>
            {nicheCounts.all || 0}
          </span>
        </button>

        {niches.map((niche) => {
          const IconComponent = getNicheIcon(niche.icon);
          const count = nicheCounts[niche._id] || 0;
          const isActive = activeNicheId === niche._id;

          return (
            <button
              key={niche._id}
              onClick={() => setActiveNicheId(niche._id)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 border",
                isActive
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-sm shadow-slate-900/10"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-800"
              )}
            >
              <IconComponent className="h-3.5 w-3.5 shrink-0" style={{ color: isActive ? undefined : (niche.color || '#3b82f6') }} />
              <span>{niche.name}</span>
              <span className={cn(
                "ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums",
                isActive ? "bg-white/20 text-white dark:bg-slate-800 dark:text-slate-200" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. STATUS TABS BAR (Upcoming, Scheduled, Completed, etc.) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-1">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1 w-full">
          {STATUS_TABS.map((tab) => {
            const count = statusCounts[tab.value] ?? 0;
            const isActive = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
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

      {/* 3. TOOLBAR: Search + View Switcher */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search prospect, contact, note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50 rounded-lg focus-visible:ring-slate-900 dark:focus-visible:ring-slate-100"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Showing <strong className="text-slate-900 dark:text-white tabular-nums">{filteredAppointments.length}</strong> {filteredAppointments.length === 1 ? 'appointment' : 'appointments'}
          </span>

          {/* View Mode Toggle: Mini Cards vs Table */}
          <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('cards')}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all",
                viewMode === 'cards'
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
              title="Mini Cards Showcase"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all",
                viewMode === 'table'
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
              title="Table View"
            >
              <Table className="h-3.5 w-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. MAIN SHOWCASE: MINI CARDS OR TABLE */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-0.5">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Loading appointments...</div>
        ) : filteredAppointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 min-h-[300px]">
            <div className="bg-slate-100 dark:bg-slate-800 h-16 w-16 rounded-full flex items-center justify-center mb-3 text-slate-400">
              <Calendar className="h-7 w-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No appointments found</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs max-w-sm mt-1">
              {search || statusFilter !== 'all' || activeNicheId !== 'all'
                ? "Try clearing filters to see more appointments."
                : "Schedule a meeting with prospects from the Leads Pipeline table."}
            </p>
          </div>
        ) : viewMode === 'cards' ? (
          /* Mini Cards Grid Showcase */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 pb-4">
            {filteredAppointments.map((apt) => {
              const aptDate = new Date(apt.dateTime);
              const noteCount = getNotesCount(apt.notes);
              const latestNote = getLatestNoteText(apt.notes);
              const relativeTime = getRelativeTime(apt.dateTime);
              const NicheIcon = getNicheIcon(apt.niche?.icon);

              return (
                <div
                  key={apt._id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-[0_1px_3px_0_rgba(15,23,42,0.06)] hover:shadow-[0_4px_16px_rgba(15,23,42,0.08)] transition-all duration-200 flex flex-col justify-between gap-3 group relative"
                >
                  {/* Card Header: Scheduled Date & Time Pill + Niche */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                    {/* Date & Time (Clickable to Reschedule) */}
                    <button
                      onClick={() => {
                        setRescheduleApt(apt);
                        setIsRescheduleOpen(true);
                      }}
                      className="text-left group/time cursor-pointer hover:opacity-85 transition-opacity"
                      title="Click to reschedule date & time"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900 dark:text-white">
                        <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>{aptDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>{aptDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                          • {relativeTime}
                        </span>
                      </div>
                    </button>

                    {/* Niche Badge */}
                    {apt.niche && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      >
                        <NicheIcon className="h-3 w-3" style={{ color: apt.niche.color || '#3b82f6' }} />
                        <span>{apt.niche.name}</span>
                      </span>
                    )}
                  </div>

                  {/* Card Middle: Prospect Info + Contact Chips */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                        {getInitials(apt.lead?.businessName || apt.lead?.personName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate tracking-tight">
                          {apt.lead?.businessName || 'Unnamed Prospect'}
                        </h4>
                        {apt.lead?.personName && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center gap-1 mt-0.5">
                            <User className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{apt.lead.personName}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Contact details */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] pt-0.5">
                      {apt.lead?.contact && (
                        <a
                          href={`tel:${apt.lead.contact}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium border border-slate-200/60 dark:border-slate-700/60"
                        >
                          <Phone className="h-2.5 w-2.5" />
                          <span>{apt.lead.contact}</span>
                        </a>
                      )}
                      {apt.lead?.email && (
                        <a
                          href={`mailto:${apt.lead.email}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium border border-slate-200/60 dark:border-slate-700/60 truncate max-w-[190px]"
                          title={apt.lead.email}
                        >
                          <Mail className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">{apt.lead.email}</span>
                        </a>
                      )}
                      {apt.lead?.location && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-medium text-[10.5px]">
                          <MapPin className="h-2.5 w-2.5" />
                          <span>{apt.lead.location}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Dropdown Selector */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                    <span className="text-[11px] font-semibold text-slate-400">Meeting Status:</span>
                    <Select
                      value={apt.status}
                      onValueChange={(val) => handleUpdateStatus(apt._id, val)}
                    >
                      <SelectTrigger className="h-7 text-xs border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 focus:ring-0 px-2 shadow-none w-36 rounded-lg transition-colors">
                        <Badge className={`border font-semibold flex items-center shadow-none text-[11px] px-1.5 py-0 ${getStatusColor(apt.status)}`}>
                          {getStatusIcon(apt.status)}
                          <span>{apt.status}</span>
                        </Badge>
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl">
                        <SelectItem value="Scheduled" className="focus:bg-amber-50 dark:focus:bg-amber-950/40 focus:text-amber-800 dark:focus:text-amber-300 cursor-pointer">Scheduled</SelectItem>
                        <SelectItem value="Completed" className="focus:bg-emerald-50 dark:focus:bg-emerald-950/40 focus:text-emerald-800 dark:focus:text-emerald-300 cursor-pointer">Completed</SelectItem>
                        <SelectItem value="Cancelled" className="focus:bg-rose-50 dark:focus:bg-rose-950/40 focus:text-rose-800 dark:focus:text-rose-300 cursor-pointer">Cancelled</SelectItem>
                        <SelectItem value="No Show" className="focus:bg-slate-100 dark:focus:bg-slate-800/80 cursor-pointer">No Show</SelectItem>
                        <SelectItem value="Rescheduled" className="focus:bg-purple-50 dark:focus:bg-purple-950/40 focus:text-purple-800 dark:focus:text-purple-300 cursor-pointer">Rescheduled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Notes Preview Box (Clickable) */}
                  <button
                    onClick={() => {
                      setNotesApt(apt);
                      setIsNotesOpen(true);
                    }}
                    className="p-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 text-left transition-all group/notes cursor-pointer"
                    title="Click to view full notes history or add notes"
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-semibold">
                        <FileText className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                        Meeting Notes
                      </span>
                      <span className="px-1.5 py-0.2 rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[9px] font-bold tabular-nums">
                        {noteCount} {noteCount === 1 ? 'note' : 'notes'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium line-clamp-2 leading-relaxed">
                      {latestNote || <span className="italic text-slate-400">Click to write call takeaways, agenda, or objections...</span>}
                    </p>
                  </button>

                  {/* Card Actions Footer */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setRescheduleApt(apt);
                        setIsRescheduleOpen(true);
                      }}
                      className="h-7 px-2 text-[11px] text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 font-semibold rounded-lg"
                    >
                      <CalendarClock className="h-3.5 w-3.5 mr-1" />
                      Reschedule
                    </Button>

                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setNotesApt(apt);
                          setIsNotesOpen(true);
                        }}
                        className="h-7 px-2 text-[11px] text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-semibold rounded-lg"
                      >
                        <FileText className="h-3.5 w-3.5 mr-1" />
                        Notes
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(apt._id)}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                        title="Delete Appointment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View Alternative */
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-[0_1px_3px_0_rgba(15,23,42,0.06)] overflow-hidden">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-[11px] font-bold uppercase tracking-wider bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th className="px-4 py-3 min-w-[160px]">Date &amp; Time</th>
                  <th className="px-4 py-3 min-w-[200px]">Lead / Business</th>
                  <th className="px-4 py-3 w-44">Status</th>
                  <th className="px-4 py-3">Notes &amp; History</th>
                  <th className="px-4 py-3 w-24 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredAppointments.map((apt) => {
                  const aptDate = new Date(apt.dateTime);
                  const noteCount = getNotesCount(apt.notes);
                  const latestNote = getLatestNoteText(apt.notes);

                  return (
                    <tr key={apt._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setRescheduleApt(apt);
                            setIsRescheduleOpen(true);
                          }}
                          className="text-left group/time p-1 -m-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors w-full cursor-pointer"
                          title="Click to edit or reschedule appointment date & time"
                        >
                          <div className="font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                            <span>{aptDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <CalendarClock className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover/time:opacity-100 transition-opacity shrink-0" />
                          </div>
                          <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 font-bold flex items-center gap-1">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span>{aptDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {apt.lead?.businessName || apt.lead?.personName || 'Unknown Lead'}
                        </div>
                        {apt.lead?.personName && apt.lead?.businessName && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                            {apt.lead.personName}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={apt.status}
                          onValueChange={(val) => handleUpdateStatus(apt._id, val)}
                        >
                          <SelectTrigger className="h-8 border-none bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/90 focus:ring-0 px-2 py-0 shadow-none -mx-2 w-[160px] rounded-lg transition-colors">
                            <Badge className={`border font-semibold flex items-center shadow-none text-xs ${getStatusColor(apt.status)}`}>
                              {getStatusIcon(apt.status)}
                              <span>{apt.status}</span>
                            </Badge>
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl">
                            <SelectItem value="Scheduled">Scheduled</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                            <SelectItem value="Cancelled">Cancelled</SelectItem>
                            <SelectItem value="No Show">No Show</SelectItem>
                            <SelectItem value="Rescheduled">Rescheduled</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      {/* Editable Notes Cell */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setNotesApt(apt);
                            setIsNotesOpen(true);
                          }}
                          className="text-left w-full max-w-md p-1.5 -mx-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors group flex items-start justify-between gap-2 cursor-pointer"
                          title="Click to view, add, or edit notes with date history"
                        >
                          <div className="flex-1 min-w-0">
                            {latestNote ? (
                              <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-1 font-medium">
                                {latestNote}
                              </p>
                            ) : (
                              <p className="text-xs text-slate-400 italic font-medium">Add note...</p>
                            )}
                            <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                              <FileText className="h-3 w-3" />
                              <span>{noteCount} {noteCount === 1 ? 'note' : 'notes'}</span>
                            </div>
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setRescheduleApt(apt);
                              setIsRescheduleOpen(true);
                            }}
                            className="h-8 w-8 p-0 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg"
                            title="Reschedule Appointment"
                          >
                            <CalendarClock className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(apt._id)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                            title="Delete Appointment"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Multi-Note History & Adding Modal */}
      <MultiNotesDialog
        open={isNotesOpen}
        onClose={() => {
          setIsNotesOpen(false);
          setNotesApt(null);
        }}
        title={`Notes for ${notesApt?.lead?.businessName || notesApt?.lead?.personName || 'Appointment'}`}
        subtitle={notesApt ? `Scheduled for ${new Date(notesApt.dateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}` : undefined}
        initialNotesRaw={notesApt?.notes}
        fallbackDate={notesApt?.lead?.createdAt || notesApt?.createdAt || notesApt?.dateTime}
        onSave={handleSaveNotes}
      />

      {/* Reschedule Modal */}
      <RescheduleDialog
        open={isRescheduleOpen}
        onClose={() => {
          setIsRescheduleOpen(false);
          setRescheduleApt(null);
        }}
        appointment={rescheduleApt}
        onConfirm={handleConfirmReschedule}
      />
    </div>
  );
}
