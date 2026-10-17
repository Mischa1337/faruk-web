/**
 * Tests the request handling end to end with fake sending, health check
 * and rate limiting – no network, no Cloudflare runtime.
 */
import { beforeEach, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest } from '../src/handler.js';

const ORIGIN = 'https://afp-coaching.de';

const env = {
  ALLOWED_ORIGINS: `${ORIGIN}, https://mischa1337.github.io`,
  MAIL_TO: 'kontakt@afp-coaching.de',
  MAIL_FROM: 'formular@afp-coaching.de',
  HEALTH_TOKEN: 'secret-token',
};

const submission = {
  name: 'Max Mustermann',
  email: 'max@mail.de',
  telefon: '',
  quelle: 'Instagram',
  nachricht: 'Ich möchte stärker werden.',
  _gotcha: '',
};

let sent;
let deps;

beforeEach(() => {
  // The handler logs one line per request; keep the test output clean
  mock.method(console, 'log', () => {});
  sent = [];
  deps = {
    sendMail: async (message) => void sent.push(message),
    checkMail: async () => {},
    consumeQuota: async () => ({ allowed: true }),
  };
});

const post = (body, headers = {}) =>
  new Request('https://worker.example/', {
    method: 'POST',
    headers: { Origin: ORIGIN, 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const call = async (request) => {
  const response = await handleRequest(request, env, deps);
  return { response, body: response.status === 204 ? null : await response.json() };
};

describe('form submission', () => {
  test('sends a valid submission to the fixed address', async () => {
    const { response, body } = await call(post(submission));
    assert.equal(response.status, 200);
    assert.deepEqual(body, { ok: true });
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, 'kontakt@afp-coaching.de');
    assert.deepEqual(sent[0].reply, { name: 'Max Mustermann', email: 'max@mail.de' });
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  });

  test('a recipient in the request is ignored', async () => {
    await call(post({ ...submission, to: 'someone@else.com', MAIL_TO: 'x@y.z' }));
    assert.equal(sent[0].to, 'kontakt@afp-coaching.de');
  });

  test('answers a filled-in honeypot with success, but sends nothing', async () => {
    const { response, body } = await call(post({ ...submission, _gotcha: 'http://spam' }));
    assert.equal(response.status, 200);
    assert.deepEqual(body, { ok: true });
    assert.equal(sent.length, 0);
  });

  test('rejects invalid fields and names them', async () => {
    const { response, body } = await call(post({ ...submission, email: 'kaputt' }));
    assert.equal(response.status, 422);
    assert.deepEqual(body, { ok: false, error: 'invalid', fields: ['email'] });
    assert.equal(sent.length, 0);
  });

  test('honeypot hits and invalid requests cost no quota', async () => {
    let counted = 0;
    deps.consumeQuota = async () => (counted++, { allowed: true });
    await call(post({ ...submission, _gotcha: 'x' }));
    await call(post({ ...submission, name: '' }));
    assert.equal(counted, 0);
  });

  test('passes the sender IP to the rate limiter', async () => {
    let seen;
    deps.consumeQuota = async (ip) => ((seen = ip), { allowed: true });
    await call(post(submission, { 'CF-Connecting-IP': '203.0.113.7' }));
    assert.equal(seen, '203.0.113.7');
  });

  test('refuses when the rate limit is reached', async () => {
    deps.consumeQuota = async () => ({ allowed: false, reason: 'daily_limit' });
    const { response, body } = await call(post(submission));
    assert.equal(response.status, 429);
    assert.equal(body.error, 'rate_limited');
    assert.equal(sent.length, 0);
  });

  test('fails closed when the rate limiter is unavailable', async () => {
    deps.consumeQuota = async () => {
      throw new Error('Durable Object reset');
    };
    const { response } = await call(post(submission));
    assert.equal(response.status, 503);
    assert.equal(sent.length, 0);
  });

  test('reports a failed SMTP delivery', async () => {
    deps.sendMail = async () => {
      throw new Error('535 Authentication credentials invalid');
    };
    const { response, body } = await call(post(submission));
    assert.equal(response.status, 502);
    assert.equal(body.error, 'send_failed');
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  });

  test('rejects broken JSON', async () => {
    const { response, body } = await call(post('{"name":'));
    assert.equal(response.status, 400);
    assert.equal(body.error, 'invalid_json');
  });

  test('rejects other content types', async () => {
    const { response } = await call(post('name=Max', { 'Content-Type': 'text/plain' }));
    assert.equal(response.status, 415);
  });

  test('rejects oversized bodies', async () => {
    const { response } = await call(post({ ...submission, nachricht: 'x'.repeat(20_000) }));
    assert.equal(response.status, 413);
    assert.equal(sent.length, 0);
  });
});

describe('origin and methods', () => {
  test('rejects requests from other websites', async () => {
    const { response, body } = await call(post(submission, { Origin: 'https://evil.example' }));
    assert.equal(response.status, 403);
    assert.equal(body.error, 'forbidden_origin');
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
    assert.equal(sent.length, 0);
  });

  test('rejects requests without an origin, e.g. from scripts', async () => {
    const request = new Request('https://worker.example/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission),
    });
    assert.equal((await call(request)).response.status, 403);
  });

  test('answers the CORS preflight of an allowed origin', async () => {
    const request = new Request('https://worker.example/', {
      method: 'OPTIONS',
      headers: { Origin: 'https://mischa1337.github.io' },
    });
    const { response } = await call(request);
    assert.equal(response.status, 204);
    assert.equal(
      response.headers.get('Access-Control-Allow-Origin'),
      'https://mischa1337.github.io',
    );
    assert.equal(response.headers.get('Access-Control-Allow-Headers'), 'Content-Type');
    assert.equal(response.headers.get('Vary'), 'Origin');
  });

  test('only POST submits the form', async () => {
    const request = new Request('https://worker.example/', { headers: { Origin: ORIGIN } });
    const { response } = await call(request);
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('Allow'), 'POST, OPTIONS');
  });

  test('unknown paths are not found', async () => {
    const { response } = await call(new Request('https://worker.example/admin'));
    assert.equal(response.status, 404);
  });

  test('responses are never cached', async () => {
    const { response } = await call(post(submission));
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  });
});

describe('health check', () => {
  const health = (token) =>
    new Request('https://worker.example/health', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

  test('needs the token', async () => {
    assert.equal((await call(health())).response.status, 401);
    assert.equal((await call(health('wrong-token'))).response.status, 401);
    assert.equal((await call(health('secret-token-but-longer'))).response.status, 401);
  });

  test('is closed while no token is configured', async () => {
    const response = await handleRequest(health('anything'), { ...env, HEALTH_TOKEN: '' }, deps);
    assert.equal(response.status, 401);
  });

  test('reports a working SMTP login', async () => {
    const { response, body } = await call(health('secret-token'));
    assert.equal(response.status, 200);
    assert.deepEqual(body, { ok: true });
  });

  test('reports a failing SMTP login', async () => {
    deps.checkMail = async () => {
      throw new Error('Socket timeout!');
    };
    const { response, body } = await call(health('secret-token'));
    assert.equal(response.status, 503);
    assert.equal(body.error, 'smtp_unavailable');
  });

  test('never sends a message', async () => {
    await call(health('secret-token'));
    assert.equal(sent.length, 0);
  });
});
