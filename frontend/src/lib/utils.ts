import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const STATUS_COLORS: Record<string, { bg: string, text: string, border: string, dot: string }> = {
  'New Lead': { bg: "bg-slate-100 dark:bg-slate-800/70", text: "text-slate-800 dark:text-slate-200", border: "border-slate-300/80 dark:border-slate-700", dot: "bg-slate-500" },
  'No Answer': { bg: "bg-slate-50 dark:bg-slate-900/60", text: "text-slate-600 dark:text-slate-400", border: "border-slate-200 dark:border-slate-800", dot: "bg-slate-400" },
  'Not Interested': { bg: "bg-rose-50/80 dark:bg-rose-950/30", text: "text-rose-700 dark:text-rose-300", border: "border-rose-200/80 dark:border-rose-900/40", dot: "bg-rose-500" },
  'Callback': { bg: "bg-amber-50/80 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200/80 dark:border-amber-900/40", dot: "bg-amber-500" },
  'Follow Up': { bg: "bg-sky-50/80 dark:bg-sky-950/30", text: "text-sky-700 dark:text-sky-300", border: "border-sky-200/80 dark:border-sky-900/40", dot: "bg-sky-500" },
  'Appointment': { bg: "bg-blue-50/90 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800/60", dot: "bg-blue-600" },
  'Closed': { bg: "bg-emerald-50/80 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200/80 dark:border-emerald-900/40", dot: "bg-emerald-500" },
  'DNC': { bg: "bg-red-50/80 dark:bg-red-950/30", text: "text-red-700 dark:text-red-300", border: "border-red-200/80 dark:border-red-900/40", dot: "bg-red-500" }
};

export const APPOINTMENT_STATUS_COLORS: Record<string, { bg: string, text: string, border: string, dot: string }> = {
  'Scheduled': { bg: "bg-blue-50/90 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800/60", dot: "bg-blue-600" },
  'Completed': { bg: "bg-emerald-50/80 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200/80 dark:border-emerald-900/40", dot: "bg-emerald-500" },
  'No Show': { bg: "bg-slate-100 dark:bg-slate-800/60", text: "text-slate-700 dark:text-slate-300", border: "border-slate-300/70 dark:border-slate-700", dot: "bg-slate-400" },
  'Cancelled': { bg: "bg-rose-50/80 dark:bg-rose-950/30", text: "text-rose-700 dark:text-rose-300", border: "border-rose-200/80 dark:border-rose-900/40", dot: "bg-rose-500" },
  'Rescheduled': { bg: "bg-amber-50/80 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200/80 dark:border-amber-900/40", dot: "bg-amber-500" }
};

export function formatDate(dateString: string | Date) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

export function formatDateTime(dateString: string | Date) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

import {
  Utensils, Building2, Laptop, Activity, ShoppingBag, Sun, Folder,
  Briefcase, Target, Wrench, Users, Globe, Layers,
  Clock, Dumbbell, Droplets, HeartHandshake, PhoneCall,
  GraduationCap, Share2, Code2, BookOpen, Video, PenTool,
  Sparkles, Smartphone, Smile, Tv2, Moon, UtensilsCrossed,
  CheckSquare, type LucideIcon
} from 'lucide-react';

export const NICHE_ICON_MAP: Record<string, LucideIcon> = {
  'utensils': Utensils,
  'building': Building2,
  'laptop': Laptop,
  'activity': Activity,
  'shopping-bag': ShoppingBag,
  'sun': Sun,
  'folder': Folder,
  'briefcase': Briefcase,
  'target': Target,
  'wrench': Wrench,
  'users': Users,
  'globe': Globe,
  'layers': Layers,
};

export function getNicheIcon(iconKey?: string): LucideIcon {
  if (!iconKey) return Layers;
  const key = iconKey.toLowerCase().trim();
  return NICHE_ICON_MAP[key] || Layers;
}

export const HABIT_ICON_MAP: Record<string, LucideIcon> = {
  'wake up early (4)': Clock,
  'workout / rest': Dumbbell,
  'morning shower': Droplets,
  'namaz / dua': HeartHandshake,
  'coldcall / practice': PhoneCall,
  'lead generation': Users,
  'job search': Briefcase,
  'scholarships': GraduationCap,
  'linkedin hunt': Share2,
  'fyp development': Code2,
  'project dev': Laptop,
  'book reading': BookOpen,
  'learning videos': Video,
  'journaling': PenTool,
  'writing dreams': Sparkles,
  '5 prayers': Sun,
  'no doom scroll': Smartphone,
  'no disrespecting': Smile,
  'no movie / show': Tv2,
  'sleep on time': Moon,
  'calories surplus': UtensilsCrossed,
  'protein amount': Activity,
  // Key fallbacks
  'clock': Clock,
  'dumbbell': Dumbbell,
  'droplets': Droplets,
  'droplet': Droplets,
  'hearthandshake': HeartHandshake,
  'heart': HeartHandshake,
  'phonecall': PhoneCall,
  'phone': PhoneCall,
  'users': Users,
  'briefcase': Briefcase,
  'graduationcap': GraduationCap,
  'share2': Share2,
  'code2': Code2,
  'code': Code2,
  'laptop': Laptop,
  'bookopen': BookOpen,
  'book-open': BookOpen,
  'video': Video,
  'pentool': PenTool,
  'edit-3': PenTool,
  'sparkles': Sparkles,
  'sun': Sun,
  'smartphone': Smartphone,
  'smile': Smile,
  'tv2': Tv2,
  'moon': Moon,
  'utensilscrossed': UtensilsCrossed,
  'activity': Activity,
};

export function getHabitIcon(habitName?: string, iconKey?: string): LucideIcon {
  if (habitName) {
    const norm = habitName.toLowerCase().trim();
    if (HABIT_ICON_MAP[norm]) return HABIT_ICON_MAP[norm];
  }
  if (iconKey) {
    const key = iconKey.toLowerCase().trim();
    if (HABIT_ICON_MAP[key]) return HABIT_ICON_MAP[key];
  }
  return CheckSquare;
}


