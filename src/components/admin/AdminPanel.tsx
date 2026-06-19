import React, { useState, useEffect, useCallback } from 'react';
import ProjectsTab from './tabs/ProjectsTab';
import TechTab from './tabs/TechTab';
import AmbitionsTab from './tabs/AmbitionsTab';
import SettingsTab from './tabs/SettingsTab';
import DataTab from './tabs/DataTab';
import PublishTab from './tabs/PublishTab';

const SESSION_KEY = 'admin_session';
const SESSION_TS = 'admin_session_ts';
const SESSION_TTL = 60 * 60 * 1000; // 1 hour

function isSessionValid(): boolean {
  if (typeof window === 'undefined') return false;
  if (sessionStorage.getItem(SESSION_KEY) !== 'true') return false;
  const ts = Number(sessionStorage.getItem(SESSION_TS) ?? 0);
  if (Date.now() - ts > SESSION_TTL) {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_TS);
    return false;
  }
  return true;
}

/* --- Premium GitHub Auth Gate --- */
interface GitHubAuthGateProps {
  onAuth: () => void;
}

function GitHubAuthGate({ onAuth }: GitHubAuthGateProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      handleCallback(code);
    }
  }, []);

  async function handleCallback(code: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/github-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem(SESSION_KEY, 'true');
        sessionStorage.setItem(SESSION_TS, String(Date.now()));
        window.history.replaceState({}, document.title, "/admin");
        onAuth();
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (e) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  }

  function login() {
    window.location.href = '/api/github-auth';
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center font-mono select-none p-6 relative overflow-hidden">
      {/* Premium background gradient elements */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-sky-500/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="w-full max-w-md p-8 border border-zinc-800 bg-zinc-900/40 backdrop-blur-md rounded-2xl shadow-2xl relative z-10">
        <div className="flex flex-col gap-3 mb-8">
          <p className="text-[10px] text-sky-400 font-bold tracking-[0.4em] uppercase">SYSTEM_ACCESS // LOGIN</p>
          <div className="h-[2px] bg-gradient-to-r from-sky-500/30 to-transparent w-full" />
        </div>

        <div className="flex flex-col gap-6">
          <p className="text-zinc-400 text-xs leading-relaxed tracking-wider uppercase">
            Authentication required to access the central core management bridge.
          </p>
          
          {error && (
            <p className="text-red-400 text-[10px] font-bold tracking-widest uppercase animate-pulse border border-red-500/20 bg-red-950/10 p-3 rounded-xl">
              !! ERROR: {error}
            </p>
          )}

          <button 
            onClick={login} 
            disabled={loading} 
            className="w-full py-4 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs font-bold uppercase tracking-[0.2em] rounded-xl shadow-[0_0_15px_rgba(56,189,248,0.2)] hover:shadow-[0_0_25px_rgba(56,189,248,0.35)] transition-all duration-300 active:scale-[0.98]"
          >
            {loading ? 'SYNCING_UPLINK...' : 'AUTHORIZE_WITH_GITHUB \u2192'}
          </button>
        </div>

        <div className="flex justify-between items-center opacity-30 mt-8 pt-6 border-t border-zinc-800/80 text-[9px] text-zinc-400">
          <span>v5.0.0 Stable</span>
          <span className="uppercase">Encrypted Session</span>
        </div>
      </div>
    </div>
  );
}

