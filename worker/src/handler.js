/**
 * Request handling of the contact worker, independent of Cloudflare APIs.
 * Sending, health check and rate limiting are passed in as functions, so
 * the tests can replace them (worker/test/handler.test.js).
 *
 * Routes:
 *   POST /        form submission (JSON), only from ALLOWED_ORIGINS
 *   OPTIONS /     CORS preflight
 *   GET /health   SMTP login check for monitoring, needs HEALTH_TOKEN
 *
 * Every response is JSON: { ok: true } or { ok: false, error: '<code>' }.
 */
import { buildMessage } from './message.js';
import { validateSubmission } from './validation.js';

const MAX_BODY_BYTES = 10_000;

/**
 * @typedef {object} Deps
 * @property {(message: object) => Promise<void>} sendMail
 * @property {() => Promise<void>} checkMail
 * @property {(ip: string) => Promise<{ allowed: boolean, reason?: string }>} consumeQuota
 */

/**
 * @param {Request} request
 * @param {Record<string, string>} env
 * @param {Deps} deps
 */
export async function handleRequest(request, env, deps) {
  const { pathname } = new URL(request.url);
  if (pathname === '/health') return health(request, env, deps);
  if (pathname !== '/') return json(404, { ok: false, error: 'not_found' });

  /* The origin check keeps other websites from using the form through
     their visitors' browsers. Scripts can fake the header, so the real
     protection against abuse is the rate limit further down. */
  const origin = request.headers.get('Origin');
  if (!allowedOrigins(env).includes(origin)) {
    return json(403, { ok: false, error: 'forbidden_origin' });
  }

  const cors = corsHeaders(origin);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST') {
    return json(
      405,
      { ok: false, error: 'method_not_allowed' },
      { ...cors, Allow: 'POST, OPTIONS' },
    );
  }

  const fail = (status, error, extra = {}) => json(status, { ok: false, error, ...extra }, cors);

  if (!request.headers.get('Content-Type')?.startsWith('application/json')) {
    return fail(415, 'unsupported_media_type');
  }
  if (Number(request.headers.get('Content-Length')) > MAX_BODY_BYTES) {
    return fail(413, 'too_large');
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return fail(413, 'too_large');

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return fail(400, 'invalid_json');
  }

  /* Honeypot: only bots fill in the hidden field. They get the same answer
     as a real sender, so they have no reason to try a different approach. */
  if (body?._gotcha) {
    log('honeypot');
    return json(200, { ok: true }, cors);
  }

  const result = validateSubmission(body);
  if (!result.ok) return fail(422, 'invalid', { fields: result.fields });

  /* Counted only now: honeypot hits and invalid requests cost no quota, so
     a bot cannot use them to lock out real visitors. */
  let quota;
  try {
    quota = await deps.consumeQuota(request.headers.get('CF-Connecting-IP') ?? 'unknown');
  } catch (error) {
    log('quota_error', { error: error.message });
    return fail(503, 'unavailable');
  }
  if (!quota.allowed) {
    log('rate_limited', { reason: quota.reason });
    return fail(429, 'rate_limited');
  }

  try {
    await deps.sendMail(buildMessage(result.data, env));
  } catch (error) {
    // The SMTP reply says what went wrong (e.g. "535 authentication failed");
    // the message itself is never logged.
    log('send_failed', { error: error.message });
    return fail(502, 'send_failed');
  }

  log('sent');
  return json(200, { ok: true }, cors);
}

async function health(request, env, deps) {
  if (request.method !== 'GET') return json(405, { ok: false, error: 'method_not_allowed' });

  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '';
  if (!env.HEALTH_TOKEN || !safeEqual(token, env.HEALTH_TOKEN)) {
    return json(401, { ok: false, error: 'unauthorized' });
  }

  try {
    await deps.checkMail();
    return json(200, { ok: true });
  } catch (error) {
    log('health_failed', { error: error.message });
    return json(503, { ok: false, error: 'smtp_unavailable' });
  }
}

const allowedOrigins = (env) =>
  (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const corsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
});

const json = (status, body, headers = {}) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

/** Compares in constant time, so the response time reveals nothing about the token. */
function safeEqual(a, b) {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  let diff = left.length ^ right.length;
  for (let i = 0; i < right.length; i++) diff |= (left[i] ?? 0) ^ right[i];
  return diff === 0;
}

/** One JSON line per event in the Workers logs – never any form content. */
const log = (event, details = {}) => console.log(JSON.stringify({ event, ...details }));
