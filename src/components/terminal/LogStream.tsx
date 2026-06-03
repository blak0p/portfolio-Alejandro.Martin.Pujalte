import React, { useEffect, useRef, useState } from 'react';
import type { LogEntry, Project } from '../../types';
import { parseStoredProjects, sanitizeProjects } from '../../lib/projectStorage';
import { getAutoRefreshProjects } from '../../lib/projectRanking';

const CACHE_KEY = 'portfolioGitHubLogs';
const CACHE_TS_KEY = 'portfolioGitHubLogsTs';
const PROJECTS_TS_KEY = 'portfolioProjectsRefreshTs';
const NEXT_SYNC_TS_KEY = 'portfolioNextSyncTs';
const POLL_MS = 60 * 60 * 1000;
const isBrowser = typeof window !== 'undefined';

const levelColors: Record<LogEntry['level'], string> = {
  INFO:      'text-white',
  WARN:      'text-warn',
  ERR:       'text-err',
  MILESTONE: 'text-cobalt',
};
const levelBg: Record<LogEntry['level'], string> = {
  INFO:      '',
  WARN:      'bg-warn/5',
  ERR:       'bg-err/5',
  MILESTONE: 'bg-cobalt/5',
};

function eventToEntry(e: Record<string, unknown>, index: number): LogEntry | null {
  const repo = (e.repo as { name?: string })?.name ?? '';
  const repoShort = (repo.split('/')[1] ?? repo).toUpperCase();
  const createdAt = typeof e.created_at === 'string' ? e.created_at : '';
  const ts = createdAt.slice(0, 19).replace('T', ' ');
  const id = `gh-${e.id ?? index}`;
  const payload = e.payload as Record<string, unknown> ?? {};

  const prefix = 'GH';

  switch (e.type) {
    case 'PushEvent': {
      const commits = payload.commits as { message: string }[] ?? [];
      const count = commits.length;
      let msg = commits[0]?.message?.split('\n')[0] ?? '';
      if (!msg || msg.trim() === '') msg = 'SYSTEM_UPDATE';
      return { id, timestamp: ts, level: 'INFO', message: `[${prefix}] PUSH ${repoShort} — "${msg}"${count > 1 ? ` (+${count - 1})` : ''}` };
    }
    case 'PullRequestEvent': {
      const pr = payload.pull_request as { title?: string; number?: number; merged?: boolean } ?? {};
      const title = pr.title || 'MANUAL_MERGE';
      if (payload.action === 'closed' && pr.merged)
        return { id, timestamp: ts, level: 'MILESTONE', message: `[${prefix}] MERGED PR #${pr.number} — ${title} [${repoShort}]` };
      if (payload.action === 'opened')
        return { id, timestamp: ts, level: 'INFO', message: `[${prefix}] PR OPENED #${pr.number} — ${title} [${repoShort}]` };
      return null;
    }
    case 'CreateEvent': {
      const ref = typeof payload.ref === 'string' ? payload.ref : '';
      const refType = typeof payload.ref_type === 'string' ? payload.ref_type : '';
      if (refType === 'tag') return { id, timestamp: ts, level: 'MILESTONE', message: `[${prefix}] TAGGED ${repoShort} @ ${ref}` };
      if (refType === 'branch') return { id, timestamp: ts, level: 'INFO', message: `[${prefix}] BRANCH CREATED ${ref || 'main'} [${repoShort}]` };
      return null;
    }
    case 'DeleteEvent': {
      const ref = typeof payload.ref === 'string' ? payload.ref : '';
      const refType = typeof payload.ref_type === 'string' ? payload.ref_type : '';
      if (refType === 'branch') return { id, timestamp: ts, level: 'WARN', message: `[${prefix}] BRANCH DELETED ${ref} [${repoShort}]` };
      return null;
    }
    case 'IssuesEvent': {
      const issue = payload.issue as { title?: string; number?: number } ?? {};
      const title = issue.title || 'SYSTEM_TICKET';
      if (payload.action === 'opened')
        return { id, timestamp: ts, level: 'WARN', message: `[${prefix}] ISSUE #${issue.number} — ${title} [${repoShort}]` };
      return null;
    }
    case 'ReleaseEvent': {
      const release = payload.release as { tag_name?: string; name?: string } ?? {};
      const name = release.name || release.tag_name || 'STABLE_RELEASE';
      return { id, timestamp: ts, level: 'MILESTONE', message: `[${prefix}] RELEASED ${name} [${repoShort}]` };
    }
    default:
      return null;
  }
}

