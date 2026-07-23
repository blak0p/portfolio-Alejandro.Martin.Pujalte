import type { APIRoute } from 'astro';
import { getRepoDetails, authHeaders } from '../../../lib/github-server';
import projectsData from '../../../../public/data/projects.json';
import { getAutoRefreshProjects } from '../../../lib/projectRanking';
import { getCommunityRepos, getLastGoodCommunity, setLastGoodCommunity } from '../../../lib/community-kv';
import { loadCommunity } from '../../../lib/community-data';
import { summarizePr } from '../../../lib/gemini';
import type { CommunityData, CommunityProject, CommunityPR, CommunityRepoState } from '../../../lib/community';

export const prerender = false;

const GITHUB_USER = import.meta.env.GITHUB_USER;
const GITHUB_REPO = import.meta.env.GITHUB_REPO;

// Support both "owner/repo" slug and plain repo name
const repoSlug = GITHUB_REPO?.includes('/') ? GITHUB_REPO : `${GITHUB_USER}/${GITHUB_REPO}`;

// ── Community step helpers ──
//
// The community step runs BEFORE the projects commit and is wrapped in its own
// try/catch at the call site, so any failure falls back to last-known-good in
// KV without blocking the projects sync.
//
// GitHub login resolution: GITHUB_LOGIN env var wins; otherwise we derive the
// login from the GITHUB_TOKEN by hitting /user. If both fail the step is a
// no-op (info log) so misconfiguration never crashes the cron.

let cachedGithubLogin: string | null | undefined = undefined;

async function resolveGithubLogin(): Promise<string | null> {
  if (cachedGithubLogin !== undefined) return cachedGithubLogin;
  const explicit = import.meta.env.GITHUB_LOGIN as string | undefined;
  if (explicit && explicit.trim()) {
    cachedGithubLogin = explicit.trim();
    return cachedGithubLogin;
  }
  // Derive from token: GET /user → login
  try {
    const res = await fetch('https://api.github.com/user', { headers: authHeaders() });
    if (!res.ok) { cachedGithubLogin = null; return null; }
    const data = (await res.json()) as { login?: string };
    cachedGithubLogin = data?.login ?? null;
    return cachedGithubLogin;
  } catch {
    cachedGithubLogin = null;
    return null;
  }
}

interface MergedPrApiItem {
  number: number;
  title: string;
  html_url: string;
  body: string | null;
  merged_at: string | null;
  pull_request?: { html_url?: string };
}

interface RepoFetchResult {
  stars: number;
  prs: MergedPrApiItem[];
}

