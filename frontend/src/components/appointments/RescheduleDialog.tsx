import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CalendarClock, Calendar, Clock } from 'lucide-react';

interface RescheduleDialogProps {
  open: boolean;
  onClose: () => void;
  appointment: any;
  onConfirm: (newDateTime: string, reason?: string) => Promise<void> | void;
}

export default function RescheduleDialog({
  open,
  onClose,
  appointment,
  onConfirm
}: RescheduleDialogProps) {
  const [dateTime, setDateTime] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && appointment) {
      // Default to current date/time or existing dateTime
      if (appointment.dateTime) {
        const d = new Date(appointment.dateTime);
        // format to YYYY-MM-DDTHH:mm
        const pad = (n: number) => n.toString().padStart(2, '0');
        const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        setDateTime(formatted);
      } else {
        setDateTime('');
      }
      setReason('');
      setIsSubmitting(false);
    }
  }, [open, appointment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateTime) return;
    try {
      setIsSubmitting(true);
      await onConfirm(new Date(dateTime).toISOString(), reason.trim());
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const leadName = appointment?.lead?.businessName || appointment?.lead?.personName || 'Meeting';
  const currentFormatted = appointment?.dateTime 
    ? new Date(appointment.dateTime).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' + new Date(appointment.dateTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : 'Not set';

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[440px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span>Reschedule Appointment</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Set a new meeting time for <strong className="text-slate-800 dark:text-slate-200">{leadName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Current appointment info banner */}
          <div className="p-2.5 rounded-lg bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 text-xs flex items-center justify-between">
            <span className="text-purple-700 dark:text-purple-300 font-semibold">Previously Scheduled:</span>
            <span className="font-bold text-purple-900 dark:text-purple-200 tabular-nums">{currentFormatted}</span>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rescheduleDateTime" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              New Date &amp; Time *
            </Label>
            <Input
              id="rescheduleDateTime"
              type="datetime-local"
              required
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="text-xs bg-slate-50/60 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700 focus:border-purple-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rescheduleReason" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Reschedule Reason / Agenda Update (Optional)
            </Label>
            <Textarea
              id="rescheduleReason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="E.g. Client requested Monday afternoon instead, follow-up demo..."
              className="text-xs bg-slate-50/60 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700 focus:border-purple-500"
            />
          </div>

          <DialogFooter className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs h-8 px-3 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!dateTime || isSubmitting}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-8 px-3.5 rounded-lg shadow-sm"
            >
              Confirm Reschedule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
