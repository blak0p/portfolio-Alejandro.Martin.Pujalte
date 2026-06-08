import React, { useState, useEffect } from 'react';
import type { TechTool } from '../../types';
import ProgressBar from '../ui/ProgressBar';

interface TechMatrixProps {
  tools?: TechTool[];
}

export default function TechMatrix({ tools: initialTools = [] }: TechMatrixProps) {
  const [tools, setTools] = useState<TechTool[]>([]);
  const [isGlowing, setIsGlowing] = useState(false);

  useEffect(() => {
    setTools(initialTools);
  }, [initialTools]);

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
    </div>
  );
}
