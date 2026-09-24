import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarCheck, Sun, Moon, Menu, X, Plus, Layers, CheckSquare, BarChart2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import LeadFormDialog from '@/components/leads/LeadFormDialog';
import { createLead } from '@/lib/api';
import toast from 'react-hot-toast';

export default function DashboardLayout() {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  
  // Sidebar collapsed state for desktop rail mode
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const location = useLocation();

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleDark = () => setIsDark(!isDark);
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  const getPageInfo = () => {
    if (location.pathname === '/dashboard') return { title: 'Dashboard', subtitle: 'Overview & pipeline analytics' };
    if (location.pathname.includes('/lead-stats')) return { title: 'Lead Analytics', subtitle: 'Per-niche deep-dive stats & charts' };
    if (location.pathname.includes('/leads')) return { title: 'Leads & Niches', subtitle: 'Organize prospects by vertical' };
    if (location.pathname.includes('/appointments')) return { title: 'Appointments', subtitle: 'Scheduled calls and meetings' };
    if (location.pathname.includes('/habits')) return { title: 'Habit Tracker', subtitle: 'Daily & monthly routine matrix' };
    return { title: 'Dashboard', subtitle: 'Overview & pipeline analytics' };
  };

  const handleAddLead = async (data: any) => {
    try {
      await createLead(data);
      toast.success('Lead created successfully');
      setIsAddLeadOpen(false);
      window.dispatchEvent(new Event('leadCreated'));
    } catch (error) {
      toast.error('Failed to create lead');
    }
  };

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/dashboard/leads', label: 'Leads Pipeline', icon: Users },
    { to: '/dashboard/lead-stats', label: 'Lead Analytics', icon: BarChart2 },
    { to: '/dashboard/appointments', label: 'Appointments', icon: CalendarCheck },
    { to: '/dashboard/habits', label: 'Habit Tracker', icon: CheckSquare },
  ];

  const pageInfo = getPageInfo();

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 flex text-slate-900 dark:text-slate-100 font-sans">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Modern Executive Slate Sidebar with Technical Pattern & Collapsible Rail */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 transform flex flex-col transition-all duration-200 ease-in-out lg:static lg:shrink-0",
          isCollapsed ? "lg:w-[68px] w-64" : "w-64",
          "sidebar-pattern border-r border-slate-200/90 dark:border-slate-800 shadow-[3px_0_16px_rgba(15,23,42,0.03)]",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand Header */}
        <div className={cn(
          "flex h-16 shrink-0 items-center border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm gap-2.5",
          isCollapsed ? "px-3 justify-between" : "px-5"
        )}>
          <div className="h-9 w-9 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center font-bold shadow-sm shadow-slate-900/15 shrink-0">
            <Layers className="h-5 w-5" strokeWidth={2} />
          </div>
          
          {!isCollapsed && (
            <div className="overflow-hidden truncate">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">TrackMe</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 border border-blue-200 dark:border-blue-900">PRO</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">Solo Lead Workspace</p>
            </div>
          )}

          {/* Desktop collapse toggle button */}
          <button
            onClick={toggleCollapsed}
            className={cn(
              "hidden lg:flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
              isCollapsed ? "ml-auto" : "ml-auto"
            )}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>

          {/* Mobile close button */}
          <button className="ml-auto lg:hidden text-slate-500 hover:text-slate-900 dark:hover:text-white" onClick={closeMobileMenu}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className={cn("flex-1 space-y-2 overflow-y-auto", isCollapsed ? "px-2.5 py-4" : "px-3.5 py-5")}>
          {!isCollapsed && (
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Main Navigation
            </div>
          )}
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={closeMobileMenu}
              title={isCollapsed ? link.label : undefined}
              className={({ isActive }) =>
                cn(
                  "flex items-center rounded-xl text-xs font-semibold transition-all duration-150 border",
                  isCollapsed ? "justify-center p-2.5" : "gap-3 px-3.5 py-2.5",
                  isActive
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-sm shadow-slate-900/15"
                    : "bg-white/80 dark:bg-slate-900/70 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                )
              }
            >
              <link.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              {!isCollapsed && <span className="truncate">{link.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer Area: Dark Mode Toggle */}
        <div className={cn(
          "shrink-0 mt-auto border-t border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm",
          isCollapsed ? "p-2" : "p-3.5"
        )}>
          <button
            onClick={toggleDark}
            title={isCollapsed ? (isDark ? 'Switch to Light Appearance' : 'Switch to Dark Appearance') : undefined}
            className={cn(
              "flex w-full items-center rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]",
              isCollapsed ? "justify-center p-2.5" : "justify-between px-3.5 py-2.5"
            )}
          >
            <div className="flex items-center gap-2.5">
              {isDark ? <Sun className="h-4 w-4 text-amber-500 shrink-0" /> : <Moon className="h-4 w-4 text-slate-600 shrink-0" />}
              {!isCollapsed && <span>{isDark ? 'Light Appearance' : 'Dark Appearance'}</span>}
            </div>
            {!isCollapsed && (
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                {isDark ? 'Dark' : 'Light'}
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area with Ambient Dotted Grid Canvas Pattern */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden canvas-pattern">
        {/* Top Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/90 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md px-4 sm:px-8 shadow-[0_1px_3px_0_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-3.5">
            <button
              className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg dark:hover:bg-slate-800"
              onClick={toggleMobileMenu}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{pageInfo.title}</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block font-medium">{pageInfo.subtitle}</p>
            </div>
          </div>
          
          {/* Header Action section: New lead button removed per user request */}
          <div className="flex items-center gap-3">
          </div>
        </header>

        {/* Outlet Area */}
        <div className="flex-1 overflow-auto p-4 sm:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Global Add Lead Modal */}
      <LeadFormDialog 
        open={isAddLeadOpen} 
        onClose={() => setIsAddLeadOpen(false)} 
        onSubmit={handleAddLead} 
      />
    </div>
  );
}