async function fetchActiveRepoContribution(
  repo: CommunityRepoState,
  login: string,
): Promise<RepoFetchResult> {
  const { owner, name } = repo;
  // Stars via REST (cheaper than a second GraphQL call here).
  let stars = 0;
  try {
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${name}`, { headers: authHeaders() });
    if (repoRes.ok) {
      const repoJson = (await repoRes.json()) as { stargazers_count?: number };
      stars = repoJson?.stargazers_count ?? 0;
    } else if (repoRes.status === 404) {
      // Repo removed/renamed — keep last-known-good by signaling empty fetch.
      console.warn(`[CRON] Community repo ${owner}/${name} returned 404, preserving last-known-good`);
      return { stars: 0, prs: [] };
    } else {
      throw new Error(`GH_repo_${repoRes.status}`);
    }
  } catch (e: any) {
    // Network/5xx on repo metadata — skip this repo, preserve last-known-good.
    throw e;
  }

  // Merged PRs authored by the user.
  const q = `is:pr+author:${login}+repo:${owner}/${name}+is:merged+sort:updated-desc`;
  const searchUrl = `https://api.github.com/search/issues?q=${encodeURIComponent(q).replace(/%2B/g, '+')}&per_page=100`;
  const searchRes = await fetch(searchUrl, { headers: authHeaders() });
  if (!searchRes.ok) {
    throw new Error(`GH_search_${searchRes.status}`);
  }
  const searchJson = (await searchRes.json()) as { items?: MergedPrApiItem[] };
  const items = Array.isArray(searchJson?.items) ? searchJson.items : [];
  // Keep only PRs that actually merged (defensive — search should already filter).
  const merged = items.filter((it) => it.merged_at);
  return { stars, prs: merged };
}

function diffNewPrs(existingPrs: CommunityPR[], fetched: MergedPrApiItem[]): MergedPrApiItem[] {
  const seen = new Set(existingPrs.map((p) => p.number));
  return fetched.filter((it) => !seen.has(it.number));
}

function toCommunityPr(it: MergedPrApiItem, summary: string | null, summaryError?: string): CommunityPR {
  const url = it.pull_request?.html_url || it.html_url;
  return {
    number: it.number,
    title: it.title,
    url,
    mergedAt: it.merged_at ?? new Date().toISOString(),
    summary,
    ...(summaryError ? { summaryError } : {}),
  };
}

async function runCommunityStep(): Promise<void> {
  const repos = await getCommunityRepos();
  if (repos.length === 0) {
    console.log('[CRON] Community step: no active repos, skipping');
    return;
  }

  const login = await resolveGithubLogin();
  if (!login) {
    console.warn('[CRON] Community step: could not resolve GitHub login, skipping');
    return;
  }

  // Existing data: prefer on-disk community.json, fall back to last-known-good KV.
  const existingOnDisk = loadCommunity();
  const lastGood: CommunityData | null = existingOnDisk.projects.length > 0
    ? existingOnDisk
    : await getLastGoodCommunity();
  const prevProjects: CommunityProject[] = (lastGood?.projects ?? []) as CommunityProject[];
  const existingBySlug = new Map<string, CommunityProject>(
    prevProjects.map((p) => [p.slug, p] as [string, CommunityProject]),
  );

  const newProjects: CommunityProject[] = [];
  for (const repo of repos.filter((repo) => repo.active)) {
    const slug = `${repo.owner}-${repo.name}`;
    const prev = existingBySlug.get(slug);
    try {
      const { stars, prs: fetched } = await fetchActiveRepoContribution(repo, login);
      const prevPrs = prev?.prs ?? [];
      const newItems = diffNewPrs(prevPrs, fetched);

      // Summarize only NEW prs via Gemini. Reuse previous summaries for known PRs.
      const summarizedNew: CommunityPR[] = [];
      for (const it of newItems) {
        // linkedIssueTitle is not cheaply available here; Gemini prompt handles its absence.
        const { summary, error } = await summarizePr({ title: it.title, body: it.body ?? '' });
        summarizedNew.push(toCommunityPr(it, summary, error));
      }

      // Merge: keep prev summaries for already-known PRs, add new ones, sort oldest→newest.
      const knownFetched = fetched
        .filter((it) => prevPrs.some((pp) => pp.number === it.number))
        .map((it) => toCommunityPr(it, prevPrs.find((pp) => pp.number === it.number)?.summary ?? null));
      const all = [...knownFetched, ...summarizedNew].sort(
        (a, b) => new Date(a.mergedAt).getTime() - new Date(b.mergedAt).getTime(),
      );

      newProjects.push({
        slug,
        owner: repo.owner,
        name: repo.name,
        url: `https://github.com/${repo.owner}/${repo.name}`,
        stars,
        active: repo.active,
        addedAt: repo.addedAt,
        lastSyncedAt: new Date().toISOString(),
        prs: all,
      });
    } catch (e: any) {
      // Single-repo failure: keep last-known-good for this repo, continue others.
      console.error(`[CRON] Community repo ${slug} fetch failed, preserving last-known-good: ${e?.message ?? e}`);
      if (prev) {
        newProjects.push({ ...prev, active: repo.active });
      }
    }
  }

  // Include inactive repos from admin state so the UI can show them greyed-out.
  for (const repo of repos) {
    const slug = `${repo.owner}-${repo.name}`;
    if (!newProjects.some((p) => p.slug === slug)) {
      const prev = existingBySlug.get(slug) as CommunityProject | undefined;
      if (prev) {
        newProjects.push({ ...prev, active: false });
      } else {
        newProjects.push({
          slug,
          owner: repo.owner,
          name: repo.name,
          url: `https://github.com/${repo.owner}/${repo.name}`,
          stars: 0,
          active: false,
          addedAt: repo.addedAt,
          lastSyncedAt: null,
          prs: [],
        });
      }
    }
  }

  const totalMerged = newProjects.reduce((sum, p) => sum + p.prs.length, 0);
  const data: CommunityData = {
    version: 1,
    generatedAt: new Date().toISOString(),
    totalMerged,
    projects: newProjects,
  };

  // Commit community.json via the Contents API (same pattern as projects.json).
  if (GITHUB_USER && GITHUB_REPO) {
    const content = JSON.stringify(data, null, 2);
    const encoded = Buffer.from(content).toString('base64');
    const getRes = await fetch(`https://api.github.com/repos/${repoSlug}/contents/public/data/community.json`, {
      headers: authHeaders(),
    });
    let sha: string | undefined;
    if (getRes.ok) {
      const current = await getRes.json();
      sha = current?.sha;
    } else if (getRes.status !== 404) {
      throw new Error(`community.json SHA fetch failed: ${getRes.status}`);
    }
    const commitRes = await fetch(`https://api.github.com/repos/${repoSlug}/contents/public/data/community.json`, {
      method: 'PUT',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'chore(community): refresh contributions [cron]',
        content: encoded,
        ...(sha && { sha }),
      }),
    });
    if (!commitRes.ok) {
      throw new Error(`community.json commit failed: ${commitRes.status}`);
    }
    console.log(`[CRON] Committed community.json (${totalMerged} merged PRs across ${newProjects.length} repos)`);
  }

  // Update last-known-good in KV so future runs can diff against it even if
  // community.json is absent or stale on disk.
  await setLastGoodCommunity(data);
}