/* --- Main Admin Panel --- */
export default function AdminPanel() {
  const [auth, setAuth] = useState(false);
  const [tab, setTab] = useState<string>('projects');
  const [logs, setLogs] = useState<string[]>(['SYSTEM_READY', 'AWAITING_INPUT']);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const addLog = useCallback((msg: string) => { 
    setLogs(prev => [`${new Date().toLocaleTimeString()} > ${msg}`, ...prev].slice(0, 50)); 
  }, []);

  useEffect(() => {
    if (isSessionValid()) setAuth(true);
  }, []);

  if (!auth) return <GitHubAuthGate onAuth={() => setAuth(true)} />;

  const tabs = [
    { id: 'projects', label: 'Projects', icon: '◈' },
    { id: 'tech', label: 'Tech Stack', icon: '◰' },
    { id: 'ambitions', label: 'Roadmap', icon: '▲' },
    { id: 'settings', label: 'Settings', icon: '⚙' },
    { id: 'data', label: 'Raw Editor', icon: '◉' },
    { id: 'publish', label: 'Publish', icon: '↑' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col lg:flex-row font-mono text-zinc-200 select-none">
      
      {/* MOBILE HEADER */}
      <header className="lg:hidden h-16 bg-zinc-900/60 border-b border-zinc-800 px-6 flex items-center justify-between sticky top-0 z-50 backdrop-blur-xl">
        <p className="text-xs font-bold tracking-widest uppercase text-zinc-200">Core_Admin</p>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
          className="w-10 h-10 flex items-center justify-center bg-zinc-950 rounded-xl border border-zinc-800 active:scale-95 transition-all text-zinc-400"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </header>

      {/* SIDEBAR NAVIGATION */}
      <aside className={`
        fixed lg:relative inset-y-0 left-0 w-80 bg-zinc-900/40 backdrop-blur-md border-r border-zinc-800/80 flex flex-col shrink-0 z-[60] transition-transform duration-300 lg:translate-x-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="hidden lg:flex p-10 border-b border-zinc-800/80 flex flex-col gap-2">
          <p className="text-sm font-bold text-zinc-100 tracking-widest uppercase">Core_Admin</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-sky-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(56,189,248,0.8)]" />
            <p className="text-[10px] text-sky-400 tracking-wider uppercase font-bold">Active_Session</p>
          </div>
        </div>

        <nav className="flex-1 p-6 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
          {tabs.map(t => (
            <button 
              key={t.id} 
              onClick={() => { 
                setTab(t.id); 
                addLog(`NAV_TO: ${t.id.toUpperCase()}`); 
                setMobileMenuOpen(false); 
              }} 
              className={`text-left px-6 py-4 text-xs font-bold tracking-wider uppercase transition-all duration-200 border-l-2 flex items-center gap-4 rounded-r-xl ${
                tab === t.id 
                  ? 'bg-sky-500/5 text-sky-400 border-l-sky-500 shadow-[inset_0_0_15px_rgba(56,189,248,0.03)]' 
                  : 'border-l-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/20'
              }`}
            >
              <span className="opacity-50">{t.icon}</span> {t.label}
            </button>
          ))}
        </nav>
        
        <div className="p-6 border-t border-zinc-800/80 flex flex-col gap-3 bg-zinc-950/20">
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full py-3.5 border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-xs font-bold uppercase tracking-widest hover:text-white transition-all flex items-center justify-center gap-3 rounded-xl"
          >
            <span>←</span> EXIT_TO_SITE
          </button>
          <button 
            onClick={() => { sessionStorage.removeItem(SESSION_KEY); window.location.reload(); }} 
            className="py-2 text-[10px] text-red-500/60 hover:text-red-400 tracking-widest uppercase transition-all text-center font-bold"
          >
            ✕ TERMINATE_SESSION
          </button>
        </div>
      </aside>

      {/* OVERLAY FOR MOBILE SIDEBAR */}
      {mobileMenuOpen && <div onClick={() => setMobileMenuOpen(false)} className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-[55]" />}

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 bg-zinc-950 overflow-x-hidden">
        <div className="flex-1 p-6 sm:p-12 lg:p-16 custom-scrollbar island-load">
          <div className="max-w-5xl mx-auto">
            {tab === 'projects'   && <ProjectsTab onLog={addLog} />}
            {tab === 'tech'       && <TechTab onLog={addLog} />}
            {tab === 'ambitions'  && <AmbitionsTab onLog={addLog} />}
            {tab === 'settings'   && <SettingsTab onLog={addLog} />}
            {tab === 'data'       && <DataTab onLog={addLog} />}
            {tab === 'publish'    && <PublishTab onLog={addLog} />}
          </div>
        </div>
      </main>

      {/* SESSION HISTORY (DESKTOP ONLY) */}
      <aside className="hidden xl:flex w-80 border-l border-zinc-800/80 bg-zinc-900/20 flex flex-col shrink-0 shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-zinc-800/80 bg-zinc-900/30">
          <p className="text-[10px] text-zinc-400 tracking-widest font-bold uppercase leading-none">/ SESSION_HISTORY</p>
        </div>
        <div className="flex-1 p-6 flex flex-col gap-1 overflow-y-auto text-[10px] opacity-30 hover:opacity-100 transition-opacity duration-300 custom-scrollbar">
          {logs.map((l, i) => (
            <p key={i} className={`py-1 border-b border-zinc-900 font-mono ${i === 0 ? 'text-sky-400 font-bold' : 'text-zinc-500'}`}> 
              {l}
            </p>
          ))}
        </div>
        <div className="p-8 bg-zinc-900/30 border-t border-zinc-800/80 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold italic">operator:</span>
            <p className="text-xs text-zinc-300 font-bold uppercase truncate">admin@gest_core</p>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold italic">status:</span>
            <p className="text-xs text-green-400 font-bold uppercase">ENCRYPTED</p>
          </div>
        </div>
      </aside>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .island-load { animation: reveal-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes reveal-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}
