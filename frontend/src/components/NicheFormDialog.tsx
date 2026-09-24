import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface NicheFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  niche?: any;
}

const PRESET_COLORS = [
  { name: 'violet', value: '#8b5cf6' },
  { name: 'blue', value: '#3b82f6' },
  { name: 'emerald', value: '#10b981' },
  { name: 'amber', value: '#f59e0b' },
  { name: 'rose', value: '#f43f5e' },
  { name: 'cyan', value: '#06b6d4' },
  { name: 'orange', value: '#f97316' },
  { name: 'slate', value: '#64748b' },
];

import {
  Briefcase, Building2, Laptop, Utensils, Activity, ShoppingBag, Sun, Wrench, Target, Folder, LucideIcon
} from 'lucide-react';

const PRESET_ICONS: { key: string, label: string, icon: LucideIcon }[] = [
  { key: 'briefcase', label: 'Agency', icon: Briefcase },
  { key: 'building', label: 'Real Estate', icon: Building2 },
  { key: 'laptop', label: 'SaaS / Tech', icon: Laptop },
  { key: 'utensils', label: 'Restaurant', icon: Utensils },
  { key: 'activity', label: 'Fitness', icon: Activity },
  { key: 'shopping-bag', label: 'E-Com', icon: ShoppingBag },
  { key: 'sun', label: 'Solar / Green', icon: Sun },
  { key: 'wrench', label: 'Contractors', icon: Wrench },
  { key: 'target', label: 'Marketing', icon: Target },
  { key: 'folder', label: 'General', icon: Folder },
];

export default function NicheFormDialog({ open, onClose, onSubmit, niche }: NicheFormDialogProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('briefcase');
  const [color, setColor] = useState('violet');

  useEffect(() => {
    if (niche) {
      setName(niche.name || '');
      setIcon(niche.icon || 'briefcase');
      setColor(niche.color || 'violet');
    } else {
      setName('');
      setIcon('briefcase');
      setColor('violet');
    }
  }, [niche, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    onSubmit({ name, icon, color });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{niche ? 'Edit Niche' : 'Create New Niche'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-3">
          <div className="space-y-2">
            <Label htmlFor="nicheName">Niche Name *</Label>
            <Input 
              id="nicheName" 
              required
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Dentists, SaaS, Roofing..."
            />
          </div>
          
          <div className="space-y-2">
            <Label>Select Icon</Label>
            <div className="grid grid-cols-5 gap-2 pt-1">
              {PRESET_ICONS.map((item) => {
                const IconComp = item.icon;
                const isSelected = icon === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setIcon(item.key)}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded-xl border transition-all text-xs",
                      isSelected
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                    )}
                    title={item.label}
                  >
                    <IconComp className="h-4 w-4 mb-1" />
                    <span className="text-[9px] font-medium truncate max-w-full">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Color Theme</Label>
            <div className="flex flex-wrap gap-2 pt-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setColor(c.name)}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all",
                    color === c.name ? "border-foreground scale-110 shadow-sm" : "border-transparent hover:scale-105"
                  )}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-lg">Cancel</Button>
            <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm shadow-slate-900/10 font-semibold rounded-lg">
              {niche ? 'Save Changes' : 'Create Niche'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
