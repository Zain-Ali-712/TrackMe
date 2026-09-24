import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Calendar, Edit2, Check, X, Plus, FileText, Clock } from 'lucide-react';

export interface NoteEntry {
  id: string;
  text: string;
  createdAt: string; // ISO date string
}

export function toDateTimeLocal(dateInput?: string | Date): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function parseNoteEntries(rawNotes?: string | null, fallbackDate?: string | null): NoteEntry[] {
  if (!rawNotes || typeof rawNotes !== 'string' || !rawNotes.trim()) return [];
  try {
    const parsed = JSON.parse(rawNotes);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item, idx) => {
          let dateStr = item.createdAt;
          // If it was tagged legacy-init and we have a better fallback date, restore original date
          if ((!dateStr || item.id === 'legacy-init') && fallbackDate) {
            dateStr = fallbackDate;
          }
          return {
            id: item.id || `note-${idx}-${Date.now()}`,
            text: typeof item === 'string' ? item : (item.text || ''),
            createdAt: dateStr || fallbackDate || new Date().toISOString()
          };
        })
        .filter(n => n.text.trim().length > 0);
    }
  } catch {
    // Non-JSON legacy string
  }

  return [{
    id: 'legacy-init',
    text: rawNotes.trim(),
    createdAt: fallbackDate || new Date().toISOString()
  }];
}

export function serializeNoteEntries(notes: NoteEntry[]): string {
  return JSON.stringify(notes);
}

export function getLatestNoteText(rawNotes?: string | null): string {
  const list = parseNoteEntries(rawNotes);
  if (list.length === 0) return '';
  return list[list.length - 1].text;
}

export function getNotesCount(rawNotes?: string | null): number {
  return parseNoteEntries(rawNotes).length;
}

interface MultiNotesDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  initialNotesRaw?: string | null;
  fallbackDate?: string | null;
  onSave: (serialized: string) => Promise<void> | void;
}

export default function MultiNotesDialog({
  open,
  onClose,
  title,
  subtitle,
  initialNotesRaw,
  fallbackDate,
  onSave
}: MultiNotesDialogProps) {
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteDate, setNewNoteDate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editDate, setEditDate] = useState('');

  useEffect(() => {
    if (open) {
      setNotes(parseNoteEntries(initialNotesRaw, fallbackDate));
      setNewNoteText('');
      setNewNoteDate(toDateTimeLocal(new Date()));
      setEditingId(null);
      setEditText('');
      setEditDate('');
    }
  }, [open, initialNotesRaw, fallbackDate]);

  const handleAddNewNote = () => {
    if (!newNoteText.trim()) return;
    const finalDate = newNoteDate ? new Date(newNoteDate).toISOString() : new Date().toISOString();
    const newEntry: NoteEntry = {
      id: `note-${Date.now()}`,
      text: newNoteText.trim(),
      createdAt: finalDate
    };
    const updated = [...notes, newEntry];
    setNotes(updated);
    setNewNoteText('');
    setNewNoteDate(toDateTimeLocal(new Date()));
    onSave(serializeNoteEntries(updated));
  };

  const startEditNote = (note: NoteEntry) => {
    setEditingId(note.id);
    setEditText(note.text);
    setEditDate(toDateTimeLocal(note.createdAt));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
    setEditDate('');
  };

  const handleSaveEdit = (noteId: string) => {
    if (!editText.trim()) return;
    const finalDate = editDate ? new Date(editDate).toISOString() : new Date().toISOString();
    const updated = notes.map(n => {
      if (n.id === noteId) {
        return {
          ...n,
          text: editText.trim(),
          createdAt: finalDate
        };
      }
      return n;
    });
    setNotes(updated);
    setEditingId(null);
    setEditText('');
    setEditDate('');
    onSave(serializeNoteEntries(updated));
  };

  const formatNoteDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return 'Recorded note';
      return d.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }) + ' • ' + d.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return 'Recorded note';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[540px] max-h-[85vh] flex flex-col p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>{title}</span>
          </DialogTitle>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {subtitle}
            </p>
          )}
        </DialogHeader>

        {/* Scrollable list of existing notes */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3 min-h-[160px] max-h-[300px] pr-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <span>Notes History ({notes.length})</span>
            <span className="text-[10px] lowercase text-slate-400">Chronological history</span>
          </div>

          {notes.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              No notes logged yet. Use the box below to write the first note.
            </div>
          ) : (
            <div className="space-y-2.5">
              {[...notes].reverse().map((note) => {
                const isEditing = editingId === note.id;

                return (
                  <div
                    key={note.id}
                    className="p-3 rounded-xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        <span>{formatNoteDate(note.createdAt)}</span>
                      </div>

                      {!isEditing && (
                        <button
                          onClick={() => startEditNote(note)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white px-2 py-0.5 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                          title="Edit note text or timestamp"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0">
                            <Clock className="h-3 w-3" /> Date:
                          </label>
                          <Input
                            type="datetime-local"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="h-6 text-[11px] w-52 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 px-2 py-0"
                          />
                        </div>
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={3}
                          className="text-xs bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:border-blue-500"
                          placeholder="Edit note..."
                        />
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEdit}
                            className="h-7 px-2 text-xs text-slate-500 rounded"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(note.id)}
                            className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Save Changes
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {note.text}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add new note section with editable date/time */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Add New Note</span>
            </label>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-slate-400 shrink-0" />
              <Input
                type="datetime-local"
                value={newNoteDate}
                onChange={(e) => setNewNoteDate(e.target.value)}
                className="h-6 text-[11px] w-48 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 py-0 px-2"
                title="Date & time for this note (defaults to now)"
              />
            </div>
          </div>
          <Textarea
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleAddNewNote();
              }
            }}
            rows={3}
            placeholder="Write meeting takeaways, phone call discussion, objections, or updates... (Ctrl+Enter to add)"
            className="text-xs bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900"
          />
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-slate-400">
              Press <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[9px]">Ctrl+Enter</kbd> to quickly add
            </span>
            <Button
              size="sm"
              disabled={!newNoteText.trim()}
              onClick={handleAddNewNote}
              className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 font-semibold text-xs h-8 px-3 rounded-lg shadow-sm"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Note
            </Button>
          </div>
        </div>

        <DialogFooter className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-lg text-xs h-8 px-4"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
