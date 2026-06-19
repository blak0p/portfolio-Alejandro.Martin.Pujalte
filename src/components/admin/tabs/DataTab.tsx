import React, { useState, useEffect, useCallback } from 'react';
import { 
  inputClass, 
  cardClass 
} from '../components/UI';

const DATA_FILES = [
  { key: 'projects', label: 'PROJECTS', path: '/data/projects.json' },
  { key: 'techstack', label: 'TECHSTACK', path: '/data/techstack.json' },
  { key: 'identity', label: 'IDENTITY', path: '/data/identity.json' },
  { key: 'settings', label: 'SETTINGS', path: '/data/settings.json' },
  { key: 'ambitions', label: 'AMBITIONS', path: '/data/ambitions.json' },
] as const;

interface DataTabProps {
  onLog: (msg: string) => void;
}

export default function DataTab({ onLog }: DataTabProps) {
  const [selectedFile, setSelectedFile] = useState<typeof DATA_FILES[number]['key']>('projects');
  const [rawData, setRawData] = useState('');
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const loadFile = useCallback(async (key: typeof DATA_FILES[number]['key']) => {
    setLoading(true);
    try {
      const file = DATA_FILES.find(f => f.key === key);
      if (!file) return;
      
      const storageKey = `portfolio${key.charAt(0).toUpperCase() + key.slice(1)}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setRawData(stored);
      } else {
        const res = await fetch(file.path);
        if (res.ok) {
          const data = await res.json();
          setRawData(JSON.stringify(data, null, 2));
        }
      }
    } catch (e) {
      onLog(`LOAD_ERROR: ${key}`);
    } finally {
      setLoading(false);
    }
  }, [onLog]);

  useEffect(() => { loadFile(selectedFile); }, [loadFile, selectedFile]);

  function save() {
    setSaveStatus('saving');
    try {
      JSON.parse(rawData);
      
      const storageKey = `portfolio${selectedFile.charAt(0).toUpperCase() + selectedFile.slice(1)}`;
      localStorage.setItem(storageKey, rawData);
      
      setSaveStatus('saved');
      onLog(`SAVED: ${selectedFile.toUpperCase()}`);
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      setSaveStatus('error');
      onLog('JSON_ERROR: INVALID_SYNTAX');
    }
  }

  return (
    <div className="flex flex-col gap-10 font-mono">
      <header className="flex justify-between items-center border-b border-zinc-800 pb-3">
        <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">/ RAW_DATA_EDITOR</p>
      </header>
      
      <div className="flex flex-wrap gap-2">
        {DATA_FILES.map(f => (
          <button 
            key={f.key}
            onClick={() => setSelectedFile(f.key)}
            className={`px-4 py-2 text-[10px] font-bold tracking-widest uppercase transition-all duration-200 rounded-xl ${
              selectedFile === f.key 
                ? 'bg-sky-600 text-white shadow-[0_0_10px_rgba(56,189,248,0.2)]' 
                : 'border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 bg-zinc-950'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className={cardClass}>
        <div className="flex justify-between items-center mb-4">
          <p className="text-[10px] text-zinc-500 tracking-widest uppercase">{DATA_FILES.find(f => f.key === selectedFile)?.path}</p>
          <p className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${
            saveStatus === 'saved' ? 'text-green-400' : 
            saveStatus === 'error' ? 'text-red-400 animate-pulse' : 
            saveStatus === 'saving' ? 'text-sky-400 animate-pulse' : 'text-zinc-600'
          }`}>
            {saveStatus === 'saved' ? '✓ SAVED' : 
             saveStatus === 'error' ? '✕ ERROR' : 
             saveStatus === 'saving' ? 'SAVING...' : 'MEMORY_ONLY'}
          </p>
        </div>
        
        {loading ? (
          <div className="h-96 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <textarea
            value={rawData}
            onChange={e => { setRawData(e.target.value); setSaveStatus('idle'); }}
            className="w-full h-96 bg-zinc-950 border border-zinc-800/80 p-4 text-xs text-zinc-100 font-mono focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/10 rounded-2xl resize-none"
            spellCheck={false}
          />
        )}
        
        <div className="flex gap-4 mt-6 pt-6 border-t border-zinc-800">
          <button 
            onClick={save} 
            disabled={saveStatus === 'saving' || loading} 
            className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
          >
            SAVE_TO_MEMORY
          </button>
          <button 
            onClick={() => loadFile(selectedFile)} 
            disabled={loading} 
            className="px-6 py-2.5 border border-zinc-800 text-zinc-400 hover:text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all"
          >
            RELOAD
          </button>
          <button 
            onClick={() => { 
              try { 
                setRawData(JSON.stringify(JSON.parse(rawData), null, 2)); 
                onLog('FORMATTED'); 
              } catch(e) { 
                onLog('FORMAT_ERROR'); 
              }
            }} 
            className="px-6 py-2.5 border border-zinc-800 text-zinc-400 hover:text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ml-auto"
          >
            FORMAT
          </button>
        </div>
      </div>
      
      <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-xl">
        <p className="text-[10px] text-zinc-400 tracking-widest uppercase font-bold">⚠ EDITS ARE SAVED TO LOCAL MEMORY</p>
        <p className="text-[10px] text-zinc-500 mt-1">Use the PUBLISH tab to commit and push changes to the repository.</p>
      </div>
    </div>
  );
}
