import React from 'react';
import { Calendar, CalendarCheck2, ChevronRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface UpcomingAppointmentsProps {
  appointments: Array<{
    _id: string;
    lead: { businessName: string; personName: string };
    dateTime: string;
    status: string;
  }>;
}

export default function UpcomingAppointments({ appointments }: UpcomingAppointmentsProps) {
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getInitials = (name?: string) => {
    if (!name) return 'LD';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_1px_3px_0_rgba(15,23,42,0.08),0_1px_2px_-1px_rgba(15,23,42,0.06)] hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)] transition-all duration-200 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between p-5 pb-3 border-b border-slate-200/70 dark:border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <CalendarCheck2 className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Upcoming Calls</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Scheduled appointments</p>
          </div>
        </div>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 tabular-nums">
          {appointments?.length || 0}
        </span>
      </div>
      
      <div className="flex-1 p-0 overflow-y-auto min-h-[220px]">
        {(!appointments || appointments.length === 0) ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2 text-slate-400">
              <Calendar className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No calls scheduled</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Book from the leads table to schedule meetings.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {appointments.map((apt) => (
              <div key={apt._id} className="p-3.5 px-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                    {getInitials(apt.lead?.businessName || apt.lead?.personName)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                      {apt.lead?.businessName || apt.lead?.personName || 'Unnamed Prospect'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {apt.lead?.personName || 'Direct contact'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 px-2.5 py-1 rounded-md shrink-0">
                  <Clock className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  <span>{formatDate(apt.dateTime)}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">{formatTime(apt.dateTime)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-slate-100 dark:border-slate-800/60 mt-auto bg-slate-50/50 dark:bg-slate-900/30">
        <Link 
          to="/dashboard/appointments" 
          className="flex items-center justify-center gap-1.5 w-full py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          Manage all appointments
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
