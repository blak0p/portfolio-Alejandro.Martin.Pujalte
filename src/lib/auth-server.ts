import { createHmac, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';

const SESSION_COOKIE_NAME = 'admin_session';
const DEFAULT_TTL_SECONDS = 604800; // 7 days

function getSecret(): string {
  return (
    import.meta.env?.AUTH_SECRET ||
    import.meta.env?.ADMIN_PASSWORD ||
    (typeof process !== 'undefined' ? process.env?.AUTH_SECRET || process.env?.ADMIN_PASSWORD : '') ||
    'portfolio-fallback-secret-key-32chars'
  );
}

export function createAdminToken(): string {
  const timestamp = Date.now().toString();
  const secret = getSecret();
  const signature = createHmac('sha256', secret)
    .update(timestamp)
    .digest('hex');
  return `${timestamp}.${signature}`;
}

export function verifyAdminToken(token: string, maxAgeMs: number = DEFAULT_TTL_SECONDS * 1000): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [timestampStr, signature] = parts;
  const timestamp = Number(timestampStr);
  if (!Number.isFinite(timestamp)) return false;

  const now = Date.now();
  // Reject if token is expired or skewed more than 5 minutes into the future
  if (now - timestamp > maxAgeMs || timestamp > now + 5 * 60 * 1000) {
    return false;
  }

  const secret = getSecret();
  const expectedSignature = createHmac('sha256', secret)
    .update(timestampStr)
    .digest('hex');

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expectedBuf.length) {
    return false;
  }

  return timingSafeEqual(sigBuf, expectedBuf);
}

export function createAdminSessionCookie(): string {
  const token = createAdminToken();
  const secure = import.meta.env?.PROD ? 'Secure;' : '';
  return `admin_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800; ${secure}`.trim();
}

function parseCookies(header: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      cookies[key] = val;
    }
  }
  return cookies;
}

export function verifyAdminSession(request: Request): boolean {
  try {
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) return false;
    const cookies = parseCookies(cookieHeader);
    const sessionToken = cookies[SESSION_COOKIE_NAME];
    if (!sessionToken) return false;
    return verifyAdminToken(sessionToken);
  } catch {
    return false;
  }
}
