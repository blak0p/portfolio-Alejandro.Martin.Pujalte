// AdminPanel.tsx - INDUSTRIAL RESPONSIVE EDITION (GITHUB AUTH)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Project, TechTool, Ambition, SiteSettings, BuildEntry, LogEntry } from '../../types';
import { logActivity } from '../../lib/activityLog';

const SESSION_KEY   = 'admin_session';
const SESSION_TS    = 'admin_session_ts';
const SESSION_TTL   = 60 * 60 * 1000; // 1 hour

interface StackUsage {
  name: string;
  color: string;
  usageLevel: number;
}

interface GitHubDetails {
  id: string;
  name: string;
  photo: string;
  specsDescription: string;
  specsLanguage: string;
  specsStars: string | number;
  specsRepo: string;
  specsRepoSlug: string;
  specsStatus: string;
  pushedAt: string;
  stack: string;
  stackWithUsage?: StackUsage[];
  architecture: string;
}

/* --- Utilities --- */

function isSessionValid(): boolean {
  if (typeof window === 'undefined') return false;
  if (sessionStorage.getItem(SESSION_KEY) !== 'true') return false;
  const ts = Number(sessionStorage.getItem(SESSION_TS) ?? 0);
  if (Date.now() - ts > SESSION_TTL) {
    sessionStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_TS);
    return false;
  }
  return true;
}

/* --- Styled Components --- */

const inputClass = "bg-white/5 border border-white/10 px-4 py-2 text-base text-white font-mono w-full focus:outline-none focus:border-cobalt/40 transition-colors duration-100 placeholder:opacity-20 rounded";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-white/70 tracking-[0.2em] uppercase font-black">/ {label}{required && <span className="text-cobalt ml-1">*</span>}</label>
      {children}
    </div>
  );
}

function CheckField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none group">
      <div className={`w-4 h-4 border ${value ? 'bg-cobalt border-cobalt shadow-[0_0_10px_rgba(0,85,255,0.3)]' : 'border-white/20 group-hover:border-white/70'} transition-all flex items-center justify-center`}>
        {value && <span className="text-xs text-white">✓</span>}
      </div>
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} className="hidden" />
      <span className="text-xs text-white/85 tracking-widest uppercase group-hover:text-white transition-colors">{label}</span>
    </label>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-3 mb-8">
      <h2 className="text-base text-white font-black tracking-[0.3em] uppercase leading-none">{title}</h2>
      <div className="h-px w-full bg-linear-to-r from-cobalt via-white/10 to-transparent" />
    </div>
  );
}

/* --- GitHub Auth Gate --- */

function GitHubAuthGate({ onAuth }: { onAuth: () => void }) {
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
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center font-mono select-none p-6">
      <div className="flex flex-col gap-12 w-full max-w-md p-12 border border-white/10 bg-[#121212] shadow-2xl relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cobalt/10 blur-[60px] rounded-full" />
        
        <div className="relative z-10 flex flex-col gap-4">
          <p className="text-sm text-cobalt font-black tracking-[0.5em] uppercase">SYSTEM_ACCESS // LOGIN</p>
          <div className="h-px bg-white/10 w-full" />
        </div>

        <div className="relative z-10 flex flex-col gap-10">
          <div className="flex flex-col gap-4 text-center">
            <p className="text-white/85 text-sm leading-relaxed tracking-widest uppercase">
              Authorization required to access the central core management bridge.
            </p>
            {error && <p className="text-err text-xs font-black tracking-widest uppercase animate-pulse">!! {error}</p>}
          </div>

          <button 
            onClick={login} 
            disabled={loading} 
            className="w-full py-5 bg-white/5 border border-white/10 text-white text-sm font-black uppercase tracking-[0.3em] hover:bg-cobalt hover:border-cobalt transition-all shadow-lg active:scale-[0.98]"
          >
            {loading ? 'SYNCING_UPLINK...' : 'AUTHORIZE_WITH_GITHUB \u2192'}
          </button>
        </div>

        <div className="relative z-10 flex justify-between items-center opacity-20">
          <span className="text-xs text-white tracking-widest">v4.2.1 Stable</span>
          <span className="text-xs text-white tracking-widest uppercase">Encrypted Session</span>
        </div>
      </div>
    </div>
  );
}

/* --- Repo Importer Modal --- */

