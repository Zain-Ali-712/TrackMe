import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toDateTimeLocal } from '@/components/common/MultiNotesDialog';

interface BookAppointmentDialogProps {
  open: boolean;
  onClose: () => void;
  lead: any;
  onSubmit: (data: any) => void;
}

export default function BookAppointmentDialog({ open, onClose, lead, onSubmit }: BookAppointmentDialogProps) {
  const [dateTime, setDateTime] = useState('');
  const [duration, setDuration] = useState('30');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      if (lead?.followUpDate) {
        setDateTime(toDateTimeLocal(lead.followUpDate));
      } else {
        // Default to tomorrow at 10:00 AM local time
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        setDateTime(toDateTimeLocal(tomorrow));
      }
      setDuration('30');
      setNotes('');
    }
  }, [open, lead]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateTime) return;
    
    onSubmit({
      dateTime: new Date(dateTime).toISOString(),
      duration: parseInt(duration),
      status: 'Scheduled',
      notes: notes.trim()
    });
    
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">Book Appointment</DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Schedule a meeting with <strong className="text-slate-800 dark:text-slate-200">{lead?.businessName || lead?.personName || 'this lead'}</strong>.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="datetime" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Date &amp; Time *
            </Label>
            <Input 
              id="datetime" 
              type="datetime-local" 
              required
              value={dateTime} 
              onChange={(e) => setDateTime(e.target.value)} 
              className="text-xs bg-slate-50/60 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700"
            />
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="duration" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Duration (minutes)
            </Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger id="duration" className="text-xs h-8 bg-slate-50/60 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="apptNotes" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Meeting Notes / Agenda (Optional)
            </Label>
            <Textarea 
              id="apptNotes" 
              rows={3} 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              placeholder="E.g. Discuss SEO packages, demo software, contract terms..."
              className="text-xs bg-slate-50/60 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700"
            />
          </div>

          <DialogFooter className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-lg text-xs h-8 px-3">
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs h-8 px-3.5 rounded-lg shadow-sm">
              Book Meeting
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
