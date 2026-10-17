/**
 * SMTP access to the sender mailbox, via the worker-mailer library
 * (TCP sockets of the Workers runtime). This is the only module that knows
 * how mail leaves the worker – replacing it is all it takes to switch to a
 * different way of sending.
 */
import { LogLevel, WorkerMailer } from 'worker-mailer';

const TIMEOUT_MS = 10_000;

function options(env) {
  const port = Number(env.SMTP_PORT);
  return {
    host: env.SMTP_HOST,
    port,
    secure: port === 465,
    startTls: true,
    credentials: { username: env.MAIL_FROM, password: env.SMTP_PASSWORD },
    // worker-mailer only authenticates with methods listed here
    authType: ['plain', 'login'],
    // Also used as the response timeout by worker-mailer
    socketTimeoutMs: TIMEOUT_MS,
    logLevel: LogLevel.WARN,
  };
}

/** Sends one message; rejects if the server refuses it. */
export async function sendMail(env, message) {
  await WorkerMailer.send(options(env), message);
}

/**
 * Connects, logs in and quits without sending anything. Proves that the
 * server is reachable and the password still works.
 */
export async function checkSmtp(env) {
  const mailer = await WorkerMailer.connect(options(env));
  await mailer.close();
}
