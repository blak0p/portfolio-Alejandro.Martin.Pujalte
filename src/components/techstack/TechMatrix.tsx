import React, { useState, useEffect } from 'react';
import type { TechTool } from '../../types';

interface TechMatrixProps {
  tools?: TechTool[];
  projects?: unknown;
}

export default function TechMatrix({ tools: initialTools = [] }: TechMatrixProps) {
  const [tools, setTools] = useState<TechTool[]>([]);
  const [isGlowing, setIsGlowing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    // Try localStorage first (admin edits live here)
    const stored = localStorage.getItem('portfolioTechstack');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTools(parsed);
          setLoaded(true);
          return;
        }
      } catch {}
    }
    // Fallback to props (build-time JSON)
    setTools(initialTools);
    setLoaded(true);
  }, [initialTools, loaded]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'portfolioTechstack' || e.key === 'lastDataUpdate') {
        const stored = localStorage.getItem('portfolioTechstack');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) setTools(parsed);
          } catch {}
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Also refresh when coming back from admin (same tab)
  useEffect(() => {
    const onRefresh = () => {
      const stored = localStorage.getItem('portfolioTechstack');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setTools(parsed);
        } catch {}
      }
    };
    window.addEventListener('portfolioProjectsRefreshed', onRefresh);
    return () => window.removeEventListener('portfolioProjectsRefreshed', onRefresh);
  }, []);

  useEffect(() => {
    const glow = (ms = 1500) => { setIsGlowing(true); setTimeout(() => setIsGlowing(false), ms); };
    const onScan = () => glow(1800);
    const onAction = (e: any) => {
      const { action, section } = e.detail ?? {};
      if (action === 'focus-section' && section === 'tech') glow(2000);
      if (action === 'deep-scan') glow(1500);
    };
    window.addEventListener('portfolioTerminalScan', onScan);
    window.addEventListener('portfolioConsoleAction', onAction);
    return () => {
      window.removeEventListener('portfolioTerminalScan', onScan);
      window.removeEventListener('portfolioConsoleAction', onAction);
    };
  }, []);

  if (tools.length === 0) {
    return (
      <div className="border border-white/15 bg-carbono-surface p-8 text-center island-fade">
        <span className="text-base text-text-faint tracking-widest">SIN_HERRAMIENTAS_REGISTRADAS</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-4 island-load h-full @container transition-all duration-500 ${isGlowing ? 'ring-2 ring-cobalt shadow-[0_0_20px_rgba(0,85,255,0.3)]' : ''}`}>
      <div className="flex items-center justify-between text-xs text-text-faint tracking-widest uppercase opacity-60 mb-1">
        <span className="text-cobalt font-bold">● curado</span>
      </div>
      {Array.from(new Set(tools.map((t) => t.group || 'Otros'))).map((group) => (
        <div key={group} className="border border-white/15 bg-carbono p-3 flex flex-col gap-2">
          <span className="text-xs text-text-faint tracking-widest uppercase">{group}</span>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {tools.filter((t) => (t.group || 'Otros') === group).map((tool) => (
              <li key={tool.name} className="text-base font-bold text-white tracking-wide">
                {tool.name}{tool.version ? <span className="text-xs text-text-faint font-mono ml-1">{tool.version}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
