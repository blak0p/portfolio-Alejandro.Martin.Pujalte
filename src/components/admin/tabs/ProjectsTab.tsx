import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Project } from '../../../types';
import { 
  inputClass, 
  buttonPrimaryClass, 
  buttonSecondaryClass, 
  cardClass, 
  Field, 
  CheckField, 
  SectionHeader 
} from '../components/UI';
import { InteractiveTags } from '../components/InteractiveTags';

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

const emptyProject = {
  name: '', gitUrl: '', photo: '', video: '', stack: '', architecture: '', initSequence: '', description: '', businessImpact: '',
  specsStatus: '', specsStars: '', specsLanguage: '', specsLicense: '', specsDescription: '', specsRepo: '', specsRepoSlug: '', specsDemo: '', specsTags: '', stackWithUsage: '',
  isHighlighted: false, isPrivate: false, isFavorite: false, pushedAt: '', order: 0,
  recruiterDescription: '', recruiterStack: '', readmeContent: ''
};

interface RepoImportModalProps {
  onClose: () => void;
  onImport: (repo: any) => void;
  existingSlugs: string[];
}

function RepoImportModal({ onClose, onImport, existingSlugs }: RepoImportModalProps) {
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [importing, setImporting] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/github', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'getUserRepos' }) })
      .then(r => r.json())
      .then(data => setRepos(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = Array.isArray(repos) ? repos.filter(r => 
    !existingSlugs.includes(r.fullName) && 
    (r.name.toLowerCase().includes(filter.toLowerCase()) || r.description?.toLowerCase().includes(filter.toLowerCase()))
  ) : [];

  const handleImport = async (repo: any) => {
    setImporting(repo.fullName);
    try {
      const res = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getRepoDetails', repoSlug: repo.fullName })
      });
      if (!res.ok) throw new Error('Failed to fetch details');
      const details = await res.json();
      
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
      onImport(repo);
    } finally {
      setImporting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-zinc-950/80 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 flex flex-col max-h-[90vh] shadow-2xl rounded-2xl overflow-hidden font-mono">
        <header className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
          <h2 className="text-xs font-bold text-zinc-200 tracking-widest uppercase">IMPORT_GITHUB_REPOS</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">✕</button>
        </header>
        
        <div className="p-6 border-b border-zinc-800">
          <input 
            type="text" 
            placeholder="Filter repositories..." 
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="h-60 flex flex-col gap-4 items-center justify-center text-xs tracking-widest text-zinc-500 uppercase">
              <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              Scanning_Uplink...
            </div>
          ) : filtered.length === 0 ? (
            <div className="h-60 flex items-center justify-center text-xs tracking-widest text-zinc-600 uppercase">No_Available_Modules</div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {filtered.map(r => (
                <div key={r.fullName} className="p-4 border border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900/60 hover:border-zinc-700/60 flex items-center justify-between group transition-all duration-200 rounded-xl">
                  <div className="flex flex-col gap-1 overflow-hidden pr-4">
                    <span className="text-sm font-bold text-zinc-200 truncate">{r.name}</span>
                    <span className="text-xs text-zinc-500 truncate">{r.fullName}</span>
                  </div>
                  <button 
                    onClick={() => handleImport(r)}
                    disabled={importing === r.fullName}
                    className={buttonPrimaryClass}
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

interface ProjectsTabProps {
  onLog: (msg: string) => void;
}

export default function ProjectsTab({ onLog }: ProjectsTabProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState(emptyProject);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/data/projects.json');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setProjects(data);
          localStorage.setItem('portfolioProjects', JSON.stringify(data));
          return;
        }
      }
    } catch (e) {
      console.warn('Projects load: JSON fetch failed, falling back to localStorage');
    }
    
    const stored = localStorage.getItem('portfolioProjects');
    if (stored) {
      setProjects(JSON.parse(stored));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleImport = (r: any) => {
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
      stack: form.stack.split(',').map(s => s.trim()).filter(Boolean),
      stackWithUsage: savedStackWithUsage,
      architecture: form.architecture, 
      initSequence: form.initSequence, 
      description: form.description, 
      businessImpact: form.businessImpact, 
      recruiterDescription: form.recruiterDescription,
      recruiterStack: form.recruiterStack.split(',').map(s => s.trim()).filter(Boolean),
      readmeContent: form.readmeContent,
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
      stack: Array.isArray(p.stack) ? p.stack.join(', ') : '', 
      architecture: p.architecture, 
      initSequence: p.initSequence, 
      description: p.description ?? '', 
      businessImpact: p.businessImpact ?? '', 
      recruiterDescription: p.recruiterDescription ?? '',
      recruiterStack: Array.isArray(p.recruiterStack) ? p.recruiterStack.join(', ') : '',
      readmeContent: p.readmeContent ?? '',
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
    <div className="flex flex-col gap-12 font-mono">
      {showImport && <RepoImportModal existingSlugs={existingSlugs} onImport={handleImport} onClose={() => setShowImport(false)} />}
      
      <div className="flex flex-col gap-6">
        <header className="flex justify-between items-center border-b border-zinc-800 pb-3">
          <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">/ MODULE_REPOSITORY</p>
          <div className="flex gap-4 sm:gap-6 items-center">
            <button onClick={() => setShowImport(true)} className="text-xs text-sky-400 font-bold hover:text-sky-300 hover:underline uppercase transition-all">[IMPORT_SELECTIVE]</button>
            <button onClick={() => { setEditingIdx(null); setForm(emptyProject); }} className="text-xs text-zinc-400 hover:text-white font-bold uppercase transition-all">[+] NEW</button>
          </div>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {projects.map((p, i) => (
            <button 
              key={i} 
              onClick={() => select(i)} 
              className={`p-4 border text-left transition-all duration-300 rounded-xl ${
                editingIdx === i 
                  ? 'border-sky-500 bg-sky-950/20 text-white shadow-[0_0_20px_rgba(56,189,248,0.15)]' 
                  : 'border-zinc-800/80 bg-zinc-900/20 hover:border-zinc-700/50 hover:bg-zinc-900/40 text-zinc-300 hover:text-white'
              }`}
            >
              <p className="text-xs font-bold uppercase truncate leading-tight">{p.name}</p>
              <div className="flex justify-between items-center opacity-30 mt-3 text-[10px]">
                <p className="tracking-widest uppercase">ORDER_{p.order}</p>
                {p.isFavorite && <span className="text-sky-400">★</span>}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className={cardClass}>
        <SectionHeader title={editingIdx !== null ? `TERMINAL_CONFIG: ${projects[editingIdx].name}` : 'INITIALIZING_DATA'} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <Field label="NAME" required>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} placeholder="SYSTEM_MODULE" />
          </Field>
          
          {!form.isPrivate && (
            <div className="col-span-1 md:col-span-2 flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <Field label="GITHUB_ENDPOINT">
                  <input value={form.gitUrl} onChange={e => setForm(f => ({ ...f, gitUrl: e.target.value }))} className={inputClass} placeholder="https://github.com/..." />
                </Field>
              </div>
              <button onClick={fetchGitHub} disabled={scanLoading} className={buttonPrimaryClass}>
                {scanLoading ? 'SCANNING...' : 'SYNC_METADATA'}
              </button>
            </div>
          )}

          <div className="col-span-1 md:col-span-2 flex flex-wrap gap-x-10 gap-y-4 border-y border-zinc-800 py-6 my-2">
            <CheckField label="DESTACADO" value={form.isHighlighted} onChange={v => setForm(f => ({ ...f, isHighlighted: v }))} />
            <CheckField label="FIJADO" value={form.isFavorite} onChange={v => setForm(f => ({ ...f, isFavorite: v }))} />
            <CheckField label="PRIVADO" value={form.isPrivate} onChange={v => setForm(f => ({ ...f, isPrivate: v }))} />
          </div>

          <Field label="OVERVIEW_BRIEF">
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={inputClass} />
          </Field>
          <Field label="BUSINESS_IMPACT">
            <input value={form.businessImpact} onChange={e => setForm(f => ({ ...f, businessImpact: e.target.value }))} className={inputClass} />
          </Field>

          <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-zinc-800/50 pt-6 my-2">
            <Field label="RECRUITER_DESCRIPTION">
              <textarea value={form.recruiterDescription} onChange={e => setForm(f => ({ ...f, recruiterDescription: e.target.value }))} className={`${inputClass} h-24 resize-none`} placeholder="Recruiter-tailored project summary..." />
            </Field>
            <Field label="RECRUITER_STACK">
              <InteractiveTags value={form.recruiterStack} onChange={v => setForm(f => ({ ...f, recruiterStack: v }))} placeholder="Add recruiter stack tag..." />
            </Field>
          </div>
          
          <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-4">
              <Field label="VISUAL_ASSET [IMG]">
                <div className="flex gap-2">
                  <input value={form.photo} onChange={e => setForm(f => ({ ...f, photo: e.target.value }))} className={`${inputClass} flex-1`} />
                  <button onClick={() => photoInputRef.current?.click()} className={`${buttonSecondaryClass} !px-4`}>↑</button>
                  <input ref={photoInputRef} type="file" className="hidden" onChange={handlePhotoUpload} />
                </div>
              </Field>
              {form.photo && (
                <div className="border border-zinc-800 p-2 bg-zinc-950/60 rounded-xl overflow-hidden">
                  <img src={form.photo} className="h-32 w-full object-cover rounded-lg" alt="Preview" />
                </div>
              )}
            </div>
            {!form.isPrivate && (
              <div className="space-y-4">
                <Field label="STREAM_SOURCE [VIDEO]">
                  <input value={form.video} onChange={e => setForm(f => ({ ...f, video: e.target.value }))} className={inputClass} />
                </Field>
              </div>
            )}
          </div>

          <div className="col-span-1 md:col-span-2">
            <Field label="SYSTEM_ARCHITECTURE">
              <textarea value={form.architecture} onChange={e => setForm(f => ({ ...f, architecture: e.target.value }))} className={`${inputClass} h-24 resize-none`} />
            </Field>
          </div>
          
          <div className="col-span-1 md:col-span-2">
            <Field label="INIT_SEQUENCE">
              <textarea value={form.initSequence} onChange={e => setForm(f => ({ ...f, initSequence: e.target.value }))} className={`${inputClass} h-16 resize-none`} />
            </Field>
          </div>

          <div className="col-span-1 md:col-span-2">
            <Field label="MANUAL README / DOCUMENTATION">
              <textarea value={form.readmeContent} onChange={e => setForm(f => ({ ...f, readmeContent: e.target.value }))} className={`${inputClass} h-40 resize-y`} placeholder="Markdown documentation for private projects or custom readme overrides..." />
            </Field>
          </div>

          <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field label="TECH_STACK">
              <InteractiveTags value={form.stack} onChange={v => setForm(f => ({ ...f, stack: v }))} placeholder="Add tech stack tag..." />
            </Field>
            {!form.isPrivate && (
              <Field label="SPECIFICATIONS_TAGS">
                <InteractiveTags value={form.specsTags} onChange={v => setForm(f => ({ ...f, specsTags: v }))} placeholder="Add spec tag..." />
              </Field>
            )}
          </div>

          <Field label="STATUS">
            <select value={form.specsStatus} onChange={e => setForm(f => ({ ...f, specsStatus: e.target.value }))} className={inputClass}>
              <option value="">— SELECT_STATUS —</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="PAUSED">PAUSED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </Field>

          {!form.isPrivate && (
            <>
              <Field label="STARS">
                <input value={form.specsStars} onChange={e => setForm(f => ({ ...f, specsStars: e.target.value }))} className={inputClass} />
              </Field>
              <Field label="LANGUAGE">
                <input value={form.specsLanguage} onChange={e => setForm(f => ({ ...f, specsLanguage: e.target.value }))} className={inputClass} />
              </Field>
              <Field label="LICENSE">
                <input value={form.specsLicense} onChange={e => setForm(f => ({ ...f, specsLicense: e.target.value }))} className={inputClass} />
              </Field>
              <Field label="REPO_SLUG">
                <input value={form.specsRepoSlug} onChange={e => setForm(f => ({ ...f, specsRepoSlug: e.target.value }))} className={inputClass} />
              </Field>
              <Field label="DEMO_URL">
                <input value={form.specsDemo} onChange={e => setForm(f => ({ ...f, specsDemo: e.target.value }))} className={inputClass} />
              </Field>
            </>
          )}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center gap-6 border-t border-zinc-800 pt-6">
          <button onClick={save} className={buttonPrimaryClass}>
            COMMIT_CHANGES [CTRL+S]
          </button>
          {editingIdx !== null && (
            <button 
              onClick={() => { 
                if (confirm('DECOMMISSION?')) { 
                  const n = projects.filter((_, i) => i !== editingIdx); 
                  localStorage.setItem('portfolioProjects', JSON.stringify(n)); 
                  load(); 
                  setEditingIdx(null); 
                  onLog('MODULE_DECOMMISSIONED');
                } 
              }} 
              className="text-xs text-red-500 hover:text-red-400 font-bold uppercase transition-colors"
            >
              DECOMMISSION
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