// Cron job: updates all project metadata via GraphQL
// Hourly: just activity logs
// Daily at 00:00 UTC: full repo update + commit to GitHub → Vercel rebuild

export const GET: APIRoute = async ({ request }) => {
  // Guard: required env vars
  if (!GITHUB_REPO || !GITHUB_USER) {
    const missing = !GITHUB_REPO ? 'GITHUB_REPO' : 'GITHUB_USER';
    return new Response(JSON.stringify({ success: false, error: `Missing env var: ${missing}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Verify cron secret (required in PROD)
  // Supports: Bearer token header or Basic Auth (username:password = any:CRON_SECRET)
  // Basic Auth is for cron-job.org which sends username/password fields
  const authHeader = request.headers.get('authorization');
  const CRON_SECRET = import.meta.env.CRON_SECRET;
  if (import.meta.env.PROD && CRON_SECRET) {
    let authenticated = false;
    if (authHeader?.startsWith('Bearer ') && authHeader === `Bearer ${CRON_SECRET}`) {
      authenticated = true;
    } else if (authHeader?.startsWith('Basic ')) {
      const decoded = Buffer.from(authHeader.slice(6), 'base64').toString();
      const password = decoded.includes(':') ? decoded.split(':')[1] : decoded;
      authenticated = password === CRON_SECRET;
    }
    if (!authenticated) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // Check query params for force mode
  const url = new URL(request.url);
  const forceParam = url.searchParams.get('force');
  const scheduleParam = url.searchParams.get('schedule');
  
  const currentHour = new Date().getUTCHours();
  
  // Determine mode: query param > default logic
  let isDailyUpdate = false;
  
  if (forceParam === 'daily' || scheduleParam === 'daily') {
    isDailyUpdate = true; // Force daily mode
  } else if (forceParam === 'hourly' || scheduleParam === 'hourly') {
    isDailyUpdate = false; // Force hourly mode
  } else {
    // Default: daily at 00:00 UTC
    isDailyUpdate = currentHour === 0;
  }

  try {
    const projects = projectsData as any[];
    const errors: string[] = [];

    // ── COMMUNITY STEP (runs BEFORE projects commit; independent try/catch) ──
    // Failure here MUST NOT block the projects step. On any error it logs and
    // falls back to last-known-good in KV; the projects sync continues.
    if (isDailyUpdate) {
      try {
        await runCommunityStep();
      } catch (e: any) {
        console.error(`[CRON] Community step failed (non-blocking): ${e?.message ?? e}`);
      }
    }

    // Update each project (limit to top N public projects with repoSlug)
    const autoRefreshTargets = getAutoRefreshProjects(projects).filter(p => p.specs?.repoSlug && !p.isPrivate);
    for (const p of autoRefreshTargets) {
      const slug = p.specs?.repoSlug;
      if (!slug) continue;
      
      try {
        const details = await getRepoDetails(slug);
        
        // Update stars and pushedAt
        p.specs = p.specs || {};
        p.specs.stars = details.specsStars;
        p.pushedAt = details.pushedAt;
        
        // Update stack/languages if daily - disabled: stack is 100% manually controlled
        // if (isDailyUpdate && details.stackWithUsage?.length) {
        //   p.stack = details.stack;
        //   p.stackWithUsage = details.stackWithUsage;
        // }
        
        console.log(`[CRON] Synced ${slug}: ${details.specsStars} stars`);
      } catch (e: any) {
        const msg = `Failed ${slug}: ${e.message}`;
        console.error(`[CRON] ${msg}`);
        errors.push(msg);
      }
    }

    // If daily update, commit to GitHub
    if (isDailyUpdate) {
      const content = JSON.stringify(projects, null, 2);
      const encoded = Buffer.from(content).toString('base64');
      
      // Get current SHA
      const getRes = await fetch(`https://api.github.com/repos/${repoSlug}/contents/public/data/projects.json`, {
        headers: authHeaders()
      });
      
      let sha: string | undefined;
      if (getRes.ok) {
        const current = await getRes.json();
        sha = current?.sha;
      } else if (getRes.status === 404) {
        // File doesn't exist yet — first commit, no SHA needed
        console.warn('[CRON] projects.json not found on remote, will create new file');
      } else {
        const errText = await getRes.text();
        return new Response(JSON.stringify({ 
          success: false, 
          error: `SHA fetch failed: ${getRes.status}`,
          details: errText
        }), { status: 502, headers: { 'Content-Type': 'application/json' } });
      }
      
      // Commit with dynamic message
      const updatedCount = projects.length;
      const timestamp = new Date().toISOString().split('T')[0];
      const message = `data: daily sync ${updatedCount} projects [${timestamp}]`;
      
      const commitRes = await fetch(`https://api.github.com/repos/${repoSlug}/contents/public/data/projects.json`, {
        method: 'PUT',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message,
          content: encoded,
          ...(sha && { sha })
        })
      });
      
      if (!commitRes.ok) {
        const errText = await commitRes.text();
        return new Response(JSON.stringify({ 
          success: false, 
          error: `Commit failed: GitHub returned ${commitRes.status}`,
          details: errText
        }), { status: 502, headers: { 'Content-Type': 'application/json' } });
      }
      
      console.log('[CRON] Committed to GitHub → rebuild will trigger');
    }

    // Determine status code: 207 for partial failures, 200 for full success
    const statusCode = errors.length > 0 && errors.length < projects.length ? 207 : 200;
    const allFailed = errors.length > 0 && errors.length === projects.filter((p: any) => p.specs?.repoSlug).length;
    
    if (allFailed) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'All projects failed to sync',
        errors 
      }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ 
      success: true,
      update: isDailyUpdate ? 'full' : 'logs',
      hour: currentHour,
      count: projects.length,
      timestamp: new Date().toISOString(),
      ...(errors.length > 0 ? { partialFailures: errors } : {})
    }), { status: statusCode, headers: { 'Content-Type': 'application/json' } });
    
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { 
      status: 502, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
};
