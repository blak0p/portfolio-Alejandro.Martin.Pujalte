// ═══════════════════════════════════════════════════════════════════════════════
// DEPRECATED: This component provides the legacy rounded-card / masonry layout.
// The canonical desktop layout is now `index.astro`'s grid with .sharp-corner.
// Do NOT refactor this component — use index.astro for new grid-based layouts.
// ═══════════════════════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface MasonryItem {
  id: string;
  component: React.ReactNode;
}

interface CoreMasonryProps {
  items: MasonryItem[];
}

// CAJA UNIFICADA: FUERTE Y VISIBLE
// DEPRECATED: rounded-card style — use index.astro grid
function ContentBox({ children, className = "", layoutId }: { children: React.ReactNode; className?: string; layoutId?: string }) {
  return (
    <motion.section
      layoutId={layoutId}
      className={`bg-[#121212] border border-white/20 rounded-[2.5rem] overflow-hidden flex flex-col island-load shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${className}`}
    >
      {children}
    </motion.section>
  );
}

function SectionHeader({ title, comment }: { title: string; comment?: string }) {
  return (
    <div className="flex flex-col gap-1.5 mb-6 px-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-4 bg-cobalt shadow-[0_0_15px_rgba(0,85,255,0.6)]" />
          <h2 className="text-sm text-white font-black tracking-[0.4em] uppercase">{title}</h2>
        </div>
        {comment && <span className="hidden sm:block text-xs text-white/70 font-bold tracking-widest uppercase italic">{comment}</span>}
      </div>
      <div className="h-px bg-white/10 w-full" />
    </div>
  );
}

export default function CoreMasonry({ items }: CoreMasonryProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  const findItem = (id: string) => items.find(i => i.id === id)?.component;

  // COLOR CARBONO UNIFICADO: #0d0d0d
  if (!isMounted) return <div className="w-full h-screen bg-[#0d0d0d]" />;

  return (
    <div className="w-full min-h-screen bg-[#0d0d0d] font-sans select-none relative overflow-x-hidden text-white flex flex-col">
      
      {/* HEADER MÓVIL (CARBONO) */}
      <header className="lg:hidden h-20 bg-[#0d0d0d]/80 border-b border-white/15 px-6 flex items-center justify-between sticky top-0 z-50 backdrop-blur-xl">
        <p className="text-base font-black tracking-[0.3em] uppercase">Core_OS <span className="text-cobalt">Terminal</span></p>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
          className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-xl border border-white/15 active:scale-95 transition-all"
        >
          {mobileMenuOpen ? '✕' : '📟'}
        </button>
      </header>

      {/* DRAWER MÓVIL */}
      <aside className={`
        lg:hidden fixed inset-0 z-40 bg-[#0d0d0d] transition-transform duration-500 ease-in-out pt-24
        ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="h-full flex flex-col p-8 gap-8 overflow-y-auto">
          <span className="text-xs text-cobalt font-black tracking-[0.4em] uppercase">// SYSTEM_TELEMETRY</span>
          <div className="flex-1 bg-white/[0.06] border border-white/5 rounded-3xl p-6 overflow-y-auto custom-scrollbar font-mono text-sm opacity-70 text-blue-100/60 leading-relaxed">
            {findItem('logs')}
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="w-full py-5 bg-white/5 border border-white/15 text-sm font-black uppercase text-white rounded-2xl">Close Terminal</button>
        </div>
      </aside>

      {/* GRID UNIFICADO */}
      <div className="max-w-[2400px] mx-auto p-4 sm:p-6 lg:p-10 lg:h-screen lg:max-h-screen flex flex-col lg:flex-row gap-8 md:gap-12 min-h-0">
        
        {/* COLUMNA 1: SIDEBAR (IDENTIDAD ARRIBA + TERMINAL ABAJO) */}
        <div className="w-full lg:w-[clamp(320px,22vw,440px)] flex flex-col gap-8 shrink-0 lg:h-full">
          
          {/* IDENTIDAD (ARRIBA) */}
          <div className="lg:flex-1 lg:overflow-y-auto custom-scrollbar">
            {findItem('identity')}
          </div>

          {/* TERMINAL (ABAJO) */}
          <div className="hidden lg:flex flex-col border border-white/20 bg-[#121212] backdrop-blur-md lg:h-[700px] shrink-0 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="flex-1 p-8 flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between mb-4 border-b border-white/15 pb-3">
                <span className="text-xs text-cobalt font-black tracking-[0.3em] uppercase">Core_System_Output</span>
                <div className="flex gap-2">
                   <div className="w-2 h-2 rounded-full bg-cobalt animate-pulse" />
                   <div className="w-2 h-2 rounded-full bg-white/10" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 text-sm opacity-40 font-mono italic leading-relaxed">
                {findItem('logs')}
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA 2: CONTENIDO (CAJAS GEMELAS VISIBLES) */}
        <div className="flex-1 flex flex-col gap-8 md:gap-12 lg:h-full min-w-0 min-h-0">
          
          {/* CAJA PROYECTOS */}
          <ContentBox layoutId="projects" className="flex-[2.5] p-8 md:p-12">
            <SectionHeader title="// DEPLOYED_MODULES" comment="Live_Production_Buffer" />
            <div className="flex-1 lg:overflow-y-auto custom-scrollbar min-h-[400px] lg:min-h-0">
              {findItem('projects')}
            </div>
          </ContentBox>

          {/* CAJAS TECH & ROADMAP (SINCRO TOTAL) */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 shrink-0">
            
            <ContentBox layoutId="tech" className="p-8 sm:p-10 h-full">
              <SectionHeader title="// TECH_ENVIRONMENT" comment="Registry_v4.2_Stable" />
              <div className="flex-1 lg:overflow-y-auto custom-scrollbar min-h-[250px] lg:min-h-0">
                {findItem('tech')}
              </div>
            </ContentBox>

            <ContentBox layoutId="roadmap" className="p-8 sm:p-10 h-full">
              <SectionHeader title="// STRATEGIC_ROADMAP" comment="Strategic_Evolution_Plan_2026" />
              <div className="flex-1 lg:overflow-y-auto custom-scrollbar min-h-[250px] lg:min-h-0">
                {findItem('roadmap')}
              </div>
            </ContentBox>

          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .island-load { animation: island-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes island-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}
