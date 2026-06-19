import React, { useState, useEffect, useCallback } from 'react';
import type { Ambition } from '../../../types';
import { 
  inputClass, 
  buttonPrimaryClass, 
  buttonSecondaryClass, 
  cardClass, 
  Field, 
  CheckField, 
  SectionHeader 
} from '../components/UI';

interface AmbitionsTabProps {
  onLog: (msg: string) => void;
}

export default function AmbitionsTab({ onLog }: AmbitionsTabProps) {
  const [items, setItems] = useState<Ambition[]>([]);
  const [form, setForm] = useState({ text: '', completed: false });
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const load = useCallback(async () => {
    const stored = localStorage.getItem('portfolioAmbitions');
    if (stored) {
      setItems(JSON.parse(stored));
      return;
    }
    try {
      const res = await fetch('/data/ambitions.json');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setItems(data);
      }
    } catch (e) {}
  }, []);

  useEffect(() => { load(); }, [load]);

  function save() {
    if (!form.text) return;
    const item: Ambition = { 
      id: items[editingIdx ?? -1]?.id || String(Date.now()), 
      text: form.text, 
      completed: form.completed, 
      section: items[editingIdx ?? -1]?.section || 'short' 
    };
    const next = editingIdx !== null ? items.map((i, idx) => idx === editingIdx ? item : i) : [...items, item];
    setItems(next);
    localStorage.setItem('portfolioAmbitions', JSON.stringify(next));
    setForm({ text: '', completed: false });
    setEditingIdx(null);
    onLog('ROADMAP_UPDATED');
  }

  return (
    <div className="flex flex-col gap-10 font-mono">
      <header className="border-b border-zinc-800 pb-3">
        <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">/ STRATEGIC_ROADMAP</p>
      </header>
      
      <div className="flex flex-col gap-3">
        {items.map((i, idx) => (
          <button 
            key={idx} 
            onClick={() => { 
              setEditingIdx(idx); 
              setForm({ text: i.text, completed: i.completed }); 
            }} 
            className={`p-5 border text-left transition-all duration-300 flex items-center gap-6 rounded-2xl ${
              editingIdx === idx 
                ? 'border-sky-500 bg-sky-950/20 text-white shadow-[0_0_20px_rgba(56,189,248,0.15)]' 
                : 'border-zinc-800 bg-zinc-900/20 hover:border-zinc-700/50 hover:bg-zinc-900/40 text-zinc-300 hover:text-white'
            }`}
          >
            <div className={`w-5 h-5 border rounded-lg flex items-center justify-center transition-all duration-300 ${
              i.completed 
                ? (editingIdx === idx ? 'bg-white border-white text-zinc-950' : 'bg-sky-500 border-sky-500 text-zinc-950 shadow-[0_0_10px_rgba(56,189,248,0.4)]') 
                : 'border-zinc-800 bg-zinc-950'
            }`}>
              {i.completed && (
                <svg className="w-3 h-3 stroke-current stroke-[3.5px] fill-none" viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <span className="text-xs font-bold uppercase tracking-widest flex-1">{i.text}</span>
          </button>
        ))}
      </div>

      <div className={cardClass}>
        <SectionHeader title={editingIdx !== null ? 'EDIT_OBJECTIVE' : 'ADD_OBJECTIVE'} />
        
        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end">
          <div className="flex-1 w-full">
            <Field label="GOAL_DESCRIPTION">
              <input value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} className={inputClass} placeholder="Implement localized LLM caching proxy..." />
            </Field>
          </div>
          <div className="pb-3 px-2">
            <CheckField label="COMPLETED" value={form.completed} onChange={v => setForm(f => ({ ...f, completed: v }))} />
          </div>
        </div>

        <div className="flex gap-6 border-t border-zinc-800 pt-6 mt-6">
          <button onClick={save} className={buttonPrimaryClass}>
            SAVE_GOAL
          </button>
          {editingIdx !== null && (
            <button 
              onClick={() => { 
                const updated = items.filter((_, i) => i !== editingIdx); 
                setItems(updated); 
                localStorage.setItem('portfolioAmbitions', JSON.stringify(updated)); 
                setEditingIdx(null); 
                setForm({ text: '', completed: false }); 
                onLog('GOAL_DELETED'); 
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