function getUsername(): string {
  if (!isBrowser) return 'blak0p';
  try {
    const projects = parseStoredProjects(localStorage.getItem('portfolioProjects'));
    if (!projects.length) return 'blak0p';
    for (const p of projects) {
      const slug = p.specs?.repoSlug as string | undefined;
      if (slug?.includes('/')) return slug.split('/')[0];
    }
  } catch {}
  return 'blak0p';
}

async function refreshProjectsFromGitHub(): Promise<void> {
  if (!isBrowser) return;
  const ts = localStorage.getItem(PROJECTS_TS_KEY);
  if (ts && Date.now() - Number(ts) < POLL_MS) return;

  try {
    const projects = parseStoredProjects(localStorage.getItem('portfolioProjects'));
    const refreshTargets = getAutoRefreshProjects(projects).filter(p => p.specs?.repoSlug);
    if (refreshTargets.length === 0) return;

    const refreshSlugs = new Set(
      refreshTargets
        .map(project => project.specs?.repoSlug)
        .filter((slug): slug is string => typeof slug === 'string' && slug.length > 0)
    );

    const updated = await Promise.all(projects.map(async (project) => {
      const repoSlug = project.specs?.repoSlug as string | undefined;
      if (!repoSlug || !refreshSlugs.has(repoSlug)) return project;

      try {
        const res = await fetch('/api/github', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getRepoDetails', repoSlug })
        });
        if (!res.ok) return project;
        const r = await res.json();
        return {
          ...project,
          pushedAt: r.pushedAt ?? project.pushedAt,
          specs: {
            ...project.specs,
            stars: String(r.specsStars ?? project.specs?.stars ?? ''),
            language: r.specsLanguage ?? project.specs?.language ?? '',
            description: r.specsDescription ?? project.specs?.description ?? '',
          },
        };
      } catch {
        return project;
      }
    }));

    localStorage.setItem('portfolioProjects', JSON.stringify(sanitizeProjects(updated)));
    localStorage.setItem(PROJECTS_TS_KEY, String(Date.now()));
    window.dispatchEvent(new CustomEvent('portfolioProjectsRefreshed'));
  } catch {}
}

interface LogStreamProps {
  logs: LogEntry[];
  logLimit?: number;
  hideHeader?: boolean;
}

function getActivityLog(): LogEntry[] {
  if (!isBrowser) return [];
  try { return JSON.parse(localStorage.getItem('portfolioActivityLog') ?? '[]'); } catch { return []; }
}

