interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const storage = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60 * 60 * 1000; // 1 hora
const MAX_UPLOADS = 30;

const CLIENT_ID_RE = /^[a-zA-Z0-9_\-]{3,50}$/;

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = storage.get(ip);

  if (!entry || now >= entry.resetAt) {
    storage.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_UPLOADS - 1, resetAt: now + WINDOW_MS };
  }

  entry.count += 1;

  if (entry.count > MAX_UPLOADS) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: MAX_UPLOADS - entry.count, resetAt: entry.resetAt };
}

/** Apenas para testes — permite resetar o estado */
export function _resetRateLimiterForTest(): void {
  storage.clear();
}