import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LeadFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  lead?: any;
  nicheId?: string;
}

export default function LeadFormDialog({ open, onClose, onSubmit, lead, nicheId }: LeadFormDialogProps) {
  const [formData, setFormData] = useState({
    businessName: '',
    personName: '',
    contact: '',
    email: '',
    website: '',
    location: '',
    status: 'New Lead',
    notes: ''
  });

  useEffect(() => {
    if (open) {
      if (lead) {
        setFormData({
          businessName: lead.businessName || '',
          personName: lead.personName || '',
          contact: lead.contact || '',
          email: lead.email || '',
          website: lead.website || '',
          location: lead.location || '',
          status: lead.status || 'New Lead',
          notes: lead.notes || ''
        });
      } else {
        // Always reset to empty when opening for a new lead
        setFormData({
          businessName: '',
          personName: '',
          contact: '',
          email: '',
          website: '',
          location: '',
          status: 'New Lead',
          notes: ''
        });
      }
    }
  }, [lead, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleStatusChange = (val: string) => {
    setFormData(prev => ({ ...prev, status: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{lead ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name *</Label>
              <Input id="businessName" name="businessName" required value={formData.businessName} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="personName">Contact Person</Label>
              <Input id="personName" name="personName" value={formData.personName} onChange={handleChange} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contact">Phone Number</Label>
              <Input id="contact" name="contact" value={formData.contact} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" name="email" value={formData.email} onChange={handleChange} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" name="website" placeholder="https://" value={formData.website} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location / Address</Label>
              <Input id="location" name="location" value={formData.location} onChange={handleChange} />
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
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
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={3} value={formData.notes} onChange={handleChange} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="rounded-lg">Cancel</Button>
            <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 shadow-sm shadow-slate-900/10 font-semibold rounded-lg">
              {lead ? 'Save Changes' : 'Create Lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