export default function LogStream({ logs, logLimit = 10, hideHeader = false }: LogStreamProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [liveEntries, setLiveEntries]     = useState<LogEntry[]>([]);
  const [activityEntries, setActivityEntries] = useState<LogEntry[]>(getActivityLog());
  const [fetching, setFetching] = useState(false);
  
  const getInitialTimeLeft = () => {
    if (!isBrowser) return POLL_MS / 1000;
    const nextSyncTs = localStorage.getItem(NEXT_SYNC_TS_KEY);
    if (!nextSyncTs) return POLL_MS / 1000;
    const remaining = Math.floor((Number(nextSyncTs) - Date.now()) / 1000);
    return remaining > 0 ? remaining : POLL_MS / 1000;
  };
  
  const [nextSyncIn, setNextSyncIn] = useState<number | null>(null);

  useEffect(() => {
    setNextSyncIn(getInitialTimeLeft());
  }, []);

  async function fetchGitHubActivity(skipCache = false) {
    if (!isBrowser) return;
    if (!skipCache) {
      const ts = localStorage.getItem(CACHE_TS_KEY);
      const cached = localStorage.getItem(CACHE_KEY);
      if (ts && cached && Date.now() - Number(ts) < POLL_MS) {
        setLiveEntries(JSON.parse(cached));
        const nextSync = Number(ts) + POLL_MS;
        localStorage.setItem(NEXT_SYNC_TS_KEY, String(nextSync));
        setNextSyncIn(Math.max(0, Math.floor((nextSync - Date.now()) / 1000)));
        return;
      }
    }

    const username = getUsername();
    setFetching(true);
    try {
      const res = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getActivity', username })
      });
      if (!res.ok) return;
      const events: Record<string, unknown>[] = await res.json();

      const portfolioRepos = new Set<string>();
      const projects = parseStoredProjects(localStorage.getItem('portfolioProjects'));
      if (projects.length) {
        for (const p of projects) {
          const slug = p.specs?.repoSlug as string | undefined;
          if (slug) portfolioRepos.add(slug.toLowerCase());
        }
      }

      const entries: LogEntry[] = events
        .filter(e => {
          if (portfolioRepos.size === 0) return true;
          const repoName = (e.repo as { name?: string })?.name?.toLowerCase() ?? '';
          return portfolioRepos.has(repoName) || [...portfolioRepos].some(r => repoName.endsWith(`/${r.split('/')[1] ?? ''}`));
        })
        .map((e, i) => eventToEntry(e, i))
        .filter((e): e is LogEntry => e !== null)
        .slice(0, logLimit);

      const now = Date.now();
      
      // Si no hay nada nuevo, dejamos constancia
      if (entries.length === 0 || (liveEntries.length > 0 && entries[0]?.id === liveEntries[0]?.id)) {
        const syncLog: LogEntry = {
          id: `sync-${now}`,
          timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
          level: 'INFO',
          message: '[GH] UPLINK_SYNC_COMPLETE \u2014 No new activity detected.'
        };
        setLiveEntries(prev => [syncLog, ...prev].slice(0, logLimit));
      } else {
        setLiveEntries(entries);
      }

      localStorage.setItem(CACHE_KEY, JSON.stringify(entries));
      localStorage.setItem(CACHE_TS_KEY, String(now));
      localStorage.setItem(NEXT_SYNC_TS_KEY, String(now + POLL_MS));
      setLiveEntries(entries);
      setNextSyncIn(POLL_MS / 1000);
    } catch {}
    finally { setFetching(false); }
  }

  useEffect(() => {
    fetchGitHubActivity(false);
    refreshProjectsFromGitHub();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchGitHubActivity(false);
        refreshProjectsFromGitHub();
      }
    }, POLL_MS);

    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        setNextSyncIn(prev => {
          if (prev === null || prev <= 1) return POLL_MS / 1000;
          return prev - 1;
        });
      }
    }, 1000);

    const onActivity = () => setActivityEntries(getActivityLog());
    const onTerminalEvent = (e: any) => {
      const { type, projectName, isGold, isDusty } = e.detail;
      const ts = new Date().toISOString().slice(0, 19).replace('T', ' ');
      
      let level: LogEntry['level'] = 'INFO';
      let message = '';

      if (isGold) {
        level = 'MILESTONE';
        message = `[ALERT] GOLD_TARGET_DETECTED: ${projectName} — (High Value Infrastructure)`;
      } else if (isDusty) {
        level = 'WARN';
        message = `[INFO] RECOVERING_LEGACY_MODULE: ${projectName} — (Cleaning dust...)`;
      } else {
        message = `[GUEST] ACCESSING_MODULE: ${projectName} — (Protocol: READ_ONLY)`;
      }

      const newEntry: LogEntry = {
        id: `event-${Date.now()}`,
        timestamp: ts,
        level,
        message
      };
      setActivityEntries(prev => [...prev, newEntry].slice(-logLimit));
    };

    window.addEventListener('portfolioActivityLogged', onActivity);
    window.addEventListener('portfolioTerminalEvent', onTerminalEvent);

    return () => {
      clearInterval(interval);
      clearInterval(timer);
      window.removeEventListener('portfolioActivityLogged', onActivity);
      window.removeEventListener('portfolioTerminalEvent', onTerminalEvent);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const combined: LogEntry[] = [
    ...logs.map(l => ({ ...l, message: l.message.startsWith('[SYS]') ? l.message : `[SYS] ${l.message}` })),
    ...liveEntries,
    ...activityEntries.map(l => ({ ...l, message: l.message.startsWith('[ADM]') ? l.message : `[ADM] ${l.message}` }))
  ]
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .slice(-logLimit);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [combined.length]);

  return (
    <div className={`${hideHeader ? '' : 'border border-white/10 bg-carbono-surface'} w-full flex flex-col h-full overflow-hidden terminal-scanlines`}>
      {!hideHeader && (
        <div
          className="border-b border-white/10 px-4 py-3 flex items-center gap-3 bg-carbono cursor-pointer hover:bg-carbono/20"
          onClick={() => window.dispatchEvent(new CustomEvent('openTerminal'))}
        >
          <span className="text-xs text-text-faint tracking-widest uppercase">TERMINAL &gt;_</span>
          <div className="flex gap-1.5 ml-auto">
            <div className="w-2 h-2 bg-err/60" />
            <div className="w-2 h-2 bg-warn/60" />
            <div className="w-2 h-2 bg-cobalt/60" />
          </div>
          {fetching
            ? <span className="text-[10px] text-warn tracking-widest animate-pulse">● FETCHING</span>
            : <span className="text-[10px] text-cobalt tracking-widest">● LIVE</span>
          }
        </div>
      )}

      <div className="px-4 py-1.5 border-b border-white/5 bg-carbono-low flex justify-between items-center relative z-20">
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-text-faint tracking-widest uppercase">
            // GH_UPLINK
          </span>
          <span className="text-[12px] text-white/30 tracking-widest font-mono">
            [ SYNC: {nextSyncIn !== null ? formatTime(nextSyncIn) : '--:--'} ]
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${fetching ? 'bg-warn' : 'bg-cobalt'} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${fetching ? 'bg-warn' : 'bg-cobalt'}`}></span>
          </span>
          <span className={`text-[12px] ${fetching ? 'text-warn' : 'text-cobalt'} tracking-widest`}>
            {fetching ? 'SYNCING...' : 'ESTABLISHED'}
          </span>
        </div>
      </div>

      <div ref={containerRef} className="overflow-y-auto overflow-x-hidden flex-1 min-h-0 p-3 flex flex-col gap-1 whitespace-normal break-all relative z-20">
        {combined.length === 0 ? (
          <div className="text-xs text-text-faint tracking-widest flex flex-col gap-1">
            <span>// NO_NEW_ACTIVITY</span>
            <span className="text-cobalt/60">System idle — awaiting input...</span>
          </div>
        ) : (
          combined.map((entry) => {
            const isGold = entry.message.includes('GOLD');
            const isGuest = entry.message.includes('[GUEST]');
            const isCommand = entry.level === 'INFO' && !entry.message.startsWith('[GH]') && !entry.message.startsWith('[SYS]');
            
            const colorClass = isGold ? 'text-bronze-light' : (isGuest || isCommand ? 'text-[#00ff41]' : levelColors[entry.level]);

            return (
              <div key={entry.id} className={`text-xs leading-relaxed px-2 py-1 ${levelBg[entry.level]} crt-flicker`}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-text-faint tabular-nums text-[10px] shrink-0">{entry.timestamp}</span>
                  <span className={`font-bold text-[10px] shrink-0 ${colorClass}`}>
                    [{entry.level}]
                  </span>
                </div>
                <span className={`${colorClass} wrap-break-word whitespace-normal`}>{entry.message}</span>
              </div>
            );
          })
        )}
      </div>

      {/* FIXED FOOTER PART */}
      <div className="p-3 border-t border-white/5 bg-carbono-low flex flex-col gap-2 shrink-0 relative z-20">
        <div className="flex gap-3 text-xs">
          <span className="text-cobalt">admin @src/data/portfolio.ts ~/ </span>
          <span className="text-white/40 animate-pulse">█</span>
        </div>
        <div className="opacity-40">
          <p className="text-[10px] text-text-faint tracking-widest leading-relaxed uppercase">
            // [SYSTEM_HINT]: This panel tracks live GitHub commits and infrastructure updates.
          </p>
        </div>
      </div>
    </div>
  );
}
