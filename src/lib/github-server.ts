import { Buffer } from 'node:buffer';

const GITHUB_TOKEN = import.meta.env.GITHUB_TOKEN;

type GHHeaders = Record<string, string>;

export function authHeaders(): GHHeaders {
  return {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'User-Agent': 'Core-OS-Portfolio'
  };
}

export function decodeBase64(content: string): string {
  return Buffer.from(content.replace(/\n/g, ''), 'base64').toString('utf-8');
}

export function parseFrontmatter(raw: string): { data: Record<string, any>; content: string } {
  const yamlMatch = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (yamlMatch) {
    const data: Record<string, any> = {};
    const lines = yamlMatch[1].split('\n');
    for (const line of lines) {
      const splitAt = line.indexOf(':');
      if (splitAt > 0) {
        const k = line.slice(0, splitAt).trim();
        let v: any = line.slice(splitAt + 1).trim();
        if (v.startsWith('[') && v.endsWith(']')) {
          v = v.slice(1, -1).split(',').map((s: string) => s.trim().replace(/^["']|["']$/g, ''));
        } else if (v.toLowerCase() === 'true') v = true;
        else if (v.toLowerCase() === 'false') v = false;
        else if (!isNaN(v) && v !== '') v = Number(v);
        data[k] = v;
      }
    }
    return { data, content: yamlMatch[2].trim() };
  }

  const jsonMatch = raw.match(/^---json\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (jsonMatch) {
    try {
      return { data: JSON.parse(jsonMatch[1]), content: jsonMatch[2].trim() };
    } catch { }
  }

  return { data: {}, content: raw.trim() };
}

export function parseReadmeFallback(raw: string) {
  const archMatch = raw.match(/#+\s*(architect\w*|structure|design|overview)[^\n]*\n([\s\S]*?)(?=\n#+\s|\n---|\n___|\n\*\*\*|$)/i);
  const architecture = archMatch ? archMatch[2].replace(/```[\s\S]*?```/g, '').replace(/[#*`]/g, '').trim().slice(0, 400) : '';
  const techMatches = raw.match(/`([A-Za-z][A-Za-z0-9+#._-]{1,20})`/g) ?? [];
  const stack = [...new Set(techMatches.map(t => t.replace(/`/g, '').toUpperCase()))].slice(0, 12);
  
  const imgMatch = raw.match(/!\[.*?\]\((.*?)\)/);
  const photo = imgMatch ? imgMatch[1] : '';

  return { architecture, stack, photo };
}

export async function getRepoDetails(repoSlug: string) {
  const [owner, repo] = repoSlug.split('/');
  if (!owner || !repo) throw new Error('Invalid repoSlug');

  // UNA SOLA QUERY para TODO: detalles + privado + README
  const graphqlQuery = `
    query GetRepoFull($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        name
        description
        stargazerCount
        pushedAt
        url
        isPrivate
        languages(first: 15, orderBy: {field: SIZE, direction: DESC}) {
          edges {
            node { name color }
            size
          }
        }
        object(expression: "HEAD:README.md") { ... on Blob { text } }
      }
    }
  `;

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: graphqlQuery,
      variables: { owner, repo }
    })
  });

  if (!res.ok) throw new Error(`GH_${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(`GH_GRAPHQL_${json.errors[0].message}`);
  
  const r = json.data?.repository;
  if (!r) throw new Error('Repository not found');

  // README from GraphQL Blob.text is already decoded UTF-8 — no base64 decoding needed
  let readme = '';
  if (r.object?.text) {
    readme = r.object.text;
  }

  // Calcular percentages desde los sizes de languages
  const totalBytes = r.languages?.edges?.reduce((acc: number, e: any) => acc + (e.size || 0), 0) || 0;
  const stack = r.languages?.edges?.map((e: any) => e.node?.name?.toUpperCase())?.filter(Boolean) || [];
  const stackWithUsage = r.languages?.edges?.map((e: any) => ({
    name: e.node?.name?.toUpperCase(),
    color: e.node?.color,
    usageLevel: totalBytes > 0 ? Math.round((e.size / totalBytes) * 100) : 0,
  })) || [];

  return {
    id: r.name.toUpperCase().replace(/-/g, '_'),
    name: r.name.toUpperCase().replace(/-/g, '_'),
    photo: `https://opengraph.githubassets.com/1/${repoSlug}`,
    specsDescription: r.description || '',
    specsLanguage: stack[0] || '',
    specsStars: String(r.stargazerCount || 0),
    specsRepo: r.url || '',
    specsRepoSlug: repoSlug,
    specsStatus: 'PROD',
    pushedAt: r.pushedAt,
    stack,
    stackWithUsage,
    architecture: '',
    isPrivate: r.isPrivate || false,
    readme, // README incluido en la misma query!
    metadata: {}
  };
}
