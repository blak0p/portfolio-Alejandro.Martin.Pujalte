import type { APIRoute } from 'astro';
import { getRepoDetails } from '../../../lib/github-server';
import projectsData from '../../../../public/data/projects.json';
import { authHeaders } from '../../../lib/github-server';
import { getAutoRefreshProjects } from '../../../lib/projectRanking';

export const prerender = false;

const GITHUB_USER = import.meta.env.GITHUB_USER;
const GITHUB_REPO = import.meta.env.GITHUB_REPO;

// Support both "owner/repo" slug and plain repo name
const repoSlug = GITHUB_REPO?.includes('/') ? GITHUB_REPO : `${GITHUB_USER}/${GITHUB_REPO}`;

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
        
        // Update stack/languages if daily
        if (isDailyUpdate && details.stackWithUsage?.length) {
          p.stack = details.stack;
          p.stackWithUsage = details.stackWithUsage;
        }
        
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