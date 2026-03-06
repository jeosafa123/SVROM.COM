import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Cloud, 
  Users, 
  Plug, 
  LogOut, 
  Menu, 
  X, 
  Sun, 
  Moon,
  Trash2,
  Wifi,
  WifiOff
} from 'lucide-react';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface LayoutProps {
  children: React.ReactNode;
  profile: UserProfile | null;
  activeSection: string;
  setActiveSection: (section: string) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  userEmail: string;
}

export function Layout({ children, profile, activeSection, setActiveSection, onLogout, onDeleteAccount, userEmail }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
    { id: 'lancamento', label: 'Lançamento', icon: FileText, adminOnly: false },
    { id: 'nuvem', label: 'Lista / Nuvem', icon: Cloud, adminOnly: false },
    { id: 'equipe', label: 'Equipe', icon: Users, adminOnly: true },
    { id: 'integracao', label: 'Integração', icon: Plug, adminOnly: true },
  ];

  const filteredNavItems = navItems.filter(item => !item.adminOnly || profile?.role === 'admin');

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-body)]">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[var(--bg-sidebar)] border-b border-[var(--border)] flex items-center justify-between px-4 z-[1001]">
        <span className="text-[var(--primary)] font-black text-xl tracking-wider">VERTICAL</span>
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter",
            isOnline ? "text-[var(--success)] bg-[var(--success)]/10" : "text-[var(--danger)] bg-[var(--danger)]/10"
          )}>
            {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span className="hidden xs:inline">{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </div>
          <button onClick={toggleTheme} className="p-2 text-[var(--primary)] border border-[var(--border)] rounded-full">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-[var(--primary)] border border-[var(--primary)] rounded-md font-bold text-sm">
            MENU
          </button>
        </div>
      </div>

      {/* Sidebar Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-[1002] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:relative inset-y-0 left-0 w-[280px] bg-[var(--bg-sidebar)] border-r border-[var(--border)] flex flex-col transition-transform duration-300 z-[1003] md:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-8 border-b border-[var(--border)] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[var(--primary)] font-black text-2xl tracking-[0.2em] leading-none">VERTICAL</span>
              <span className="text-[var(--text-muted)] text-[10px] font-black tracking-[0.4em] mt-1">LOCAÇÕES</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-[var(--text-muted)]">
              <X size={24} />
            </button>
          </div>
          
          <div className="mt-4 p-4 bg-black/20 rounded-xl border border-white/5">
            <div className="text-[var(--text-main)] text-xs font-black uppercase tracking-widest truncate">
              {userEmail.split('@')[0]}
            </div>
            <div className="text-[var(--primary)] text-[9px] font-black uppercase tracking-[0.2em] mt-1 opacity-80">
              {profile?.role === 'admin' ? 'ADMINISTRADOR' : 'TÉCNICO'}
            </div>
            <div className="text-[var(--text-muted)] text-[9px] font-bold uppercase tracking-widest mt-2 border-t border-white/5 pt-2">
              {profile?.empresa_nome || 'Empresa'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
              isOnline ? "text-[var(--success)] border-[var(--success)]/20 bg-[var(--success)]/5" : "text-[var(--danger)] border-[var(--danger)]/20 bg-[var(--danger)]/5"
            )}>
              <div className={cn("w-1.5 h-1.5 rounded-full", isOnline ? "bg-[var(--success)] animate-pulse" : "bg-[var(--danger)]")} />
              <span>{isOnline ? 'SISTEMA ONLINE' : 'MODO OFFLINE'}</span>
            </div>
            <button onClick={toggleTheme} className="hidden md:flex p-2 text-[var(--primary)] border border-[var(--border)] rounded-xl hover:bg-white/5 transition-colors">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>

        <nav className="flex-1 py-8 px-4 space-y-2">
          {filteredNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveSection(item.id);
                setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-4 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all group",
                activeSection === item.id 
                  ? "bg-[var(--primary)] text-black shadow-[0_10px_20px_rgba(255,204,0,0.2)]" 
                  : "text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-main)]"
              )}
            >
              <item.icon size={18} className={cn(
                "transition-transform group-hover:scale-110",
                activeSection === item.id ? "text-black" : "text-[var(--primary)]"
              )} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-[var(--border)] space-y-2">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl font-black uppercase tracking-widest text-[11px] text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-all"
          >
            <LogOut size={18} />
            SAIR DO SISTEMA
          </button>
          <button 
            onClick={onDeleteAccount}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] text-[var(--text-muted)]/50 hover:text-[var(--danger)] transition-all"
          >
            <Trash2 size={16} />
            EXCLUIR CONTA
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-20 md:pt-8 bg-[var(--bg-body)]">
        <div className="max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

