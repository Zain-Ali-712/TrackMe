import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarCheck, Sun, Moon, Menu, X, Layers, CheckSquare, BarChart2, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import LeadFormDialog from '@/components/leads/LeadFormDialog';
import { createLead } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

export default function DashboardLayout() {
  const { signOut } = useAuth();
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

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out');
  };

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  const getPageInfo = () => {
    if (location.pathname === '/dashboard') return { title: 'Dashboard', subtitle: 'Today at a glance' };
    if (location.pathname.includes('/lead-stats')) return { title: 'Lead analytics', subtitle: 'How each niche is converting' };
    if (location.pathname.includes('/leads')) return { title: 'Leads', subtitle: 'Your pipeline, by niche and status' };
    if (location.pathname.includes('/appointments')) return { title: 'Appointments', subtitle: 'Booked calls and meetings' };
    if (location.pathname.includes('/habits')) return { title: 'Habits', subtitle: 'Daily routine and monthly score' };
    return { title: 'Dashboard', subtitle: 'Today at a glance' };
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
    { to: '/dashboard/leads', label: 'Leads', icon: Users },
    { to: '/dashboard/lead-stats', label: 'Analytics', icon: BarChart2 },
    { to: '/dashboard/appointments', label: 'Appointments', icon: CalendarCheck },
    { to: '/dashboard/habits', label: 'Habits', icon: CheckSquare },
  ];

  const pageInfo = getPageInfo();

  const today = new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex text-slate-900 dark:text-slate-100 font-sans">
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-[rgb(28_22_16/0.45)] backdrop-blur-[2px] lg:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar, collapsible to an icon rail on desktop */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 transform flex flex-col transition-all duration-200 ease-out lg:static lg:shrink-0",
          isCollapsed ? "lg:w-[72px] w-64" : "w-64",
          "sidebar-surface border-r border-slate-200/90 dark:border-slate-800",
          isMobileMenuOpen ? "translate-x-0 shadow-raised" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand */}
        <div className={cn("flex h-16 shrink-0 items-center gap-2.5", isCollapsed ? "px-3.5 justify-between" : "px-5")}>
          <div className="relative h-9 w-9 rounded-[10px] bg-gradient-to-b from-clay-500 to-clay-700 text-white flex items-center justify-center shrink-0 shadow-[0_1px_2px_rgba(120,50,20,0.3),inset_0_1px_0_rgba(255,255,255,0.18)]">
            <Layers className="h-[18px] w-[18px]" strokeWidth={2} />
          </div>

          {!isCollapsed && (
            <div className="min-w-0 leading-tight">
              <span className="font-display text-[19px] font-medium text-slate-900 dark:text-slate-50">TrackMe</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Leads and daily habits</p>
            </div>
          )}

          <button
            onClick={toggleCollapsed}
            className="hidden lg:flex ml-auto items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-900/[0.05] dark:hover:bg-white/[0.06] transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>

          <button className="ml-auto lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white" onClick={closeMobileMenu} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className={cn("flex-1 space-y-0.5 overflow-y-auto", isCollapsed ? "px-3 py-3" : "px-3 py-3")} aria-label="Main">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={closeMobileMenu}
              title={isCollapsed ? link.label : undefined}
              className={({ isActive }) =>
                cn(
                  "group flex items-center rounded-lg text-[13px] font-medium transition-colors",
                  isCollapsed ? "justify-center h-10" : "gap-3 px-3 h-9",
                  isActive
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-card"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.04]"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <link.icon
                    className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-clay-600 dark:text-clay-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300")}
                    strokeWidth={isActive ? 2 : 1.75}
                  />
                  {!isCollapsed && <span className="truncate">{link.label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer: appearance + sign out */}
        <div className={cn("shrink-0 border-t border-slate-200/80 dark:border-slate-800 space-y-0.5", isCollapsed ? "p-3" : "p-3")}>
          <button
            onClick={toggleDark}
            title={isDark ? 'Switch to light appearance' : 'Switch to dark appearance'}
            className={cn(
              "flex w-full items-center rounded-lg text-[13px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.04] transition-colors",
              isCollapsed ? "justify-center h-10" : "gap-3 px-3 h-9"
            )}
          >
            {isDark ? <Sun className="h-4 w-4 shrink-0 text-slate-400" /> : <Moon className="h-4 w-4 shrink-0 text-slate-400" />}
            {!isCollapsed && <span>{isDark ? 'Light appearance' : 'Dark appearance'}</span>}
          </button>

          <button
            onClick={handleSignOut}
            title={isCollapsed ? 'Sign out' : undefined}
            className={cn(
              "group flex w-full items-center rounded-lg text-[13px] font-medium text-slate-600 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors",
              isCollapsed ? "justify-center h-10" : "gap-3 px-3 h-9"
            )}
          >
            <LogOut className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-rose-600 dark:group-hover:text-rose-400" />
            {!isCollapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Main content on the lit canvas */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden canvas-surface">
        <header className="flex h-[72px] shrink-0 items-center justify-between px-4 sm:px-8 border-b border-slate-900/[0.06] dark:border-white/[0.06]">
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-900 hover:bg-slate-900/[0.05] rounded-lg dark:hover:bg-white/[0.06]"
              onClick={toggleMobileMenu}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-[26px] leading-tight font-medium text-slate-900 dark:text-slate-50 truncate">{pageInfo.title}</h1>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 hidden sm:block truncate">{pageInfo.subtitle}</p>
            </div>
          </div>
          <p className="hidden md:block text-[13px] text-slate-500 dark:text-slate-400 tabular-nums">{today}</p>
        </header>

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
