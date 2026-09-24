import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

interface NotesModalProps {
  open: boolean;
  onClose: () => void;
  lead: any;
  onSave: (id: string, data: any) => void;
}

export default function NotesModal({ open, onClose, lead, onSave }: NotesModalProps) {
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');

  useEffect(() => {
    if (lead) {
      setNotes(lead.notes || '');
      if (lead.followUp) {
        setFollowUpDate(lead.followUp.date ? new Date(lead.followUp.date).toISOString().split('T')[0] : '');
        setFollowUpNotes(lead.followUp.notes || '');
      } else {
        setFollowUpDate('');
        setFollowUpNotes('');
      }
    }
  }, [lead, open]);

  const handleSave = () => {
    if (!lead) return;
    const updates: any = { notes };
    
    if (followUpDate || followUpNotes) {
      updates.followUp = {
        date: followUpDate ? new Date(followUpDate).toISOString() : null,
        notes: followUpNotes
      };
      // Auto update status if a follow up is set and status isn't already advanced
      if (followUpDate && ['New Lead', 'No Answer'].includes(lead.status)) {
        updates.status = 'Follow Up';
      }
    }
    
    onSave(lead._id, updates);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Notes for {lead?.businessName || 'Lead'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="generalNotes">General Notes</Label>
            <Textarea 
              id="generalNotes" 
              rows={4} 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              placeholder="Add conversation details, requirements, etc..."
            />
          </div>

          <div className="border-t border-border pt-4 space-y-4">
            <h4 className="text-sm font-semibold">Follow Up</h4>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="followUpDate">Date</Label>
                <Input 
                  id="followUpDate" 
                  type="date" 
                  value={followUpDate} 
                  onChange={(e) => setFollowUpDate(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="followUpNotes">Action / Context</Label>
                <Input 
                  id="followUpNotes" 
                  placeholder="e.g. Call back to discuss pricing" 
                  value={followUpNotes} 
                  onChange={(e) => setFollowUpNotes(e.target.value)} 
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-lg">Cancel</Button>
          <Button onClick={handleSave} className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm shadow-slate-900/10 font-semibold rounded-lg">Save Notes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
