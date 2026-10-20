/**
 * Server-side check of a form submission. The browser validates the same
 * rules, but anyone can post to the worker directly, so nothing the client
 * sends is trusted.
 */
import {
  EMAIL_PATTERN,
  LANGUAGE_PATTERN,
  MAX_LENGTH,
  MIN_LENGTH,
} from '../../src/scripts/modules/contact-form/validation.js';

/**
 * Accepted fields. Everything else in the request body is ignored.
 * `singleLine` fields end up in mail headers (Reply-To, Subject), so line
 * breaks there are rejected to rule out header injection.
 */
const FIELDS = {
  name: { required: true, min: MIN_LENGTH.name, singleLine: true },
  email: { required: true, pattern: EMAIL_PATTERN, singleLine: true },
  telefon: { required: false, singleLine: true },
  quelle: { required: true, min: MIN_LENGTH.quelle, singleLine: true },
  nachricht: { required: true, min: MIN_LENGTH.nachricht },
  // Offer chosen via a price or offer button; also part of the subject
  interesse: { required: false, singleLine: true },
  // Language of the page the form was sent from; noted in the mail
  sprache: { required: false, pattern: LANGUAGE_PATTERN, singleLine: true },
};

const LINE_BREAK = /[\r\n]/;

/** Control characters other than tab and line breaks have no place in a message. */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

/**
 * @param {unknown} body parsed JSON of the request
 * @returns {{ ok: true, data: Record<string, string> } | { ok: false, fields: string[] }}
 */
export function validateSubmission(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, fields: Object.keys(FIELDS) };
  }

  const data = {};
  const invalid = [];

  for (const [field, rule] of Object.entries(FIELDS)) {
    const raw = body[field] ?? '';
    const value = typeof raw === 'string' ? raw.trim() : null;

    const valid =
      value !== null &&
      (value === '' ? !rule.required : isValidValue(value, rule, MAX_LENGTH[field]));

    if (valid) data[field] = value;
    else invalid.push(field);
  }

  return invalid.length ? { ok: false, fields: invalid } : { ok: true, data };
}

function isValidValue(value, rule, max) {
  if (value.length < (rule.min ?? 0) || value.length > max) return false;
  if (rule.pattern && !rule.pattern.test(value)) return false;
  if (rule.singleLine && LINE_BREAK.test(value)) return false;
  return !CONTROL_CHARS.test(value);
}
