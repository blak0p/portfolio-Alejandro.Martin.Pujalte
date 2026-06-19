import type { APIRoute } from 'astro';
import { kv } from '@vercel/kv';
import { 
  authHeaders, 
  getRepoDetails, 
  decodeBase64 
} from '../../lib/github-server';

export const prerender = false;

const GITHUB_TOKEN = import.meta.env.GITHUB_TOKEN;
const GITHUB_REPO = import.meta.env.GITHUB_REPO;
const GITHUB_USER = import.meta.env.GITHUB_USER;

async function handleUploadCv(body: any) {
  const { base64 } = body;
  if (!base64) throw new Error('Missing base64');
  const content = base64; // already base64 from client
  const path = 'public/cv.pdf';
  const repo = GITHUB_REPO;
  
  const h = authHeaders();
  
  // Try to get existing file SHA
  let sha: string | undefined;
  try {
    const existingRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, { headers: h });
    if (existingRes.ok) {
      const existing = await existingRes.json();
      sha = existing.sha;
    }
  } catch {}
  
  const msg = {
    message: sha ? 'Update CV' : 'Add CV',
    content,
    encoding: 'base64',
    ...(sha && { sha })
  };
  
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: h,
    body: JSON.stringify(msg)
  });
  
  if (!res.ok) throw new Error(`Upload failed ${res.status}`);
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}

async function handleGetActivity(body: any) {
  const { username } = body;
  if (!username) throw new Error('Missing username');

  const h = authHeaders();
  const res = await fetch(`https://api.github.com/users/${username}/events/public?per_page=60`, { headers: h });
  if (!res.ok) throw new Error(`Activity failed ${res.status}`);
  const events = await res.json();
  return new Response(JSON.stringify(events), { status: 200 });
}

async function handleGetUserRepos() {
  const h = authHeaders();
  const res = await fetch('https://api.github.com/user/repos?sort=pushed&per_page=100&affiliation=owner,collaborator,organization_member', { headers: h });
  if (!res.ok) throw new Error(`Repos fetch failed ${res.status}`);
  const repos = await res.json();
  const formatted = repos.map((r: any) => ({
    name: r.name,
    fullName: r.full_name,
    description: r.description,
    language: r.language,
    private: r.private,
    pushedAt: r.pushed_at,
    stars: r.stargazers_count,
    url: r.html_url,
    photo: `https://opengraph.githubassets.com/1/${r.full_name}`
  }));
  return new Response(JSON.stringify(formatted), { status: 200 });
}

async function handleGetRepoDetails(body: any) {
  const { repoSlug } = body;
  if (!repoSlug) throw new Error('Missing repoSlug');
  const details = await getRepoDetails(repoSlug);
  return new Response(JSON.stringify(details), { status: 200 });
}

async function handleGetRepoContent(body: any) {
  const { repoSlug, path } = body;
  if (!repoSlug) throw new Error('Missing repoSlug');

  const h = authHeaders();
  const url = path 
    ? `https://api.github.com/repos/${repoSlug}/contents/${path}`
    : `https://api.github.com/repos/${repoSlug}/readme`;

  const res = await fetch(url, { headers: h });
  if (!res.ok) throw new Error(`Content failed ${res.status}`);
  const data = await res.json();
  
  const content = decodeBase64(data.content);
  return new Response(JSON.stringify({
    content,
    path: data.path,
    sha: data.sha
  }), { status: 200 });
}

async function handleGetCache() {
  const data = await kv.get('portfolio_github_cache');
  return new Response(JSON.stringify({ data: data || null }), { status: 200 });
}

async function handlePublish(body: Record<string, unknown>) {
  const { branch, files, buildNum, message } = body as {
    branch: string;
    files: { path: string; content: string }[];
    buildNum: number;
    message?: string;
  };

  const repo = GITHUB_REPO;
  if (!repo || !branch || !Array.isArray(files) || !files.length) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
  }

  const h = authHeaders();

  const refRes = await fetch(`https://api.github.com/repos/${repo}/git/ref/heads/${branch}`, { headers: h });
  if (!refRes.ok) throw new Error(`Branch '${branch}' not found — ${refRes.status}`);
  const ref = await refRes.json();
  const latestSha: string = ref.object.sha;

  const commitRes = await fetch(`https://api.github.com/repos/${repo}/git/commits/${latestSha}`, { headers: h });
  if (!commitRes.ok) throw new Error('Commit not found');
  const commitData = await commitRes.json();
  const baseTree: string = commitData.tree.sha;

  const treeItems = await Promise.all(
    files.map(async (f) => {
      const blobRes = await fetch(`https://api.github.com/repos/${repo}/git/blobs`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify({ content: Buffer.from(f.content, 'utf-8').toString('base64'), encoding: 'base64' }),
      });
      if (!blobRes.ok) throw new Error(`Blob failed for ${f.path}`);
      const blob = await blobRes.json();
      return { path: f.path, mode: '100644', type: 'blob', sha: blob.sha };
    })
  );

  const treeRes = await fetch(`https://api.github.com/repos/${repo}/git/trees`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ base_tree: baseTree, tree: treeItems }),
  });
  if (!treeRes.ok) throw new Error('Tree creation failed');
  const tree = await treeRes.json();

  const newCommitRes = await fetch(`https://api.github.com/repos/${repo}/git/commits`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({
      message: message || `data: update portfolio content [build #${buildNum}]`,
      tree: tree.sha,
      parents: [latestSha],
    }),
  });
  if (!newCommitRes.ok) throw new Error('Commit creation failed');
  const newCommit = await newCommitRes.json();

  const updateRes = await fetch(`https://api.github.com/repos/${repo}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    headers: h,
    body: JSON.stringify({ sha: newCommit.sha }),
  });
  if (!updateRes.ok) throw new Error('Ref update failed');

  return new Response(JSON.stringify({ success: true, sha: newCommit.sha }), { status: 200 });
}

export const POST: APIRoute = async ({ request }) => {
  if (!GITHUB_TOKEN) {
    return new Response(JSON.stringify({ error: 'GITHUB_TOKEN not configured on server' }), { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  try {
    const action = body.action as string;
    if (action === 'publish') return await handlePublish(body);
    if (action === 'uploadCv') return await handleUploadCv(body);
    if (action === 'getRepoDetails') return await handleGetRepoDetails(body);
    if (action === 'getActivity') return await handleGetActivity(body);
    if (action === 'getRepoContent') return await handleGetRepoContent(body);
    if (action === 'getCache') return await handleGetCache();
    if (action === 'getUserRepos') return await handleGetUserRepos();
    
    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error';
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
};
