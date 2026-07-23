import React, { useState, useEffect } from 'react';
import type { BuildEntry } from '../../../types';
import { 
  cardClass, 
  SectionHeader 
} from '../components/UI';

interface PublishTabProps {
  onLog: (msg: string) => void;
}

export default function PublishTab({ onLog }: PublishTabProps) {
  const [publishing, setPublishing] = useState(false);
  const [builds, setBuilds] = useState<BuildEntry[]>([]);

  useEffect(() => { 
    const s = localStorage.getItem('portfolioBuildHistory'); 
    if (s) setBuilds(JSON.parse(s)); 
  }, []);

  async function publish() {
    setPublishing(true); 
    onLog('INIT_GLOBAL_SYNC...');
    try {
      // Identity data is included in keys to sync from local data editor if changed
      const keys = ['portfolioProjects', 'portfolioSettings', 'portfolioAmbitions', 'portfolioTechstack', 'portfolioIdentity', 'portfolioCommunity'];
      const files = keys
        .filter(k => !!localStorage.getItem(k))
        .map(k => ({ 
          path: `public/data/${k.replace('portfolio', '').toLowerCase()}.json`, 
          content: localStorage.getItem(k)! 
        }));
      
      if (files.length === 0) {
        onLog('SYNC_ABORTED: NO_LOCAL_CHANGES');
        setPublishing(false);
        return;
      }
      
      const changedTypes = files.map(f => {
        const name = f.path.split('/').pop()?.replace('.json', '') || '';
        if (name === 'projects') return 'projects';
        if (name === 'settings') return 'settings';
        if (name === 'ambitions') return 'roadmap';
        if (name === 'techstack') return 'techstack';
        if (name === 'identity') return 'identity';
        if (name === 'community') return 'community';
        return name;
      }).join(' + ').replace(' + ', ', ').replace(/, ([^,]*)$/, ' and $1');
      
      const buildNum = (builds[0]?.buildNumber ?? 0) + 1;
      const changedCount = files.length;
      const prefix = changedCount === 1 ? 'update' : 'full update';
      const message = `data: ${prefix} ${changedTypes}`;
      
      const res = await fetch('/api/github', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ action: 'publish', files, branch: 'main', buildNum, message })
      });
      
      if (!res.ok) throw new Error('BRIDGE_REJECTED');
      
      onLog('UPLINK_SUCCESS');
      
      const entry: BuildEntry = { 
        buildNumber: buildNum, 
        status: 'SUCCESS', 
        timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '), 
        files: files.map(f => f.path.split('/').pop()!) 
      };
      
      const next = [entry, ...builds].slice(0, 10); 
      localStorage.setItem('portfolioBuildHistory', JSON.stringify(next)); 
      setBuilds(next);
    } catch (e: any) { 
      onLog(`UPLINK_ERROR: ${e.message}`); 
    } finally { 
      setPublishing(false); 
    }
  }

  return (
    <div className="flex flex-col gap-12 font-mono">
      <div className={cardClass}>
        <SectionHeader title="DEPLOYMENT_BRIDGE" />
        <p className="text-xs text-zinc-400 tracking-wider mb-6 uppercase">Sync local state with production git repository.</p>
        
        <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl mb-6">
          <p className="text-[10px] text-zinc-500 tracking-widest uppercase mb-1">target_uplink:</p>
          <p className="text-xs text-sky-400 font-bold tracking-widest truncate">GITHUB REPOSITORY UPLINK</p>
        </div>

        <button 
          onClick={publish} 
          disabled={publishing} 
          className="w-full bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-mono text-xs font-bold tracking-widest uppercase py-5 rounded-xl shadow-[0_0_20px_rgba(56,189,248,0.15)] hover:shadow-[0_0_30px_rgba(56,189,248,0.3)] transition-all duration-300 disabled:opacity-50"
        >
          {publishing ? 'Publishing...' : 'Publish \u2191'}
        </button>
      </div>

      <div className="space-y-6">
        <p className="text-xs text-zinc-400 tracking-widest font-bold uppercase">/ BUILD_HISTORY</p>
        <div className="border border-zinc-800 bg-zinc-900/20 divide-y divide-zinc-800/80 shadow-2xl rounded-2xl overflow-hidden">
          {builds.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-600 uppercase tracking-widest">No history recorded</div>
          ) : builds.map(b => (
            <div key={b.buildNumber} className="px-8 py-5 flex items-center justify-between group hover:bg-zinc-900/40 transition-colors">
              <div className="flex items-center gap-6">
                <span className="text-sky-400 font-bold">#{b.buildNumber}</span>
                <span className="text-xs text-zinc-300 tracking-widest uppercase font-bold">{b.status}</span>
                <span className="text-xs text-zinc-500 font-sans">{b.timestamp}</span>
              </div>
              <span className="text-xs text-zinc-600 tracking-widest italic opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline">
                [{b.files.join(', ')}]
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
