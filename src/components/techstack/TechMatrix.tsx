import React, { useState, useEffect } from 'react';
import type { Project, TechTool } from '../../types';
import ProgressBar from '../ui/ProgressBar';
import AllTechModal from './AllTechModal';

interface TechMatrixProps {
  tools?: TechTool[];
  projects?: Project[];
}

const DEFAULT_VERSION_MAP: Record<string, string> = {
  'GO': 'v1.23+',
  'TYPESCRIPT': 'v5.3+',
  'JAVASCRIPT': 'ES2024',
  'SHELL': 'bash 5+',
  'ASTRO': 'v5+',
  'REACT': 'v19+',
  'DOCKER': 'v26+',
  'PODMAN': 'v5+',
  'OLLAMA': 'latest',
  'MCP': 'v1.0+',
  'GIT': 'v2.45+',
  'TAILWIND': 'v4+',
  'POSTGRESQL': 'v16+',
  'NODE.JS': 'v22+',
};

export function deriveFromProjects(projects: Project[], versionMap: Record<string, string> = {}, maxProjects = 5): TechTool[] {
  if (!projects.length) return [];

  const validProjects = projects.filter(p => p.stack && p.stack.length > 0);
  if (validProjects.length === 0) return [];

  // Tomar los PRIMEROS 5 (orden de la lista, sin importar stars/favorito)
  const top5 = validProjects.slice(0, maxProjects);
  
  const techUsages: Record<string, number> = {};
  const techCounts: Record<string, number> = {};

  for (const p of top5) {
    const stackWithUsage = p.specs?.stackWithUsage as { name: string; usageLevel: number }[] | undefined;
    
    if (stackWithUsage && stackWithUsage.length > 0) {
      for (const tech of stackWithUsage) {
        techUsages[tech.name] = (techUsages[tech.name] || 0) + tech.usageLevel;
        techCounts[tech.name] = (techCounts[tech.name] || 0) + 1;
      }
    } else if (p.stack && p.stack.length > 0) {
      const basePerTech = Math.round(100 / p.stack.length);
      for (let i = 0; i < p.stack.length; i++) {
        const tech = p.stack[i];
        const variation = (p.name.length + tech.length + i) % 15 - 7;
        const usage = Math.min(100, Math.max(10, basePerTech + variation));
        techUsages[tech] = (techUsages[tech] || 0) + usage;
        techCounts[tech] = (techCounts[tech] || 0) + 1;
      }
    }
  }

  const result = Object.entries(techUsages)
    .map(([name, total]) => ({
      name,
      version: versionMap[name] ?? DEFAULT_VERSION_MAP[name] ?? '-',
      usageLevel: Math.round(total / techCounts[name]),
    }))
    .sort((a, b) => b.usageLevel - a.usageLevel);
  
  return result;
}

export default function TechMatrix({ tools: _initialTools = [], projects: initialProjects = [] }: TechMatrixProps) {
  const [tools, setTools] = useState<TechTool[]>([]);
  const [toolsAll, setToolsAll] = useState<TechTool[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [versionMap, setVersionMap] = useState<Record<string, string>>({});
  const [isGlowing, setIsGlowing] = useState(false);

  useEffect(() => {
    const loadTechStack = () => {
      const settingsStored = localStorage.getItem('portfolioSettings');
      let versionMapObj: Record<string, string> = {};
      try {
        if (settingsStored) {
          const settings = JSON.parse(settingsStored);
          versionMapObj = settings.versionMap || {};
          setVersionMap(versionMapObj);
        }
      } catch {}

      const derivedInitial = deriveFromProjects(initialProjects, versionMapObj);
      const derivedInitialAll = deriveFromProjects(initialProjects, versionMapObj, Infinity);
      if (derivedInitial.length > 0) {
        setTools(derivedInitial);
        setToolsAll(derivedInitialAll);
        return;
      }

      setTools([]);
      setToolsAll([]);
    };

    loadTechStack();
    const handleStorageChange = (e: StorageEvent) => {
      if (['portfolioSettings', 'lastDataUpdate'].includes(e.key ?? '')) loadTechStack();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [initialProjects]);

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
        <span className="text-base text-text-faint tracking-widest">NO_TOOLS_REGISTERED</span>
      </div>
    );
  }

  return (
    <>
      <div className={`flex flex-col gap-4 island-load h-full @container transition-all duration-500 ${isGlowing ? 'ring-2 ring-cobalt shadow-[0_0_20px_rgba(0,85,255,0.3)]' : ''}`}>
        <div className="flex items-center justify-between text-xs text-text-faint tracking-widest uppercase opacity-60 mb-1">
          <span className="text-cobalt font-bold">● dynamic</span>
        </div>
        <div className="grid grid-cols-1 @[500px]:grid-cols-2 gap-3">
          {tools.map((tool) => (
            <div key={tool.name} className="border border-white/15 bg-carbono p-3 flex flex-col gap-2 hover:border-cobalt/40 transition-colors">
              <div className="flex justify-between items-center">
                <span className="text-base font-bold text-white tracking-widest uppercase">{tool.name}</span>
                <span className="text-xs text-cobalt tracking-widest font-mono">[ {tool.usageLevel}% ]</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <ProgressBar value={tool.usageLevel} segments={12} />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-faint tracking-widest italic">{tool.version || '—'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {toolsAll.length > tools.length && (
          <button
            onClick={() => setShowAll(true)}
            className="self-end text-sm text-cobalt hover:text-white tracking-widest uppercase border border-cobalt/40 hover:border-cobalt hover:bg-cobalt/10 px-4 py-1.5 transition-colors duration-150 cursor-pointer"
          >
            [+] ALL_TECH ({toolsAll.length})
          </button>
        )}
      </div>

      {showAll && <AllTechModal tools={toolsAll} onClose={() => setShowAll(false)} />}
    </>
  );
}
