import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  IP_LIMIT,
  IP_WINDOW_MS,
  createState,
  hashIp,
  pruneHits,
  takeQuota,
  utcDay,
} from '../src/quota.js';

const NOW = Date.UTC(2026, 9, 17, 12, 0, 0);

test('allows a sender up to the hourly limit', () => {
  const state = createState(NOW);
  for (let i = 0; i < IP_LIMIT; i++) {
    assert.deepEqual(takeQuota(state, 'a', NOW + i, { dailyLimit: 30 }), { allowed: true });
  }
  assert.deepEqual(takeQuota(state, 'a', NOW + IP_LIMIT, { dailyLimit: 30 }), {
    allowed: false,
    reason: 'ip_limit',
  });
  assert.deepEqual(takeQuota(state, 'b', NOW, { dailyLimit: 30 }), { allowed: true });
});

test('a sender may send again once the window has passed', () => {
  const state = createState(NOW);
  for (let i = 0; i < IP_LIMIT; i++) takeQuota(state, 'a', NOW, { dailyLimit: 30 });
  assert.equal(takeQuota(state, 'a', NOW + IP_WINDOW_MS, { dailyLimit: 30 }).allowed, true);
});

test('the daily limit applies across all senders', () => {
  const state = createState(NOW);
  for (let i = 0; i < 3; i++) takeQuota(state, `sender-${i}`, NOW, { dailyLimit: 3 });
  assert.deepEqual(takeQuota(state, 'new', NOW, { dailyLimit: 3 }), {
    allowed: false,
    reason: 'daily_limit',
  });
});

test('blocked attempts are not counted', () => {
  const state = createState(NOW);
  takeQuota(state, 'a', NOW, { dailyLimit: 1 });
  takeQuota(state, 'b', NOW, { dailyLimit: 1 });
  assert.equal(state.count, 1);
  assert.equal(state.hits.b, undefined);
});

test('old hits are pruned so the state stays small', () => {
  const state = createState(NOW);
  takeQuota(state, 'a', NOW, { dailyLimit: 30 });
  takeQuota(state, 'b', NOW + IP_WINDOW_MS, { dailyLimit: 30 });
  assert.deepEqual(Object.keys(state.hits), ['b']);
});

test('a new state starts at zero with a fresh salt', () => {
  const first = createState(NOW);
  const second = createState(NOW);
  assert.equal(first.day, '2026-10-17');
  assert.equal(first.count, 0);
  assert.match(first.salt, /^[0-9a-f]{32}$/);
  assert.notEqual(first.salt, second.salt);
});

test('utcDay switches at midnight UTC', () => {
  assert.equal(utcDay(Date.UTC(2026, 9, 17, 23, 59)), '2026-10-17');
  assert.equal(utcDay(Date.UTC(2026, 9, 18, 0, 0)), '2026-10-18');
});

test('IP hashes are stable per salt and differ between salts', async () => {
  const hash = await hashIp('203.0.113.7', 'salt-1');
  assert.match(hash, /^[0-9a-f]{16}$/);
  assert.equal(await hashIp('203.0.113.7', 'salt-1'), hash);
  assert.notEqual(await hashIp('203.0.113.7', 'salt-2'), hash);
  assert.ok(!hash.includes('203'));
});

test('pruneHits drops senders whose hits are all outside the window', () => {
  const state = createState(NOW);
  takeQuota(state, 'a', NOW, { dailyLimit: 30 });
  pruneHits(state, NOW + IP_WINDOW_MS);
  assert.deepEqual(state.hits, {});
  assert.equal(state.count, 1, 'the daily count is kept');
});
