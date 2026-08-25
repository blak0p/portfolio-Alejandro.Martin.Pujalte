// Vercel KV helpers for community state.
//
// Two keys:
//   - community:repos   — admin-managed list of { owner, name, active, addedAt }
//   - community:lastGood — last-known-good full CommunityData JSON string
//
// All accessors degrade gracefully when @vercel/kv is not configured (local dev
// without KV env vars): they return empty/null instead of throwing. This lets
// the admin tab and cron run locally with no infrastructure.

import type { CommunityData, CommunityRepoState } from './community';

const REPOS_KEY = 'community:repos';
const LAST_GOOD_KEY = 'community:lastGood';

// Lazy KV accessor. Returns null when @vercel/kv is unavailable so callers can
// fall back to empty/null without a try/catch around every call.
async function getKv(): Promise<{ get: (k: string) => Promise<unknown>; set: (k: string, v: unknown) => Promise<unknown> } | null> {
  try {
    const mod = await import('@vercel/kv');
    const kv = (mod as { kv?: { get: (k: string) => Promise<unknown>; set: (k: string, v: unknown) => Promise<unknown> } }).kv;
    if (!kv || typeof kv.get !== 'function' || typeof kv.set !== 'function') {
      console.error('[KV] @vercel/kv imported but kv object invalid');
      return null;
    }
    return kv;
  } catch (e: any) {
    console.error('[KV] Failed to import @vercel/kv:', e?.message ?? e);
    return null;
  }
}

// JSON.parse with a typed fallback so a corrupt KV value never throws.
function parseRepos(raw: unknown): CommunityRepoState[] {
  if (Array.isArray(raw)) return raw as CommunityRepoState[];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as CommunityRepoState[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/* ---------------- community:repos ---------------- */

export async function getCommunityRepos(): Promise<CommunityRepoState[]> {
  const kv = await getKv();
  if (!kv) return [];
  try {
    return parseRepos(await kv.get(REPOS_KEY));
  } catch {
    return [];
  }
}

export async function setCommunityRepos(repos: CommunityRepoState[]): Promise<boolean> {
  const kv = await getKv();
  if (!kv) {
    console.error('[KV] setCommunityRepos: KV not available');
    return false;
  }
  try {
    await kv.set(REPOS_KEY, JSON.stringify(repos));
    return true;
  } catch (e: any) {
    console.error('[KV] setCommunityRepos failed:', e?.message ?? e);
    return false;
  }
}

/** Idempotent: does not duplicate an existing owner/name. Returns the new list. */
export async function addCommunityRepo(entry: Omit<CommunityRepoState, 'addedAt'> & { addedAt?: string }): Promise<CommunityRepoState[]> {
  const repos = await getCommunityRepos();
  const exists = repos.some((r) => r.owner === entry.owner && r.name === entry.name);
  if (exists) return repos;
  const next: CommunityRepoState = {
    owner: entry.owner,
    name: entry.name,
    active: entry.active,
    addedAt: entry.addedAt ?? new Date().toISOString(),
  };
  const updated = [...repos, next];
  if (!await setCommunityRepos(updated)) throw new Error('Could not persist community repos');
  return updated;
}

export async function removeCommunityRepo({ owner, name }: { owner: string; name: string }): Promise<CommunityRepoState[]> {
  const repos = await getCommunityRepos();
  const updated = repos.filter((r) => !(r.owner === owner && r.name === name));
  if (!await setCommunityRepos(updated)) throw new Error('Could not persist community repos');
  return updated;
}

export async function toggleCommunityRepoActive({ owner, name }: { owner: string; name: string }): Promise<CommunityRepoState[]> {
  const repos = await getCommunityRepos();
  const updated = repos.map((r) =>
    r.owner === owner && r.name === name ? { ...r, active: !r.active } : r,
  );
  if (!await setCommunityRepos(updated)) throw new Error('Could not persist community repos');
  return updated;
}

/* ---------------- community:lastGood ---------------- */

export async function getLastGoodCommunity(): Promise<CommunityData | null> {
  const kv = await getKv();
  if (!kv) return null;
  try {
    const raw = await kv.get(LAST_GOOD_KEY);
    if (typeof raw === 'string') {
      const parsed = JSON.parse(raw) as CommunityData;
      return parsed && typeof parsed === 'object' && Array.isArray(parsed.projects) ? parsed : null;
    }
    if (raw && typeof raw === 'object' && Array.isArray((raw as CommunityData).projects)) {
      return raw as CommunityData;
    }
    return null;
  } catch {
    return null;
  }
}

export async function setLastGoodCommunity(data: CommunityData): Promise<boolean> {
  const kv = await getKv();
  if (!kv) return false;
  try {
    await kv.set(LAST_GOOD_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
