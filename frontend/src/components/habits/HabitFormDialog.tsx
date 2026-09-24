import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Trash2, Clock, Activity, BookOpen, Calendar, DollarSign, Target, Shield, Zap, Edit3, Droplet, Heart, Smile, type LucideIcon
} from 'lucide-react';

interface HabitFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  habit?: any;
}

const ICON_PRESETS: { key: string, icon: LucideIcon }[] = [
  { key: 'clock', icon: Clock },
  { key: 'activity', icon: Activity },
  { key: 'book-open', icon: BookOpen },
  { key: 'calendar', icon: Calendar },
  { key: 'dollar-sign', icon: DollarSign },
  { key: 'target', icon: Target },
  { key: 'shield', icon: Shield },
  { key: 'zap', icon: Zap },
  { key: 'edit-3', icon: Edit3 },
  { key: 'droplet', icon: Droplet },
  { key: 'heart', icon: Heart },
  { key: 'smile', icon: Smile },
];

const COLOR_PRESETS = [
  { label: 'Emerald', value: '#10b981' },
  { label: 'Cobalt', value: '#2563eb' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Purple', value: '#8b5cf6' },
  { label: 'Rose', value: '#f43f5e' },
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Slate', value: '#475569' }
];

export default function HabitFormDialog({ open, onClose, onSubmit, onDelete, habit }: HabitFormDialogProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('zap');
  const [color, setColor] = useState('#10b981');
  const [targetDays, setTargetDays] = useState(7);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (habit) {
      setName(habit.name || '');
      setIcon(habit.icon || 'zap');
      setColor(habit.color || '#10b981');
      setTargetDays(habit.targetDaysPerWeek || 7);
    } else {
      setName('');
      setIcon('zap');
      setColor('#10b981');
      setTargetDays(7);
    }
  }, [habit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      await onSubmit({
        name: name.trim(),
        icon,
        color,
        targetDaysPerWeek: targetDays
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!habit?._id || !onDelete) return;
    if (window.confirm(`Are you sure you want to delete "${habit.name}" and its logs?`)) {
      try {
        setIsSubmitting(true);
        await onDelete(habit._id);
        onClose();
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
            {habit ? 'Edit Habit' : 'Create New Habit'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Habit Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Habit Name</label>
            <div className="flex gap-2">
              <div className="w-12 h-9 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                {(() => {
                  const CurrentIcon = ICON_PRESETS.find(p => p.key === icon)?.icon || Zap;
                  return <CurrentIcon className="h-4 w-4 text-slate-700 dark:text-slate-300" />;
                })()}
              </div>
              <Input
                placeholder="e.g. 30 Min Outreach, Daily Gym..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-9 text-xs border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>

          {/* Quick Icon Presets */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Select Icon</label>
            <div className="grid grid-cols-6 gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              {ICON_PRESETS.map((item) => {
                const IconComponent = item.icon;
                const isSelected = icon === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setIcon(item.key)}
                    className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
                      isSelected 
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Accent */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Accent Color</label>
            <div className="flex items-center gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  style={{ backgroundColor: c.value }}
                  className={`h-6 w-6 rounded-full transition-transform ${
                    color === c.value ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-110' : 'opacity-80 hover:opacity-100'
                  }`}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex sm:justify-between items-center gap-2">
            {habit && onDelete ? (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="h-8.5 px-3 text-xs gap-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </Button>
            ) : <div />}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="h-8.5 px-3 text-xs rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="h-8.5 px-4 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 rounded-lg shadow-sm"
              >
                {habit ? 'Save Changes' : 'Create Habit'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
