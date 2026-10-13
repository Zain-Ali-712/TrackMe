import { Calendar, ChevronRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

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
  


  return (
    <section className="surface flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-5 sm:px-6 pt-5 pb-4">
        <div>
          <h3 className="font-display text-xl font-medium text-slate-900 dark:text-slate-50">Upcoming calls</h3>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Next scheduled appointments</p>
        </div>
        <span className="text-[11px] font-semibold min-w-[1.5rem] h-6 px-2 grid place-items-center rounded-md bg-clay-50 text-clay-700 dark:bg-clay-950/50 dark:text-clay-300 tabular-nums">
          {appointments?.length || 0}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-[220px] border-t border-slate-200/70 dark:border-slate-800">
        {(!appointments || appointments.length === 0) ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <span className="grid place-items-center h-11 w-11 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
              <Calendar className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <p className="text-[13px] font-medium text-slate-700 dark:text-slate-200">No calls scheduled</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[220px]">Set a lead's status to Appointment to book one.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200/60 dark:divide-slate-800">
            {appointments.map((apt) => {
              const d = new Date(apt.dateTime);
              return (
                <li key={apt._id} className="px-5 sm:px-6 py-3 flex items-center gap-3.5">
                  <div className="w-11 shrink-0 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-center bg-white dark:bg-slate-900">
                    <div className="text-[9.5px] font-semibold uppercase tracking-wide bg-clay-600 dark:bg-clay-500 text-white dark:text-slate-950 py-px">
                      {d.toLocaleDateString([], { month: 'short' })}
                    </div>
                    <div className="font-display text-lg leading-7 text-slate-900 dark:text-slate-50 tabular-nums">{d.getDate()}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-50 truncate">
                      {apt.lead?.businessName || apt.lead?.personName || 'Unnamed lead'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
                      <Clock className="h-3 w-3 shrink-0" />
                      <span className="tabular-nums">{formatTime(apt.dateTime)}</span>
                      {apt.lead?.personName && <><span aria-hidden className="text-slate-300 dark:text-slate-600">/</span><span className="truncate">{apt.lead.personName}</span></>}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Link
        to="/dashboard/appointments"
        className="flex items-center justify-center gap-1 px-4 py-3 text-xs font-medium text-clay-700 dark:text-clay-300 border-t border-slate-200/70 dark:border-slate-800 hover:bg-clay-50/60 dark:hover:bg-clay-950/20 transition-colors"
      >
        All appointments
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}
