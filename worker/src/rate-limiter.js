/**
 * Durable Object holding the rate limiter's state. There is a single
 * instance ("global"), so the counters are exact worldwide – unlike
 * Cloudflare's rate limiting binding, which counts per data centre.
 * Calls to one instance run one after another, so no two requests can
 * read the same count.
 */
import { DurableObject } from 'cloudflare:workers';
import { IP_WINDOW_MS, createState, hashIp, pruneHits, takeQuota, utcDay } from './quota.js';

export class RateLimiter extends DurableObject {
  /**
   * @param {string} ip address of the sender, hashed before it is used
   * @param {number} dailyLimit
   */
  async consume(ip, dailyLimit) {
    const now = Date.now();
    let state = await this.ctx.storage.get('state');
    if (state?.day !== utcDay(now)) state = createState(now);

    const key = await hashIp(ip, state.salt);
    const result = takeQuota(state, key, now, { dailyLimit });
    await this.ctx.storage.put('state', state);

    // Hashed addresses must not outlive the window, even if nobody sends
    // anything afterwards: the alarm removes them one window after the last hit.
    await this.ctx.storage.setAlarm(now + IP_WINDOW_MS);
    return result;
  }

  async alarm() {
    const now = Date.now();
    const state = await this.ctx.storage.get('state');
    if (!state) return;

    if (state.day !== utcDay(now)) {
      await this.ctx.storage.deleteAll();
      return;
    }
    pruneHits(state, now);
    await this.ctx.storage.put('state', state);
  }
}
