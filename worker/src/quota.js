/**
 * Counting logic of the rate limiter, kept free of Cloudflare APIs so it can
 * be unit-tested. The Durable Object in rate-limiter.js stores the state.
 *
 * Two limits protect Faruk's inbox and the IONOS account:
 *   - per sender: a few messages per hour from the same IP address
 *   - global: an upper limit per day, however many addresses a bot uses
 *
 * IP addresses are never stored. They are hashed with a random salt that is
 * replaced every day together with the counters, so yesterday's hashes
 * cannot be linked to anyone.
 */

export const IP_LIMIT = 5;
export const IP_WINDOW_MS = 60 * 60 * 1000;

/** UTC date as YYYY-MM-DD – the daily counter resets at midnight UTC. */
export const utcDay = (now) => new Date(now).toISOString().slice(0, 10);

/** Fresh state for a new day. */
export function createState(now) {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return { day: utcDay(now), salt: toHex(salt), count: 0, hits: {} };
}

/** Salted SHA-256 of an IP address, shortened to 16 hex characters. */
export async function hashIp(ip, salt) {
  const bytes = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return toHex(new Uint8Array(digest)).slice(0, 16);
}

/**
 * Counts one message for `key` if both limits allow it. Mutates `state`.
 * @returns {{ allowed: true } | { allowed: false, reason: 'ip_limit' | 'daily_limit' }}
 */
export function takeQuota(state, key, now, { dailyLimit, ipLimit = IP_LIMIT }) {
  pruneHits(state, now);

  const recent = state.hits[key] ?? [];
  if (recent.length >= ipLimit) return { allowed: false, reason: 'ip_limit' };
  if (state.count >= dailyLimit) return { allowed: false, reason: 'daily_limit' };

  state.hits[key] = [...recent, now];
  state.count += 1;
  return { allowed: true };
}

/** Forgets hits that have left the window, for every sender. Mutates `state`. */
export function pruneHits(state, now) {
  for (const [hashed, times] of Object.entries(state.hits)) {
    const recent = times.filter((time) => now - time < IP_WINDOW_MS);
    if (recent.length) state.hits[hashed] = recent;
    else delete state.hits[hashed];
  }
}

const toHex = (bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
