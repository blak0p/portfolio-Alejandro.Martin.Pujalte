import React, { useState, useEffect, useCallback } from 'react';
import {
  inputClass,
  cardClass,
  buttonPrimaryClass,
  SectionHeader,
} from '../components/UI';

// Mirrors the KV entry shape (community-kv) + optional join fields from
// community.json. stars/url/lastSyncedAt come from the JSON when it exists.
interface RepoRow {
  owner: string;
  name: string;
  active: boolean;
  addedAt: string;
  stars?: number;
  url?: string;
  lastSyncedAt?: string | null;
}

interface CommunityTabProps {
  onLog: (msg: string) => void;
}

export default function CommunityTab({ onLog }: CommunityTabProps) {
  const [repos, setRepos] = useState<RepoRow[]>([]);
  const [communityData, setCommunityData] = useState<{ projects: Array<{ slug: string; stars: number; lastSyncedAt: string | null }> } | null>(null);
  const [newUrl, setNewUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);

  // Load managed repo list + community.json (for stars/lastSyncedAt join).
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [reposRes, dataRes] = await Promise.all([
        fetch('/api/admin/community', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'list' }),
        }),
        fetch('/data/community.json'),
      ]);

      if (!reposRes.ok) {
        setError('No se pudo cargar la lista');
      } else {
        const body = await reposRes.json();
        const list: RepoRow[] = Array.isArray(body.repos) ? body.repos : [];
        list.sort((a, b) => `${a.owner}/${a.name}`.localeCompare(`${b.owner}/${b.name}`));
        setRepos(list);
      }

      if (dataRes.ok) {
        const data = await dataRes.json();
        if (data && Array.isArray(data.projects)) {
          setCommunityData(data);
        }
      } else {
        // community.json absent on first deploys — join falls back to —/nunca.
        setCommunityData(null);
      }
    } catch {
      setError('No se pudo cargar la lista');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Join a repo row with community.json to get stars + lastSyncedAt for display.
  function joinMeta(repo: RepoRow): { stars: string; lastSyncedAt: string } {
    const slug = `${repo.owner}-${repo.name}`;
    const match = communityData?.projects.find((p) => p.slug === slug);
    return {
      stars: match ? String(match.stars ?? 0) : '—',
      lastSyncedAt: match?.lastSyncedAt ? new Date(match.lastSyncedAt).toISOString().split('T')[0] : 'nunca',
    };
  }

  async function addRepo() {
    const url = newUrl.trim();
    if (!url) {
      setError('Ingresá una URL de GitHub');
      return;
    }
    if (!/github\.com\/[^/]+\/[^/]+/.test(url)) {
      setError('URL inválida — usá https://github.com/owner/name');
      return;
    }
    setAdding(true);
    setError('');
    try {
      const res = await fetch('/api/admin/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', url }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || 'No se pudo agregar');
        onLog(`COMMUNITY_ADD_FAIL: ${body.error || res.status}`);
        return;
      }
      const list: RepoRow[] = Array.isArray(body.repos) ? body.repos : [];
      list.sort((a, b) => `${a.owner}/${a.name}`.localeCompare(`${b.owner}/${b.name}`));
      setRepos(list);
      setNewUrl('');
      onLog(`COMMUNITY_ADDED: ${url}`);
      // Reload to pick up the joined stars from a fresh community.json read.
      load();
    } catch {
      setError('No se pudo agregar');
    } finally {
      setAdding(false);
    }
  }

  async function toggleRepo(owner: string, name: string) {
    setError('');
    try {
      const res = await fetch('/api/admin/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', owner, name }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || 'No se pudo guardar el cambio');
        return;
      }
      const list: RepoRow[] = Array.isArray(body.repos) ? body.repos : [];
      list.sort((a, b) => `${a.owner}/${a.name}`.localeCompare(`${b.owner}/${b.name}`));
      setRepos(list);
      onLog(`COMMUNITY_TOGGLE: ${owner}/${name}`);
    } catch {
      setError('No se pudo guardar el cambio');
    }
  }

  async function removeRepo(owner: string, name: string) {
    setError('');
    try {
      const res = await fetch('/api/admin/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', owner, name }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || 'No se pudo eliminar');
        return;
      }
      const list: RepoRow[] = Array.isArray(body.repos) ? body.repos : [];
      list.sort((a, b) => `${a.owner}/${a.name}`.localeCompare(`${b.owner}/${b.name}`));
      setRepos(list);
      setPendingRemove(null);
      onLog(`COMMUNITY_REMOVED: ${owner}/${name}`);
    } catch {
      setError('No se pudo eliminar');
    }
  }

  return (
    <div className="flex flex-col gap-10 font-mono">
      <header className="flex justify-between items-center border-b border-zinc-800 pb-3">
        <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">/ COMMUNITY_REPOS</p>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs text-zinc-400 hover:text-white font-bold uppercase transition-all"
        >
          [↻] RELOAD
        </button>
      </header>

      {/* ADD FORM */}
      <div className={cardClass}>
        <SectionHeader title="ADD_OSS_REPO" />
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="text-xs text-zinc-400 font-bold tracking-widest uppercase mb-2 block">GITHUB_URL</label>
            <input
              type="text"
              value={newUrl}
              onChange={(e) => { setNewUrl(e.target.value); setError(''); }}
              placeholder="https://github.com/owner/name"
              className={inputClass}
              onKeyDown={(e) => { if (e.key === 'Enter') addRepo(); }}
            />
          </div>
          <button onClick={addRepo} disabled={adding} className={buttonPrimaryClass}>
            {adding ? 'ADDING...' : 'AGREGAR'}
          </button>
        </div>
        {error && (
          <p className="mt-4 text-[10px] text-red-400 font-bold tracking-widest uppercase border border-red-500/20 bg-red-950/10 p-3 rounded-xl animate-pulse">
            !! ERROR: {error}
          </p>
        )}
      </div>

      {/* REPO LIST */}
      <div className={cardClass}>
        <SectionHeader title="MANAGED_REPOS" />

        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : repos.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-xs tracking-widest text-zinc-600 uppercase">
            Aún no hay repositorios
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {repos.map((r) => {
              const meta = joinMeta(r);
              const key = `${r.owner}/${r.name}`;
              return (
                <div
                  key={key}
                  className="p-4 border border-zinc-800 bg-zinc-900/20 hover:border-zinc-700/60 flex items-center justify-between gap-4 rounded-xl transition-all duration-200"
                >
                  <div className="flex flex-col gap-1 overflow-hidden min-w-0">
                    <span className="text-sm font-bold text-zinc-200 truncate">{r.owner}/{r.name}</span>
                    <div className="flex gap-4 text-[10px] text-zinc-500 tracking-widest uppercase">
                      <span>★ {meta.stars}</span>
                      <span>SYNC: {meta.lastSyncedAt}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {/* Active toggle */}
                    <button
                      onClick={() => toggleRepo(r.owner, r.name)}
                      className={`px-3 py-2 text-[10px] font-bold tracking-widest uppercase rounded-xl border transition-all ${
                        r.active
                          ? 'bg-sky-500/10 border-sky-500/40 text-sky-400 hover:bg-sky-500/20'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                      }`}
                      aria-pressed={r.active}
                      title={r.active ? 'Activo — click para desactivar' : 'Inactivo — click para activar'}
                    >
                      {r.active ? 'ACTIVE' : 'INACTIVE'}
                    </button>

                    {/* Remove with confirm */}
                    {pendingRemove === key ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest">¿?</span>
                        <button
                          onClick={() => removeRepo(r.owner, r.name)}
                          className="px-3 py-2 text-[10px] font-bold tracking-widest uppercase rounded-xl bg-red-600 hover:bg-red-500 text-white transition-all"
                        >
                          SÍ
                        </button>
                        <button
                          onClick={() => setPendingRemove(null)}
                          className="px-3 py-2 text-[10px] font-bold tracking-widest uppercase rounded-xl border border-zinc-800 text-zinc-400 hover:text-white transition-all"
                        >
                          NO
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setPendingRemove(key)}
                        className="px-3 py-2 text-[10px] font-bold tracking-widest uppercase rounded-xl border border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500/40 transition-all"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-xl">
        <p className="text-[10px] text-zinc-400 tracking-widest uppercase font-bold">ℹ LOS REPOS SE SINCRONIZAN VÍA CRON DIARIO</p>
        <p className="text-[10px] text-zinc-500 mt-1">Activá/desactivá el flag para incluir o saltear un repo en el próximo sync. Stars y lastSyncedAt se actualizan cuando el cron corre.</p>
      </div>
    </div>
  );
}