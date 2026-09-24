import React from 'react';
import { Plus, MoreVertical, Edit2, Trash2, Globe } from 'lucide-react';
import { cn, getNicheIcon } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface NicheTabBarProps {
  niches: any[];
  activeNicheId: string | null;
  onSelect: (id: string | null) => void;
  onCreateNiche: () => void;
  onEditNiche: (niche: any) => void;
  onDeleteNiche: (id: string) => void;
}

export default function NicheTabBar({ niches, activeNicheId, onSelect, onCreateNiche, onEditNiche, onDeleteNiche }: NicheTabBarProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <button
        onClick={() => onSelect('all')}
        className={cn(
          "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 border",
          activeNicheId === 'all' || activeNicheId === null
            ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-sm shadow-slate-900/10"
            : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-800"
        )}
      >
        <Globe className="h-3.5 w-3.5" />
        <span>All Leads</span>
      </button>

      {niches.map((niche) => {
        const IconComponent = getNicheIcon(niche.icon);
        return (
          <div key={niche._id} className="relative group flex items-center shrink-0">
            <button
              onClick={() => onSelect(niche._id)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 border",
                activeNicheId === niche._id
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-sm shadow-slate-900/10 pr-7"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-800 pr-7"
              )}
            >
              <IconComponent className="h-3.5 w-3.5 shrink-0" />
              <span>{niche.name}</span>
              {niche.leadCount !== undefined && (
                <span className={cn(
                  "ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums",
                  activeNicheId === niche._id ? "bg-white/20 text-white dark:bg-slate-800 dark:text-slate-200" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                )}>
                  {niche.leadCount}
                </span>
              )}
            </button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn(
                  "absolute right-1.5 p-1 rounded-md transition-opacity",
                  activeNicheId === niche._id ? "text-white/80 hover:bg-white/20 hover:text-white dark:text-slate-700 dark:hover:bg-slate-200" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100 opacity-0 group-hover:opacity-100"
                )}>
                  <MoreVertical className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                <DropdownMenuItem onClick={() => onEditNiche(niche)}><Edit2 className="h-3.5 w-3.5 mr-2"/> Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDeleteNiche(niche._id)} className="text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30"><Trash2 className="h-3.5 w-3.5 mr-2"/> Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      })}

      <button
        onClick={onCreateNiche}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-dashed border-slate-300 dark:border-slate-700 whitespace-nowrap shrink-0 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        New Niche
      </button>
    </div>
  );
}
