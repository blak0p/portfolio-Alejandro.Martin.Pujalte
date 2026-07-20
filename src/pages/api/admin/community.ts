// Admin API route for community repo CRUD.
//
// Manages the `community:repos` Vercel KV list (repos the cron fetches OSS PRs
// from). Mirrors the existing admin API pattern in src/pages/api/github.ts:
//   - server-side GITHUB_TOKEN via authHeaders() (no client-passed secrets)
//   - action-based POST routing
//   - JSON errors returned, never thrown to the client
//
// The admin panel itself is OAuth-gated (session in sessionStorage); this route
// runs server-side with the portfolio owner's GITHUB_TOKEN, the same trust
// model as /api/github.

import type { APIRoute } from 'astro';
import { authHeaders } from '../../../lib/github-server';
import {
  getCommunityRepos,
  addCommunityRepo,
  removeCommunityRepo,
  toggleCommunityRepoActive,
} from '../../../lib/community-kv';

export const prerender = false;

const GITHUB_TOKEN = import.meta.env.GITHUB_TOKEN;

interface AddResponse {
  owner: string;
  name: string;
  active: boolean;
  addedAt: string;
  stars: number;
  url: string;
}

// Fetch repo metadata (stars, url, owner/name) via one GitHub REST call.
// Returns null on any failure so the caller can surface an inline error.
async function fetchRepoMetadata(owner: string, name: string): Promise<{ stars: number; url: string } | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
      headers: authHeaders(),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { stargazers_count?: number; html_url?: string };
    return { stars: data.stargazers_count ?? 0, url: data.html_url ?? `https://github.com/${owner}/${name}` };
  } catch {
    return null;
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  if (!GITHUB_TOKEN) {
    return json({ error: 'GITHUB_TOKEN not configured on server' }, 500);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const action = body.action as string;

  try {
    // ---- list ---------------------------------------------------------
    if (action === 'list') {
      const repos = await getCommunityRepos();
      return json({ repos }, 200);
    }

    // ---- add ----------------------------------------------------------
    if (action === 'add') {
      const url = (body.url as string | undefined)?.trim();
      if (!url) return json({ error: 'Missing url' }, 400);

      const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) return json({ error: 'Invalid GitHub URL' }, 400);
      const owner = match[1];
      const name = match[2].replace(/\.git$/, '').replace(/\/$/, '');
      if (!owner || !name) return json({ error: 'Invalid GitHub URL' }, 400);

      const current = await getCommunityRepos();
      const exists = current.some((r) => r.owner === owner && r.name === name);
      if (exists) return json({ error: 'Ese repositorio ya está en la lista' }, 409);

      // Verify the repo exists and fetch stars (single GitHub API call).
      const meta = await fetchRepoMetadata(owner, name);
      if (!meta) return json({ error: 'No se pudo obtener el repositorio' }, 404);

      const addedAt = new Date().toISOString();
      const updated = await addCommunityRepo({ owner, name, active: true, addedAt });
      const entry: AddResponse = {
        owner,
        name,
        active: true,
        addedAt,
        stars: meta.stars,
        url: meta.url,
      };
      return json({ success: true, repos: updated, added: entry }, 200);
    }

    // ---- toggle -------------------------------------------------------
    if (action === 'toggle') {
      const owner = body.owner as string | undefined;
      const name = body.name as string | undefined;
      if (!owner || !name) return json({ error: 'Missing owner/name' }, 400);
      const updated = await toggleCommunityRepoActive({ owner, name });
      return json({ success: true, repos: updated }, 200);
    }

    // ---- remove -------------------------------------------------------
    if (action === 'remove') {
      const owner = body.owner as string | undefined;
      const name = body.name as string | undefined;
      if (!owner || !name) return json({ error: 'Missing owner/name' }, 400);
      const updated = await removeCommunityRepo({ owner, name });
      return json({ success: true, repos: updated }, 200);
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Internal error';
    return json({ error: msg }, 500);
  }
};