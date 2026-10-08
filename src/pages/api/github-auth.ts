import type { APIRoute } from 'astro';
import { createAdminSessionCookie } from '../../lib/auth-server';

export const prerender = false;

const CLIENT_ID = import.meta.env.GITHUB_OAUTH_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.GITHUB_OAUTH_CLIENT_SECRET;

export const GET: APIRoute = async ({ url }) => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return new Response(JSON.stringify({ error: 'OAuth not configured' }), { status: 500 });
  }

  // GitHub callback: redirect_uri lands here with ?code=...
  const code = url.searchParams.get('code');
  if (code) {
    return new Response(null, {
      status: 302,
      headers: { Location: `/admin?code=${encodeURIComponent(code)}` }
    });
  }

  // Initiate OAuth flow
  const host = import.meta.env.DEV ? url.origin : 'https://www.alejandro-m-p.com';
  const redirectUri = `${host}/api/github-auth`;
  const state = Math.random().toString(36).substring(2, 15);
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user&state=${state}`;

  return new Response(null, {
    status: 302,
    headers: {
      Location: githubAuthUrl,
      'Set-Cookie': `oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`
    }
  });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const { code } = await request.json();

    if (!code) {
      return new Response(JSON.stringify({ error: 'NO_CODE' }), { status: 400 });
    }

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code
      })
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return new Response(JSON.stringify({ error: tokenData.error }), { status: 401 });
    }

    const accessToken = tokenData.access_token;

    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    });

    const user = await userRes.json();

    // Verify the authenticated user is the portfolio owner
    const expectedUser = import.meta.env.GITHUB_USER;
    if (expectedUser && user.login?.toLowerCase() !== expectedUser.toLowerCase()) {
      return new Response(JSON.stringify({ error: 'UNAUTHORIZED_USER' }), { status: 403 });
    }

    return new Response(JSON.stringify({
      success: true,
      login: user.login,
      name: user.name
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': createAdminSessionCookie()
      }
    });
  } catch {
    return new Response(JSON.stringify({ error: 'OAuth flow failed' }), { status: 500 });
  }
};