function RepoImportModal({ onClose, onImport, existingSlugs }: { onClose: () => void, onImport: (repo: any) => void, existingSlugs: string[] }) {
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [importing, setImporting] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/github', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'getUserRepos' }) })
      .then(r => r.json())
      .then(data => setRepos(data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = Array.isArray(repos) ? repos.filter(r => 
    !existingSlugs.includes(r.fullName) && 
    (r.name.toLowerCase().includes(filter.toLowerCase()) || r.description?.toLowerCase().includes(filter.toLowerCase()))
  ) : [];

  // Import con datos completos desde GitHub (como sync)
  const handleImport = async (repo: any) => {
    setImporting(repo.fullName);
    try {
      // Llamar a getRepoDetails para traer stackWithUsage completo
      const res = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getRepoDetails', repoSlug: repo.fullName })
      });
      if (!res.ok) throw new Error('Failed');
      const details = await res.json();
      
      // Pasar todo al onImport
      onImport({
        ...repo,
        stackWithUsage: details.stackWithUsage || [],
        specs: {
          status: 'STABLE',
          stars: details.specsStars || repo.stars,
          language: details.specsLanguage || repo.language,
          repo: details.specsRepo || repo.url,
          repoSlug: details.specsRepoSlug || repo.fullName,
          stackWithUsage: details.stackWithUsage || []
        },
        isPrivate: details.isPrivate || repo.private
      });
    } catch (e) {
      console.error('Import error:', e);
      // Fallback basico
      onImport(repo);
    } finally {
      setImporting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-[#1a1a1a] border border-white/10 flex flex-col max-h-[90vh] shadow-2xl rounded-xl">
        <header className="p-6 sm:p-8 border-b border-white/15 flex justify-between items-center bg-[#121212] rounded-t-xl">
          <h2 className="text-base text-white font-black tracking-[0.3em] uppercase leading-none">Import_GitHub_Repos</h2>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-white transition-colors">✕</button>
        </header>
        
        <div className="p-6 sm:p-8 border-b border-white/15">
          <input 
            type="text" 
            placeholder="Filter repositories..." 
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-full bg-white/5 border border-white/10 p-4 text-sm text-white focus:outline-none focus:border-cobalt rounded"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {loading ? (
            <div className="h-60 flex flex-col gap-4 items-center justify-center text-xs tracking-widest text-white/20 uppercase">
              <div className="w-8 h-8 border-2 border-cobalt border-t-transparent rounded-full animate-spin" />
              Scanning_Uplink...
            </div>
          ) : filtered.length === 0 ? (
            <div className="h-60 flex items-center justify-center text-xs tracking-widest text-white/20 uppercase">No_Available_Modules</div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {filtered.map(r => (
                <div key={r.fullName} className="p-4 border border-white/15 bg-white/[0.06] flex items-center justify-between group hover:border-white/10 transition-all rounded-lg">
                  <div className="flex flex-col gap-1 overflow-hidden pr-4">
                    <span className="text-sm font-black text-white truncate">{r.name}</span>
                    <span className="text-xs text-white/70 truncate">{r.fullName}</span>
                  </div>
                  <button 
                    onClick={() => handleImport(r)}
                    disabled={importing === r.fullName}
                    className="px-6 py-2 bg-cobalt text-white text-xs font-black uppercase hover:bg-cobalt-light transition-all shrink-0 rounded disabled:opacity-50"
                  >
                    {importing === r.fullName ? '...' : 'Import'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* --- Projects Tab --- */

const emptyProject = {
  name: '', gitUrl: '', photo: '', video: '', stack: '', architecture: '', initSequence: '', description: '', businessImpact: '',
  specsStatus: '', specsStars: '', specsLanguage: '', specsLicense: '', specsDescription: '', specsRepo: '', specsRepoSlug: '', specsDemo: '', specsTags: '', stackWithUsage: '',
  isHighlighted: false, isPrivate: false, isFavorite: false, pushedAt: '', order: 0
};

function ProjectsTab({ onLog }: { onLog: (msg: string) => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState(emptyProject);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    // JSON-first: load from published data (authoritative source)
    try {
      const res = await fetch('/data/projects.json');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setProjects(data);
          // Also sync to localStorage for editing
          localStorage.setItem('portfolioProjects', JSON.stringify(data));
          return;
        }
      }
    } catch (e) {
      console.warn('Projects load: JSON fetch failed, falling back to localStorage');
    }
    
    // Fallback to localStorage only if JSON fails
    const stored = localStorage.getItem('portfolioProjects');
    if (stored) {
      setProjects(JSON.parse(stored));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleImport = (r: any) => {
    // Usar stackWithUsage si viene del import detallado
    const stackWithUsage = r.stackWithUsage || r.specs?.stackWithUsage || [];
    
    const newProj: Project = {
      id: String(Date.now()),
      name: r.name.toUpperCase(),
      description: r.description || '',
      photo: r.photo || '',
      stack: (r.stackWithUsage || r.language || '').split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean),
      stackWithUsage,
      architecture: '',
      initSequence: '',
      specs: {
        status: r.specs?.status || 'STABLE',
        stars: r.specs?.stars || r.stars || 0,
        language: r.specs?.language || r.language || '',
        repo: r.specs?.repo || r.url || '',
        repoSlug: r.specs?.repoSlug || r.fullName || '',
        stackWithUsage
      },
      pushedAt: r.pushedAt,
      isPrivate: r.isPrivate || r.private || false,
      isFavorite: false,
      isHighlighted: false
    };
    
    const next = [...projects, newProj];
    setProjects(next);
    localStorage.setItem('portfolioProjects', JSON.stringify(next));
    onLog(`MODULE_IMPORTED: ${r.name}`);
    setShowImport(false);
  };

  async function fetchGitHub() {
    const urlMatch = form.gitUrl.trim().match(/github\.com\/([^/]+)\/([^/\s]+)/);
    if (!urlMatch) { onLog('ERROR: INVALID_URL'); return; }
    const repoSlug = `${urlMatch[1]}/${urlMatch[2].replace(/\.git$/, '')}`;
    setScanLoading(true); onLog(`SCANNING: ${repoSlug}...`);
    try {
      const res = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getRepoDetails', repoSlug })
      });
      if (!res.ok) throw new Error(`GH_${res.status}`);
      const r = await res.json() as GitHubDetails;
      
      // Guardar stackWithUsage como JSON string
      const stackWithUsageStr = r.stackWithUsage ? JSON.stringify(r.stackWithUsage) : '';
      
      setForm(f => ({
        ...f,
        name: f.name || r.name,
        photo: f.photo || r.photo,
        specsDescription: r.specsDescription,
        specsLanguage: r.specsLanguage,
        specsStars: String(r.specsStars),
        specsRepo: r.specsRepo,
        specsRepoSlug: r.specsRepoSlug,
        specsStatus: r.specsStatus,
        pushedAt: r.pushedAt,
        stack: r.stack,
        stackWithUsage: stackWithUsageStr,
        architecture: r.architecture || f.architecture
      }));
      onLog(`SYNC_SUCCESS: ${repoSlug}`);
    } catch (e: any) { onLog(`SYNC_FAILED: ${e.message}`); }
    finally { setScanLoading(false); }
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setForm(f => ({ ...f, photo: reader.result as string })); onLog(`IMAGE_BUFFERED: ${file.name}`); };
    reader.readAsDataURL(file);
  }

  function save() {
    if (!form.name.trim()) { onLog('ERROR: NAME_REQUIRED'); return; }
    
    // Parse stackWithUsage from form
    let savedStackWithUsage: StackUsage[] = [];
    try {
      if (form.stackWithUsage) {
        savedStackWithUsage = JSON.parse(form.stackWithUsage);
      }
    } catch {}
    
    const p: Project = { 
      id: projects[editingIdx ?? -1]?.id || String(Date.now()), 
      name: form.name.toUpperCase(), 
      photo: form.photo, 
      stack: form.stack.split(',').map(s => s.trim().toUpperCase()).filter(Boolean),
      stackWithUsage: savedStackWithUsage,
      architecture: form.architecture, 
      initSequence: form.initSequence, 
      description: form.description, 
      businessImpact: form.businessImpact, 
      specs: { 
        status: form.specsStatus, 
        stars: form.specsStars, 
        language: form.specsLanguage, 
        license: form.specsLicense, 
        description: form.specsDescription, 
        repo: form.specsRepo, 
        repoSlug: form.specsRepoSlug, 
        demo: form.specsDemo, 
        tags: form.specsTags.split(',').filter(Boolean), 
        video: form.video,
        stackWithUsage: savedStackWithUsage
      }, 
      isHighlighted: form.isHighlighted, 
      isFavorite: form.isFavorite, 
      isPrivate: form.isPrivate, 
      pushedAt: form.pushedAt || undefined, 
      order: Number(form.order) || 0 
    };
    const next = editingIdx !== null ? projects.map((x, i) => i === editingIdx ? p : x) : [...projects, p];
    localStorage.setItem('portfolioProjects', JSON.stringify(next));
    setProjects(next); onLog(`MODULE_COMMITTED: ${p.name}`);
  }

  function select(idx: number) {
    const p = projects[idx];
    setEditingIdx(idx);
    setForm({ 
      ...emptyProject, 
      name: p.name, 
      photo: p.photo, 
      video: (p.specs?.video as string) || '', 
      stack: p.stack.join(', '), 
      architecture: p.architecture, 
      initSequence: p.initSequence, 
      description: p.description ?? '', 
      businessImpact: p.businessImpact ?? '', 
      specsStatus: (p.specs?.status as string) || '', 
      specsStars: (p.specs?.stars as string) || '', 
      specsLanguage: (p.specs?.language as string) || '', 
      specsLicense: (p.specs?.license as string) || '', 
      specsDescription: (p.specs?.description as string) || '', 
      specsRepo: (p.specs?.repo as string) || '', 
      specsRepoSlug: (p.specs?.repoSlug as string) || '', 
      specsDemo: (p.specs?.demo as string) || '', 
      specsTags: Array.isArray(p.specs?.tags) ? p.specs.tags.join(', ') : '', 
      isHighlighted: !!p.isHighlighted, 
      isFavorite: !!p.isFavorite, 
      isPrivate: !!p.isPrivate, 
      pushedAt: p.pushedAt || '', 
      order: p.order || 0,
      gitUrl: (p.specs?.repo as string) || ''
    });
  }

  const existingSlugs = projects.map(p => {
    const slug = p.specs?.repoSlug;
    return typeof slug === 'string' ? slug : '';
  }).filter(Boolean);

  return (
    <div className="flex flex-col gap-12">
      {showImport && <RepoImportModal existingSlugs={existingSlugs} onImport={handleImport} onClose={() => setShowImport(false)} />}
      
      <div className="flex flex-col gap-6">
        <header className="flex justify-between items-center border-b border-white/15 pb-3">
          <p className="text-sm text-white font-black tracking-widest uppercase">/ MODULE_REPOSITORY</p>
          <div className="flex gap-4 sm:gap-6 items-center">
            <button onClick={() => setShowImport(true)} className="text-xs text-cobalt font-black tracking-widest hover:underline uppercase transition-all">[IMPORT_SELECTIVE]</button>
            <button onClick={() => { setEditingIdx(null); setForm(emptyProject); }} className="text-xs text-white/70 hover:text-white tracking-widest font-black uppercase">[+] NEW</button>
          </div>
        </header>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {projects.map((p, i) => (
            <button key={i} onClick={() => select(i)} className={`p-4 border text-left transition-all rounded-lg ${editingIdx === i ? 'border-cobalt bg-cobalt/10 text-white shadow-[0_0_20px_rgba(0,85,255,0.15)]' : 'border-white/15 bg-white/[0.06] hover:border-white/20 text-white/85'}`}>
              <p className="text-xs font-black uppercase truncate leading-tight">{p.name}</p>
              <div className="flex justify-between items-center opacity-30 mt-2">
                <p className="text-xs tracking-widest uppercase">ORDER_{p.order}</p>
                {p.isFavorite && <span className="text-xs">★</span>}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#1a1a1a] border border-white/10 p-6 sm:p-10 shadow-2xl rounded-xl">
        <SectionHeader title={editingIdx !== null ? `TERMINAL_CONFIG: ${projects[editingIdx].name}` : 'INITIALIZING_DATA'} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
          <Field label="NAME" required><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} placeholder="SYSTEM_MODULE" /></Field>
          
          <div className="col-span-1 md:col-span-2 flex flex-col sm:flex-row gap-4">
            <div className="flex-1"><Field label="GITHUB_ENDPOINT"><input value={form.gitUrl} onChange={e => setForm(f => ({ ...f, gitUrl: e.target.value }))} className={inputClass} placeholder="https://github.com/..." /></Field></div>
            <button onClick={fetchGitHub} disabled={scanLoading} className="sm:self-end px-8 py-3 bg-cobalt text-white text-xs font-black tracking-widest hover:bg-cobalt-light uppercase transition-all shadow-[0_0_15px_rgba(0,85,255,0.2)] rounded">{scanLoading ? 'SCANNING...' : 'SYNC_METADATA'}</button>
          </div>

          <div className="col-span-1 md:col-span-2 flex flex-wrap gap-x-10 gap-y-4 border-y border-white/15 py-8 my-2">
            <CheckField label="DESTACADO" value={form.isHighlighted} onChange={v => setForm(f => ({ ...f, isHighlighted: v }))} />
            <CheckField label="FIJADO" value={form.isFavorite} onChange={v => setForm(f => ({ ...f, isFavorite: v }))} />
            <CheckField label="PRIVADO" value={form.isPrivate} onChange={v => setForm(f => ({ ...f, isPrivate: v }))} />
          </div>

          <Field label="OVERVIEW_BRIEF"><input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputClass} /></Field>
          <Field label="BUSINESS_IMPACT"><input value={form.businessImpact} onChange={e => setForm(f => ({ ...f, businessImpact: e.target.value }))} className={inputClass} /></Field>
          
          <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-10 pt-4">
            <div className="space-y-4">
              <Field label="VISUAL_ASSET [IMG]">
                <div className="flex gap-2">
                  <input value={form.photo} onChange={e => setForm(f => ({ ...f, photo: e.target.value }))} className={`${inputClass} flex-1`} />
                  <button onClick={() => photoInputRef.current?.click()} className="px-4 py-1 border border-white/10 text-white/70 text-xs hover:text-white uppercase transition-all rounded">↑</button>
                  <input ref={photoInputRef} type="file" className="hidden" onChange={handlePhotoUpload} />
                </div>
              </Field>
              {form.photo && <div className="border border-white/10 p-2 bg-black/40 rounded overflow-hidden"><img src={form.photo} className="h-32 w-full object-cover grayscale opacity-60" /></div>}
            </div>
            <div className="space-y-4">
              <Field label="STREAM_SOURCE [VIDEO]"><input value={form.video} onChange={e => setForm(f => ({ ...f, video: e.target.value }))} className={inputClass} /></Field>
            </div>
          </div>

          <div className="col-span-1 md:col-span-2"><Field label="SYSTEM_ARCHITECTURE"><textarea value={form.architecture} onChange={e => setForm(f => ({ ...f, architecture: e.target.value }))} className={`${inputClass} h-24 resize-none`} /></Field></div>
          <div className="col-span-1 md:col-span-2"><Field label="INIT_SEQUENCE"><textarea value={form.initSequence} onChange={e => setForm(f => ({ ...f, initSequence: e.target.value }))} className={`${inputClass} h-16 resize-none`} /></Field></div>

          <Field label="TECH_STACK (CSV)"><input value={form.stack} onChange={e => setForm(f => ({ ...f, stack: e.target.value }))} className={inputClass} /></Field>
          <Field label="STATUS">
            <select value={form.specsStatus} onChange={e => setForm(f => ({ ...f, specsStatus: e.target.value }))} className={inputClass}>
              <option value="">— SELECT_STATUS —</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="PAUSED">PAUSED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </Field>
          <Field label="STARS"><input value={form.specsStars} onChange={e => setForm(f => ({ ...f, specsStars: e.target.value }))} className={inputClass} /></Field>
          <Field label="LANGUAGE"><input value={form.specsLanguage} onChange={e => setForm(f => ({ ...f, specsLanguage: e.target.value }))} className={inputClass} /></Field>
          <Field label="LICENSE"><input value={form.specsLicense} onChange={e => setForm(f => ({ ...f, specsLicense: e.target.value }))} className={inputClass} /></Field>
          <Field label="REPO_SLUG"><input value={form.specsRepoSlug} onChange={e => setForm(f => ({ ...f, specsRepoSlug: e.target.value }))} className={inputClass} /></Field>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row items-center gap-6 sm:gap-10 border-t border-white/15 pt-10">
          <button onClick={save} className="w-full sm:w-auto bg-cobalt text-white text-sm font-black tracking-[0.3em] uppercase px-12 py-5 hover:bg-cobalt-light transition-all shadow-[0_0_30px_rgba(0,85,255,0.2)] rounded">COMMIT_CHANGES [CTRL+S]</button>
          {editingIdx !== null && <button onClick={() => { if(confirm('DECOMMISSION?')) { const n = projects.filter((_, i) => i !== editingIdx); localStorage.setItem('portfolioProjects', JSON.stringify(n)); load(); setEditingIdx(null); } }} className="text-xs text-err opacity-50 hover:opacity-100 tracking-widest uppercase transition-colors">DECOMMISSION</button>}
        </div>
      </div>
    </div>
  );
}

/* --- Tech Tab --- */

function TechTab({ onLog }: { onLog: (msg: string) => void }) {
  const [tools, setTools] = useState<TechTool[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', version: '', usageLevel: 80 });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    // localStorage first
    const stored = localStorage.getItem('portfolioTechstack');
    if (stored) {
      setTools(JSON.parse(stored));
      return;
    }
    // Fallback to JSON
    try {
      const res = await fetch('/data/techstack.json');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) setTools(data);
      }
    } catch (e) { console.warn('TechStack load: JSON fallback'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Explicit SAVE function
  function saveToMemory() {
    if (tools.length > 0) {
      localStorage.setItem('portfolioTechstack', JSON.stringify(tools));
      onLog(`SAVED: ${tools.length} technologies to localStorage`);
    }
  }

  async function scanAll() {
    // Read from localStorage first, then fallback to data
    let projectsLocal: Project[] = [];
    
    const stored = localStorage.getItem('portfolioProjects');
    if (stored) {
      projectsLocal = JSON.parse(stored);
    } else {
      try {
        const res = await fetch('/data/projects.json');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) projectsLocal = data;
        }
      } catch (e) {}
    }
    
    if (projectsLocal.length === 0) {
      onLog('NO_PROJECTS_FOUND');
      return;
    }
    
    // Tomar los PRIMEROS 5 proyectos (orden de la lista)
    const top5 = projectsLocal.slice(0, 5);
    
    // Calcular media solo de esos 5
    const totals: Record<string, { sum: number; count: number }> = {};
    for (const p of top5) {
      const stackData = p.stackWithUsage || p.specs?.stackWithUsage;
      if (stackData && stackData.length > 0) {
        for (const s of stackData) {
          const clean = s.name?.toString().toUpperCase().trim();
          if (clean) {
            totals[clean] = totals[clean] || { sum: 0, count: 0 };
            totals[clean].sum += s.usageLevel || 0;
            totals[clean].count += 1;
          }
        }
      } else {
        const stack = p.stack || [];
        for (const item of stack) {
          const clean = item.toString().toUpperCase().trim();
          if (clean) {
            totals[clean] = totals[clean] || { sum: 0, count: 0 };
            totals[clean].count += 1;
          }
        }
      }
    }
    
    const sorted = Object.entries(totals)
      .map(([n, v]) => ({ name: n.toUpperCase(), usageLevel: Math.round(v.sum / v.count) }))
      .sort((a, b) => b.usageLevel - a.usageLevel);
    
    const derived: TechTool[] = sorted.map(s => ({ name: s.name, version: '', usageLevel: s.usageLevel }));
    
    setTools(derived); 
    localStorage.setItem('portfolioTechstack', JSON.stringify(derived));
    onLog(`SCAN_COMPLETE: ${sorted.length} TECHNOLOGIES (TOP 5)`);
  }

  function save() {
    if (!form.name) return;
    const tool: TechTool = { ...form, name: form.name.toUpperCase() };
    const next = editing !== null ? tools.map((t, i) => i === editing ? tool : t) : [...tools, tool];
    setTools(next); localStorage.setItem('portfolioTechstack', JSON.stringify(next));
    setForm({ name: '', version: '', usageLevel: 80 }); setEditing(null); onLog(`TECH_SAVED: ${tool.name}`);
  }

  return (
    <div className="flex flex-col gap-10">
      <header className="flex justify-between items-center border-b border-white/15 pb-3">
        <p className="text-sm text-white font-black tracking-widest uppercase">/ TECH_MATRIX_REGISTRY</p>
        <button onClick={scanAll} disabled={loading} className="text-xs text-cobalt hover:underline uppercase transition-all tracking-widest">{loading ? 'SYNCING...' : '[SYNC_LOCAL]'}</button>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {tools.map((t, i) => (
          <button key={i} onClick={() => { setEditing(i); setForm({ name: t.name, version: t.version, usageLevel: t.usageLevel }); }} className={`p-6 border text-left transition-all rounded-lg ${editing === i ? 'border-cobalt bg-cobalt/10 text-white shadow-lg' : 'border-white/15 bg-white/[0.06] hover:border-white/20 text-white'}`}>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm font-black uppercase">{t.name}</p>
              <span className={`text-sm font-black ${editing === i ? 'text-white' : 'text-cobalt'}`}>{t.usageLevel}%</span>
            </div>
            <div className={`h-1.5 w-full rounded-full ${editing === i ? 'bg-white/20' : 'bg-white/5'}`}><div className={`h-full rounded-full ${editing === i ? 'bg-white' : 'bg-cobalt'} transition-all`} style={{ width: `${t.usageLevel}%` }} /></div>
          </button>
        ))}
      </div>
      <div className="bg-[#1a1a1a] border border-white/10 p-6 sm:p-10 space-y-8 shadow-2xl rounded-xl">
        <SectionHeader title={editing !== null ? 'UPDATE_TOOL' : 'ADD_NEW_TOOL'} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <Field label="NAME"><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} /></Field>
          <Field label="VERSION"><input value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} className={inputClass} /></Field>
          <Field label="USAGE_%"><input type="number" value={form.usageLevel} onChange={e => setForm(f => ({ ...f, usageLevel: Number(e.target.value) }))} className={inputClass} /></Field>
        </div>
        <div className="flex gap-6 border-t border-white/15 pt-8">
          <button onClick={save} className="px-10 py-3 bg-cobalt text-white text-xs font-black uppercase tracking-widest rounded">SAVE_TOOL</button>
          {editing !== null && <button onClick={() => { const updated = tools.filter((_, i) => i !== editing); setTools(updated); localStorage.setItem('portfolioTechstack', JSON.stringify(updated)); setEditing(null); setForm({ name: '', version: '', usageLevel: 80 }); onLog('DELETED'); }} className="text-err opacity-50 hover:opacity-100 text-xs font-black uppercase tracking-widest ml-auto">DELETE</button>}
        </div>
      </div>
    </div>
  );
}

/* --- Ambitions Tab --- */

function AmbitionsTab({ onLog }: { onLog: (msg: string) => void }) {
  const [items, setItems] = useState<Ambition[]>([]);
  const [form, setForm] = useState({ text: '', completed: false });
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const load = useCallback(async () => {
    // localStorage first
    const stored = localStorage.getItem('portfolioAmbitions');
    if (stored) {
      setItems(JSON.parse(stored));
      return;
    }
    // Fallback to JSON
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
    setItems(next); localStorage.setItem('portfolioAmbitions', JSON.stringify(next));
    setForm({ text: '', completed: false }); setEditingIdx(null); onLog('ROADMAP_UPDATED');
  }

  return (
    <div className="flex flex-col gap-10">
      <header className="border-b border-white/15 pb-3"><p className="text-sm text-white font-black tracking-widest uppercase">/ STRATEGIC_ROADMAP</p></header>
      <div className="flex flex-col gap-2">
        {items.map((i, idx) => (
          <button key={idx} onClick={() => { setEditingIdx(idx); setForm({ text: i.text, completed: i.completed }); }} className={`p-5 border text-left transition-all flex items-center gap-6 rounded-lg ${editingIdx === idx ? 'border-cobalt bg-cobalt/10 text-white shadow-lg' : 'border-white/15 bg-white/[0.06] hover:border-white/20 text-white'}`}>
            <div className={`w-5 h-5 border rounded flex items-center justify-center transition-all ${i.completed ? (editingIdx === idx ? 'bg-white border-white' : 'bg-cobalt border-cobalt') : 'border-white/20'}`}>
                {i.completed && <span className={`text-sm ${editingIdx === idx ? 'text-cobalt' : 'text-white'}`}>✓</span>}
            </div>
            <span className="text-sm font-black uppercase tracking-wide flex-1">{i.text}</span>
          </button>
        ))}
      </div>
      <div className="bg-[#1a1a1a] border border-white/10 p-6 sm:p-10 space-y-8 shadow-2xl rounded-xl">
        <SectionHeader title={editingIdx !== null ? 'EDIT_OBJECTIVE' : 'ADD_OBJECTIVE'} />
        <div className="flex flex-col sm:flex-row gap-8 items-start sm:items-end">
          <div className="flex-1 w-full"><Field label="GOAL_DESCRIPTION"><input value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} className={inputClass} /></Field></div>
          <div className="pb-2"><CheckField label="COMPLETED" value={form.completed} onChange={v => setForm(f => ({ ...f, completed: v }))} /></div>
        </div>
        <div className="flex gap-6 border-t border-white/15 pt-8">
          <button onClick={save} className="px-10 py-3 bg-cobalt text-white text-xs font-black uppercase tracking-widest rounded">SAVE_GOAL</button>
          {editingIdx !== null && <button onClick={() => { const updated = items.filter((_, i) => i !== editingIdx); setItems(updated); localStorage.setItem('portfolioAmbitions', JSON.stringify(updated)); setEditingIdx(null); setForm({ text: '', completed: false }); onLog('DELETED'); }} className="text-err opacity-50 hover:opacity-100 text-xs font-black uppercase tracking-widest ml-auto">DELETE</button>}
        </div>
      </div>
    </div>
  );
}

/* --- Settings Tab --- */

function SettingsTab({ onLog }: { onLog: (msg: string) => void }) {
  const [settings, setSettings] = useState<SiteSettings>({ 
    availabilityValue: 99.9, 
    status: 'ONLINE', 
    logLimit: 10, 
    cvUrl: '',
    dustThresholdDays: 60,
    starsForGold: 5
  });
  const [cvLoading, setCvLoading] = useState(false);

  const load = useCallback(async () => {
    // localStorage first
    const stored = localStorage.getItem('portfolioSettings');
    if (stored) {
      setSettings(JSON.parse(stored));
      return;
    }
    // Fallback to JSON
    try {
      const res = await fetch('/data/settings.json');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (e) {}
  }, []);
  useEffect(() => { load(); }, [load]);

  function update(partial: Partial<SiteSettings>) {
    const next = { ...settings, ...partial }; setSettings(next);
    localStorage.setItem('portfolioSettings', JSON.stringify(next));
    onLog(`PARAM_MODIFIED: ${Object.keys(partial)[0].toUpperCase()}`);
  }

  async function uploadCv(e: any) {
    const file = e.target.files?.[0]; if (!file) return;
    setCvLoading(true); onLog('UPLOADING_CV...');
    try {
      const reader = new FileReader();
      const b64 = await new Promise(r => { reader.onload = () => r((reader.result as string).split(',')[1]); reader.readAsDataURL(file); });
      const res = await fetch('/api/github', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'uploadCv', base64: b64, repo: import.meta.env.PUBLIC_GITHUB_REPO }) });
      if (!res.ok) throw new Error('API_REJECTED');
      update({ cvUrl: '/cv.pdf' }); onLog('CV_UPLOAD_SUCCESS');
    } catch (e: any) { onLog(`CV_UPLOAD_ERROR: ${e.message}`); }
    finally { setCvLoading(false); }
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="bg-[#1a1a1a] border border-white/10 p-6 sm:p-10 space-y-10 shadow-2xl rounded-xl">
          <p className="text-sm text-white font-black tracking-widest uppercase opacity-40">/ MASTER_CONTROLS</p>
          <div className="space-y-8">
            <Field label="AVAILABILITY (%)"><input type="range" min={0} max={100} step={0.1} value={settings.availabilityValue} onChange={e => update({ availabilityValue: Number(e.target.value) })} className="w-full accent-cobalt h-1.5 bg-white/5 appearance-none rounded-full" /></Field>
            <Field label="SYSTEM_STATUS"><select value={settings.status} onChange={e => update({ status: e.target.value as any })} className={inputClass}><option value="ONLINE">ONLINE</option><option value="BUSY">BUSY</option><option value="OFFLINE">OFFLINE</option></select></Field>
            <Field label="LOG_LIMIT"><input type="number" value={settings.logLimit} onChange={e => update({ logLimit: Number(e.target.value) })} className={inputClass} /></Field>
          </div>
        </div>
        <div className="bg-[#1a1a1a] border border-white/10 p-6 sm:p-10 space-y-10 shadow-2xl rounded-xl">
          <p className="text-sm text-white font-black tracking-widest uppercase opacity-40">/ ENGINE_PARAMS</p>
          <div className="space-y-10">
            <Field label={`DUST_THRESHOLD: ${settings.dustThresholdDays} DAYS`}><input type="range" min={7} max={365} value={settings.dustThresholdDays} onChange={e => update({ dustThresholdDays: Number(e.target.value) })} className="w-full accent-warn h-1.5 bg-white/5 appearance-none rounded-full" /></Field>
            <Field label={`GOLD_REQUIREMENT: ${settings.starsForGold} STARS`}><input type="range" min={0} max={50} value={settings.starsForGold} onChange={e => update({ starsForGold: Number(e.target.value) })} className="w-full accent-bronze h-1.5 bg-white/5 appearance-none rounded-full" /></Field>
          </div>
        </div>
        <div className="bg-[#1a1a1a] border border-white/10 p-6 sm:p-10 space-y-10 shadow-2xl col-span-1 md:col-span-2 rounded-xl">
          <p className="text-sm text-white font-black tracking-widest uppercase opacity-40">/ ASSETS_&_CACHE</p>
          <div className="space-y-8">
            <Field label="CV_ENDPOINT">
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <input value={settings.cvUrl} readOnly className={`${inputClass} flex-1 text-white/70`} />
                <input type="file" onChange={uploadCv} className="hidden" id="cv-up" />
                <label htmlFor="cv-up" className="w-full sm:w-auto px-10 py-3 border border-white/10 bg-white/5 text-white text-xs font-black uppercase cursor-pointer hover:bg-white hover:text-black transition-all rounded text-center">{cvLoading ? '...' : 'UPLOAD_PDF'}</label>
              </div>
            </Field>
            <div className="pt-6 border-t border-white/15">
              <button onClick={() => { if(confirm('RESET?')) { localStorage.clear(); window.location.reload(); } }} className="w-full py-4 border border-err/30 text-err text-xs font-black uppercase hover:bg-err/5 transition-all rounded tracking-[0.2em]">FACTORY_RESET_CACHE</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --- Publish Tab --- */

function PublishTab({ onLog }: { onLog: (msg: string) => void }) {
  const repo = import.meta.env.PUBLIC_GITHUB_REPO;
  const [publishing, setPublishing] = useState(false);
  const [builds, setBuilds] = useState<BuildEntry[]>([]);

  useEffect(() => { const s = localStorage.getItem('portfolioBuildHistory'); if (s) setBuilds(JSON.parse(s)); }, []);

  async function publish() {
    setPublishing(true); onLog('INIT_GLOBAL_SYNC...');
    try {
      const keys = ['portfolioProjects', 'portfolioSettings', 'portfolioAmbitions', 'portfolioTechstack'];
      const files = keys.filter(k => !!localStorage.getItem(k)).map(k => ({ path: `public/data/${k.replace('portfolio', '').toLowerCase()}.json`, content: localStorage.getItem(k)! }));
      
      // Generar mensaje de commit basado en qué archivos cambian
      const changedTypes = files.map(f => {
        const name = f.path.split('/').pop()?.replace('.json', '') || '';
        if (name === 'projects') return 'projects';
        if (name === 'settings') return 'settings';
        if (name === 'ambitions') return 'roadmap';
        if (name === 'techstack') return 'techstack';
        if (name === 'experience') return 'experience';
        return name;
      }).join(' + ').replace(' + ', ', ').replace(/, ([^,]*)$/, ' and $1');
      
      const changedCount = files.length;
      const prefix = changedCount === 1 && changedTypes.includes('projects') 
        ? 'update' 
        : changedCount === 1 
          ? 'update' 
          : 'full update';
      
      const message = `data: ${prefix} ${changedTypes}`;
      
      const res = await fetch('/api/github', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'publish', repo, branch: 'main', files, message }) });
      if (!res.ok) throw new Error('BRIDGE_REJECTED');
      onLog('UPLINK_SUCCESS');
      const entry: BuildEntry = { buildNumber: (builds[0]?.buildNumber ?? 0) + 1, status: 'SUCCESS', timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '), files: files.map(f => f.path.split('/').pop()!) };
      const next = [entry, ...builds].slice(0, 10); localStorage.setItem('portfolioBuildHistory', JSON.stringify(next)); setBuilds(next);
    } catch (e: any) { onLog(`UPLINK_ERROR: ${e.message}`); }
    finally { setPublishing(false); }
  }

  return (
    <div className="flex flex-col gap-12">
      <div className="bg-[#1a1a1a] border border-white/10 p-8 sm:p-12 flex flex-col gap-10 shadow-2xl rounded-xl">
        <div><p className="text-base text-white font-black tracking-[0.3em] uppercase mb-2">/ DEPLOYMENT_BRIDGE</p><p className="text-sm text-white/70 tracking-widest uppercase">Sync local state with production grid.</p></div>
        <div className="p-6 bg-black/40 border border-white/10 rounded overflow-hidden"><p className="text-xs text-white/70 tracking-widest uppercase mb-1">target_uplink:</p><p className="text-sm text-cobalt font-black tracking-[0.2em] truncate">{repo}</p></div>
        <button onClick={publish} disabled={publishing} className="bg-cobalt text-white text-sm font-black tracking-[0.4em] py-6 hover:bg-cobalt-light transition-all shadow-[0_0_50px_rgba(0,85,255,0.2)] rounded-lg">{publishing ? 'SYNCHRONIZING...' : 'EXECUTE_PUBLISH_SEQUENCE \u2191'}</button>
      </div>
      <div className="space-y-6">
        <p className="text-xs text-white/70 tracking-widest font-black uppercase">/ BUILD_HISTORY</p>
        <div className="border border-white/10 bg-[#1a1a1a] divide-y divide-white/10 shadow-2xl rounded-xl overflow-hidden">
          {builds.length === 0 ? (
            <div className="p-8 text-center text-xs text-white/20 uppercase tracking-widest">No history recorded</div>
          ) : builds.map(b => (
            <div key={b.buildNumber} className="px-8 py-5 flex items-center justify-between group hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-6"><span className="text-cobalt font-black">#{b.buildNumber}</span><span className="text-xs text-white tracking-widest uppercase font-bold">{b.status}</span><span className="text-xs text-white/70 font-mono">{b.timestamp}</span></div>
              <span className="text-xs text-white/20 tracking-widest italic opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline">[{b.files.join(', ')}]</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* --- DATA STORE TAB --- */

const DATA_FILES = [
  { key: 'projects', label: 'PROJECTS', path: '/data/projects.json' },
  { key: 'techstack', label: 'TECHSTACK', path: '/data/techstack.json' },
  { key: 'identity', label: 'IDENTITY', path: '/data/identity.json' },
  { key: 'settings', label: 'SETTINGS', path: '/data/settings.json' },
  { key: 'ambitions', label: 'AMBITIONS', path: '/data/ambitions.json' },
] as const;

function DataTab({ onLog }: { onLog: (msg: string) => void }) {
  const [selectedFile, setSelectedFile] = useState<typeof DATA_FILES[number]['key']>('projects');
  const [rawData, setRawData] = useState('');
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const loadFile = useCallback(async (key: typeof DATA_FILES[number]['key']) => {
    setLoading(true);
    try {
      const file = DATA_FILES.find(f => f.key === key);
      if (!file) return;
      
      // Try localStorage first (has pending edits)
      const stored = localStorage.getItem(`portfolio${key.charAt(0).toUpperCase() + key.slice(1)}`);
      if (stored) {
        setRawData(stored);
      } else {
        // Fallback to JSON file
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
      // Validate JSON
      JSON.parse(rawData);
      
      // Save to localStorage
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
    <div className="flex flex-col gap-10">
      <header className="flex justify-between items-center border-b border-white/15 pb-3">
        <p className="text-sm text-white font-black tracking-widest uppercase">/ RAW_DATA_EDITOR</p>
      </header>
      
      <div className="flex flex-wrap gap-2">
        {DATA_FILES.map(f => (
          <button 
            key={f.key}
            onClick={() => setSelectedFile(f.key)}
            className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-all rounded ${
              selectedFile === f.key 
                ? 'bg-cobalt text-white' 
                : 'border border-white/10 text-white/70 hover:text-white hover:border-white/70'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-[#1a1a1a] border border-white/10 p-6 shadow-2xl rounded-xl">
        <div className="flex justify-between items-center mb-4">
          <p className="text-xs text-white/70 tracking-widest uppercase">{DATA_FILES.find(f => f.key === selectedFile)?.path}</p>
          <p className={`text-xs font-black uppercase tracking-widest ${
            saveStatus === 'saved' ? 'text-green-500' : 
            saveStatus === 'error' ? 'text-err' : 
            saveStatus === 'saving' ? 'text-cobalt animate-pulse' : 'text-white/20'
          }`}>
            {saveStatus === 'saved' ? '✓ SAVED' : 
             saveStatus === 'error' ? '✕ ERROR' : 
             saveStatus === 'saving' ? 'SAVING...' : 'MEMORY_ONLY'}
          </p>
        </div>
        
        {loading ? (
          <div className="h-96 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-cobalt border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <textarea
            value={rawData}
            onChange={e => { setRawData(e.target.value); setSaveStatus('idle'); }}
            className="w-full h-96 bg-black/40 border border-white/10 p-4 text-sm text-white font-mono focus:outline-none focus:border-cobalt/50 rounded resize-none"
            spellCheck={false}
          />
        )}
        
        <div className="flex gap-4 mt-4 pt-4 border-t border-white/15">
          <button onClick={save} disabled={saveStatus === 'saving' || loading} className="px-8 py-3 bg-cobalt text-white text-xs font-black uppercase tracking-widest hover:bg-cobalt-light transition-all rounded">
            SAVE_TO_MEMORY
          </button>
          <button onClick={() => loadFile(selectedFile)} disabled={loading} className="px-6 py-3 border border-white/10 text-white/70 text-xs font-black uppercase hover:text-white tracking-widest transition-all rounded">
            RELOAD
          </button>
          <button onClick={() => { try { setRawData(JSON.stringify(JSON.parse(rawData), null, 2)); onLog('FORMATTED'); } catch(e) { onLog('FORMAT_ERROR'); }}} className="px-6 py-3 border border-white/10 text-white/70 text-xs font-black uppercase hover:text-white tracking-widest transition-all rounded">
            FORMAT
          </button>
        </div>
      </div>
      
      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded">
        <p className="text-xs text-amber-500 tracking-widest uppercase font-black">⚠ EDITS ARE SAVED TO MEMORY</p>
        <p className="text-xs text-white/70 mt-1">Use PUBLISH tab to push to production.</p>
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

  const addLog = useCallback((msg: string) => { setLogs(prev => [`${new Date().toLocaleTimeString()} > ${msg}`, ...prev].slice(0, 50)); }, []);

  useEffect(() => {
    if (isSessionValid()) setAuth(true);
  }, []);

  if (!auth) return <GitHubAuthGate onAuth={() => setAuth(true)} />;

  const tabs = [
    { id: 'projects', label: 'PROJECT_MODULES', icon: '◈' },
    { id: 'tech', label: 'TECH_REGISTRY', icon: '◰' },
    { id: 'ambitions', label: 'ROADMAP_MAPPER', icon: '▲' },
    { id: 'settings', label: 'SYSTEM_CONFIG', icon: '⚙' },
    { id: 'data', label: 'DATA_STORE', icon: '◉' },
    { id: 'publish', label: 'PUBLISH_BRIDGE', icon: '↑' },
  ];

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex flex-col lg:flex-row font-mono text-white select-none">
      
      {/* MOBILE HEADER */}
      <header className="lg:hidden h-16 bg-[#121212] border-b border-white/10 px-6 flex items-center justify-between sticky top-0 z-50 backdrop-blur-xl">
        <p className="text-base font-black tracking-[0.2em] uppercase">Core_Admin</p>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
          className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-lg border border-white/10 active:scale-95 transition-all"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </header>

      {/* SIDEBAR NAVIGATION */}
      <aside className={`
        fixed lg:relative inset-y-0 left-0 w-80 bg-[#121212] border-r border-white/15 flex flex-col shrink-0 z-[60] transition-transform duration-300 shadow-2xl
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="hidden lg:flex p-12 border-b border-white/15 flex flex-col gap-2">
          <p className="text-lg text-white font-black tracking-[0.4em] uppercase leading-none">Core_Admin</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-cobalt rounded-full animate-pulse shadow-[0_0_10px_rgba(0,85,255,0.8)]" />
            <p className="text-xs text-cobalt tracking-widest uppercase font-black">Active_Session</p>
          </div>
        </div>

        <nav className="flex-1 p-6 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
          {tabs.map(t => (
            <button 
              key={t.id} 
              onClick={() => { setTab(t.id); addLog(`NAV_TO: ${t.id.toUpperCase()}`); setMobileMenuOpen(false); }} 
              className={`text-left px-8 py-5 text-sm font-black tracking-[0.3em] uppercase transition-all duration-200 border-l-2 flex items-center gap-4 rounded-r-lg ${tab === t.id ? 'bg-cobalt/10 text-cobalt border-l-cobalt shadow-[inset_0_0_20px_rgba(0,85,255,0.05)]' : 'border-l-transparent text-white/20 hover:text-white/70 hover:bg-white/2'}`}
            >
              <span className="opacity-40">{t.icon}</span> {t.label}
            </button>
          ))}
        </nav>
        
        <div className="p-8 border-t border-white/15 flex flex-col gap-3 bg-[#0d0d0d]/40">
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full py-4 border border-white/10 text-xs font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all flex items-center justify-center gap-3 rounded"
          >
            <span>←</span> EXIT_TO_SITE
          </button>
          <button 
            onClick={() => { sessionStorage.removeItem(SESSION_KEY); window.location.reload(); }} 
            className="py-2 text-xs text-err/40 hover:text-err tracking-widest uppercase transition-all text-center font-bold"
          >
            ✕ TERMINATE_SESSION
          </button>
        </div>
      </aside>

      {/* OVERLAY FOR MOBILE SIDEBAR */}
      {mobileMenuOpen && <div onClick={() => setMobileMenuOpen(false)} className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[55]" />}

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0d0d0d] overflow-x-hidden">
        <div className="flex-1 p-6 sm:p-12 lg:p-20 custom-scrollbar island-load">
          <div className="max-w-5xl mx-auto">
            {tab === 'projects'   && <ProjectsTab onLog={addLog} />}
            {tab === 'tech'       && <TechTab onLog={addLog} />}
            {tab === 'ambitions'  && <AmbitionsTab onLog={addLog} />}
            {tab === 'settings'   && <SettingsTab onLog={addLog} />}
            {tab === 'data'      && <DataTab onLog={addLog} />}
            {tab === 'publish'    && <PublishTab onLog={addLog} />}
          </div>
        </div>
      </main>

      {/* SESSION HISTORY (DESKTOP ONLY) */}
      <aside className="hidden xl:flex w-80 border-l border-white/15 bg-[#121212] flex flex-col shrink-0 shadow-2xl overflow-hidden">
        <div className="p-10 border-b border-white/15 bg-[#121212]">
          <p className="text-xs text-white/70 tracking-widest font-black uppercase leading-none">/ SESSION_HISTORY</p>
        </div>
        <div className="flex-1 p-8 flex flex-col gap-1 overflow-y-auto text-xs opacity-20 hover:opacity-100 transition-opacity custom-scrollbar">
          {logs.map((l, i) => <p key={i} className={`py-1 border-b border-white/[0.03] ${i === 0 ? 'text-cobalt font-black' : 'text-white/70'}`}> {l}</p>)}
        </div>
        <div className="p-10 bg-[#121212] border-t border-white/15 flex flex-col gap-4">
          <div className="flex flex-col gap-1"><span className="text-xs text-white/20 uppercase tracking-widest font-black italic">operator:</span><p className="text-sm text-white font-black uppercase truncate">admin@gest_core</p></div>
          <div className="flex flex-col gap-1"><span className="text-xs text-white/20 uppercase tracking-widest font-black italic">status:</span><p className="text-sm text-green-500/80 font-black uppercase">ENCRYPTED</p></div>
        </div>
      </aside>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.08); border-radius: 10px; }
        .island-load { animation: reveal-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes reveal-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}
