import type { APIRoute } from 'astro';
import { createAdminSessionCookie } from '../../lib/auth-server';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    // Leemos el texto crudo primero para ver qué llega
    const text = await request.text();
    if (!text) {
      return new Response(JSON.stringify({ error: 'EMPTY_BODY' }), { status: 400 });
    }

    const { password } = JSON.parse(text);
    
    // Astro local usa import.meta.env
    const ADMIN_PASSWORD = import.meta.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

    if (!ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: 'ENV_NOT_SET' }), { status: 412 });
    }

    if (password === ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': createAdminSessionCookie()
        }
      });
    }

    return new Response(JSON.stringify({ error: 'INVALID_CREDENTIALS' }), { status: 401 });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'JSON_PARSE_ERROR' }), { status: 400 });
  }
};
