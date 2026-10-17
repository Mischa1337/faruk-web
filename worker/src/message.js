/**
 * Turns a validated submission into the e-mail Faruk receives.
 * Subject and body come from the browser module, so the mail looks the same
 * as the one the mailto fallback prepares.
 */
import {
  buildMailBody,
  buildMailSubject,
} from '../../src/scripts/modules/contact-form/validation.js';

const SENDER_NAME = 'AFP-Coaching Website';

/**
 * @param {Record<string, string>} data validated form fields
 * @param {{ MAIL_FROM: string, MAIL_TO: string }} env
 */
export function buildMessage(data, env) {
  return {
    from: { name: SENDER_NAME, email: env.MAIL_FROM },
    to: env.MAIL_TO,
    // "Reply" in the mail app answers the visitor, not the sender mailbox
    reply: { name: data.name, email: data.email },
    subject: buildMailSubject(data.name, data.interesse),
    text: [
      buildMailBody(data),
      '',
      '-- ',
      'Gesendet über das Kontaktformular auf afp-coaching.de.',
      `Mit „Antworten“ schreibst du direkt an ${data.email}.`,
    ].join('\n'),
  };
}
