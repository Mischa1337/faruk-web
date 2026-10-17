# Contact worker

A [Cloudflare Worker](https://developers.cloudflare.com/workers/) that
receives the contact form of afp-coaching.de and sends it as an e-mail to
`kontakt@afp-coaching.de`, by SMTP through the site's own IONOS mailbox.

The website itself stays a static site on GitHub Pages. The worker is the
only piece of server code: it keeps the mailbox password out of the browser
and checks every submission before it becomes an e-mail. It runs on the
Workers Free plan – no payment method on file, so it cannot cost money; if
a limit were ever exceeded, requests would fail rather than be billed.

```
Browser ──POST JSON──▶ worker ──SMTP (TLS)──▶ smtp.ionos.de ──▶ kontakt@afp-coaching.de
           (CORS)        │
                         └─▶ Durable Object "RateLimiter" (counters only)
```

## What it checks

Every request runs through these steps, in this order
([`src/handler.js`](src/handler.js)):

| Step            | Rule                                                          | Response              |
| --------------- | ------------------------------------------------------------- | --------------------- |
| Origin          | `Origin` header must be in `ALLOWED_ORIGINS`                  | 403                   |
| Method and type | `POST` with `application/json`, at most 10 KB                 | 405 / 415 / 413       |
| Honeypot        | hidden field `_gotcha` filled in → pretend success, send none | 200                   |
| Fields          | browser rules, maximum lengths, no line breaks in headers     | 422 + invalid fields  |
| Rate limit      | 5 per sender per hour, `DAILY_LIMIT` per day in total         | 429                   |
| Sending         | SMTP login and delivery to the fixed address `MAIL_TO`        | 200, or 502 on errors |

- **Not an open relay.** The recipient comes from the configuration, never
  from the request; extra fields in the body are ignored.
- **One set of rules.** Patterns, minimum and maximum lengths, subject and
  mail body are imported from the browser module
  [`validation.js`](../src/scripts/modules/contact-form/validation.js), so
  browser and server can't drift apart. A test checks that the inputs'
  `maxlength` attributes match as well.
- **Global limit.** Bots can fake the `Origin` header and switch IP
  addresses, so the daily limit is the real safeguard: whatever happens,
  Faruk's inbox and the IONOS account receive at most `DAILY_LIMIT` mails
  a day. Honeypot hits and invalid requests don't count towards it.
- **Privacy.** IP addresses are only stored as salted hashes, the salt
  changes daily, and an alarm deletes the hashes one hour after the last
  request ([`src/rate-limiter.js`](src/rate-limiter.js)). Logs contain the
  outcome of each request, never form content or IP addresses.
- **Nothing gets lost.** If sending fails, the form offers to open the
  visitor's mail app with the message already written.

## Code layout

| File                                         | Purpose                                                           |
| -------------------------------------------- | ----------------------------------------------------------------- |
| [`src/index.js`](src/index.js)               | entry point: wires the runtime parts into the handler             |
| [`src/handler.js`](src/handler.js)           | routing, CORS, checks, responses – no Cloudflare APIs             |
| [`src/validation.js`](src/validation.js)     | server-side field rules                                           |
| [`src/message.js`](src/message.js)           | builds the e-mail (sender, reply-to, subject, text)               |
| [`src/quota.js`](src/quota.js)               | counting logic of the rate limiter – no Cloudflare APIs           |
| [`src/rate-limiter.js`](src/rate-limiter.js) | Durable Object that stores the counters                           |
| [`src/mailer.js`](src/mailer.js)             | SMTP via [worker-mailer](https://github.com/zou-yu/worker-mailer) |
| [`wrangler.jsonc`](wrangler.jsonc)           | name, variables, Durable Object binding                           |

Only `index.js`, `mailer.js` and `rate-limiter.js` depend on the Workers
runtime. Everything else is plain JavaScript and tested with `node:test`
([`test/`](test/)); sending, health check and rate limiting are passed into
the handler as functions and replaced by fakes in the tests. Switching to a
different way of sending only means replacing `mailer.js`.

## Endpoints

| Request       | Purpose                                                                                            |
| ------------- | -------------------------------------------------------------------------------------------------- |
| `POST /`      | form submission, JSON with `name`, `email`, `telefon`, `quelle`, `nachricht`, `_gotcha`            |
| `OPTIONS /`   | CORS preflight                                                                                     |
| `GET /health` | logs in to the mail server and quits without sending; needs `Authorization: Bearer <HEALTH_TOKEN>` |

Every response is JSON: `{ "ok": true }` or `{ "ok": false, "error": "<code>" }`.

## Configuration

Variables are in [`wrangler.jsonc`](wrangler.jsonc): allowed origins,
recipient, sender mailbox (also the SMTP user name), SMTP host and port
(465 = TLS, 587 = STARTTLS) and the daily limit.

Secrets are set once per worker and are never stored in the repository or
in GitHub:

```bash
npx wrangler secret put SMTP_PASSWORD   # password of the sender mailbox
npx wrangler secret put HEALTH_TOKEN    # random string, e.g. from: openssl rand -hex 32
```

## Setting it up (once)

1. **Sender mailbox.** Create `formular@afp-coaching.de` in IONOS (one of the
   two Mail Basic mailboxes in the contract) with a long, unique password.
2. **Cloudflare.** Create a free account (no payment method needed), then:
   ```bash
   cd worker
   npm install
   npx wrangler login
   npx wrangler deploy
   ```
   The first deploy prints the worker's URL,
   `https://afp-contact.<account>.workers.dev`.
3. **Secrets.** Set `SMTP_PASSWORD` and `HEALTH_TOKEN` as shown above.
4. **Smoke test.** The health check proves that IONOS accepts the login
   from Cloudflare:
   ```bash
   curl -H "Authorization: Bearer <HEALTH_TOKEN>" https://afp-contact.<account>.workers.dev/health
   ```
5. **Website.** Put the URL into `contact.formEndpoint` in
   [`src/_data/site.json`](../src/_data/site.json). The form then sends
   through the worker, and the privacy policy switches to the matching text.
6. **GitHub** (Settings → Secrets and variables → Actions):
   - variables `CLOUDFLARE_ACCOUNT_ID` and `CONTACT_WORKER_URL`
   - secrets `CLOUDFLARE_API_TOKEN` ("Edit Cloudflare Workers" template)
     and `CONTACT_HEALTH_TOKEN` (same value as `HEALTH_TOKEN`)

   From then on every merge to `main` that touches the worker deploys it
   ([`worker.yml`](../.github/workflows/worker.yml)), and a daily job checks
   the SMTP login ([`contact-health.yml`](../.github/workflows/contact-health.yml)).

## Local development

```bash
cd worker
npm install
npm test          # unit tests (also part of npm run check in the root)
npm run build     # bundles into dist/ without deploying
npm run dev       # local worker on http://localhost:8787
```

`npm run dev` reads secrets and overrides from `worker/.dev.vars`
(git-ignored), for example:

```
SMTP_PASSWORD=…
HEALTH_TOKEN=local-token
ALLOWED_ORIGINS=http://localhost:4321
```
