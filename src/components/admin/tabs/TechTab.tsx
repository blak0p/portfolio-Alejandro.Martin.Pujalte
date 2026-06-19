import React, { useState, useEffect, useCallback } from 'react';
import type { TechTool } from '../../../types';
import { 
  inputClass, 
  buttonPrimaryClass, 
  buttonSecondaryClass, 
  cardClass, 
  Field, 
  SectionHeader 
} from '../components/UI';

interface TechTabProps {
  onLog: (msg: string) => void;
}

export default function TechTab({ onLog }: TechTabProps) {
  const [tools, setTools] = useState<TechTool[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', version: '', usageLevel: 80 });

  const load = useCallback(async () => {
    const stored = localStorage.getItem('portfolioTechstack');
    if (stored) {
      setTools(JSON.parse(stored));
      return;
    }
    try {
      const res = await fetch('/data/techstack.json');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setTools(data);
        }
      }
    } catch (e) {
      console.warn('TechStack load: JSON fallback');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function save() {
    if (!form.name) return;
    const tool: TechTool = { 
      name: form.name.toUpperCase(), 
      version: form.version, 
      usageLevel: form.usageLevel 
    };
    const next = editing !== null ? tools.map((t, i) => i === editing ? tool : t) : [...tools, tool];
    setTools(next);
    localStorage.setItem('portfolioTechstack', JSON.stringify(next));
    setForm({ name: '', version: '', usageLevel: 80 });
    setEditing(null);
    onLog(`TECH_SAVED: ${tool.name}`);
  }

  return (
    <div className="flex flex-col gap-10 font-mono">
      <header className="flex items-center border-b border-zinc-800 pb-3">
        <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">/ TECH_MATRIX_REGISTRY</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {tools.map((t, i) => (
          <button 
            key={i} 
            onClick={() => { 
              setEditing(i); 
              setForm({ name: t.name, version: t.version, usageLevel: t.usageLevel }); 
            }} 
            className={`p-6 border text-left transition-all duration-300 rounded-2xl group relative overflow-hidden ${
              editing === i 
                ? 'border-sky-500 bg-sky-950/20 text-white shadow-[0_0_20px_rgba(56,189,248,0.15)]' 
                : 'border-zinc-800/80 bg-zinc-900/20 hover:border-zinc-700/50 hover:bg-zinc-900/40 text-zinc-300 hover:text-white'
            }`}
          >
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm font-bold uppercase tracking-wider">{t.name}</p>
              <span className={`text-xs font-bold font-mono ${editing === i ? 'text-white' : 'text-sky-400'}`}>{t.usageLevel}%</span>
            </div>
            <div className={`h-1.5 w-full rounded-full ${editing === i ? 'bg-white/20' : 'bg-zinc-950'}`}>
              <div 
                className={`h-full rounded-full ${editing === i ? 'bg-white shadow-[0_0_8px_#fff]' : 'bg-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.4)]'} transition-all duration-300`} 
                style={{ width: `${t.usageLevel}%` }} 
              />
            </div>
          </button>
        ))}
      </div>

      <div className={cardClass}>
        <SectionHeader title={editing !== null ? 'UPDATE_TOOL' : 'ADD_NEW_TOOL'} />
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Field label="NAME">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} placeholder="REACT, GO, etc." />
          </Field>
          <Field label="VERSION">
            <input value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} className={inputClass} placeholder="v18.2.0, etc." />
          </Field>
          <Field label={`USAGE_LEVEL: ${form.usageLevel}%`}>
            <div className="flex items-center gap-4 h-12">
              <input 
                type="range" 
                min={0} 
                max={100} 
                value={form.usageLevel} 
                onChange={e => setForm(f => ({ ...f, usageLevel: Number(e.target.value) }))} 
                className="w-full h-1.5 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-sky-500 transition-all duration-200 border border-zinc-800/80 focus:outline-none" 
              />
            </div>
          </Field>
        </div>

        <div className="flex gap-6 border-t border-zinc-800 pt-6 mt-6">
          <button onClick={save} className={buttonPrimaryClass}>
            SAVE_TOOL
          </button>
          {editing !== null && (
            <button 
              onClick={() => { 
                const updated = tools.filter((_, i) => i !== editing); 
                setTools(updated); 
                localStorage.setItem('portfolioTechstack', JSON.stringify(updated)); 
                setEditing(null); 
                setForm({ name: '', version: '', usageLevel: 80 }); 
                onLog('TECH_DELETED'); 
              }} 
              className="text-xs text-red-500 hover:text-red-400 font-bold uppercase transition-colors ml-auto self-center"
            >
              DELETE
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
