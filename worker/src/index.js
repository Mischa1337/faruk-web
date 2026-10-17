/**
 * Contact form worker for afp-coaching.de.
 *
 * Entry point only: connects the platform-independent request handling
 * (handler.js) with the parts that need the Workers runtime – the SMTP
 * socket (mailer.js) and the Durable Object for rate limiting.
 */
import { handleRequest } from './handler.js';
import { checkSmtp, sendMail } from './mailer.js';

export { RateLimiter } from './rate-limiter.js';

export default {
  fetch(request, env) {
    const limiter = env.RATE_LIMITER.get(env.RATE_LIMITER.idFromName('global'));

    return handleRequest(request, env, {
      sendMail: (message) => sendMail(env, message),
      checkMail: () => checkSmtp(env),
      consumeQuota: (ip) => limiter.consume(ip, Number(env.DAILY_LIMIT)),
    });
  },
};
