/**
 * Validation rules of the contact form.
 *
 * Pure functions without DOM access, so they can be unit-tested
 * (see test/validation.test.js). The error messages shown to visitors
 * live in lib/strings.js, in every language, keyed by the rule's id.
 *
 * The contact worker (worker/src/) imports the patterns, limits and mail
 * builders from here, so browser and server check the same rules and the
 * e-mail looks the same whichever way it is sent.
 */

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Minimum lengths of the required text fields, after trimming. */
export const MIN_LENGTH = { name: 2, quelle: 2, nachricht: 10 };

/** Maximum lengths; the visible inputs carry the same values as `maxlength`. */
export const MAX_LENGTH = {
  name: 100,
  email: 254,
  telefon: 40,
  quelle: 200,
  nachricht: 5000,
  interesse: 60,
  sprache: 2,
};

/** Language code of the page the enquiry was sent from (<html lang>). */
export const LANGUAGE_PATTERN = /^[a-z]{2}$/;

/** One rule per required field, keyed by the input's id. */
export const RULES = [
  { id: 'f-name', isValid: (value) => value.trim().length >= MIN_LENGTH.name },
  { id: 'f-mail', isValid: (value) => EMAIL_PATTERN.test(value.trim()) },
  { id: 'f-source', isValid: (value) => value.trim().length >= MIN_LENGTH.quelle },
  { id: 'f-msg', isValid: (value) => value.trim().length >= MIN_LENGTH.nachricht },
  { id: 'f-consent', isValid: (checked) => checked === true },
];

/**
 * Line for enquiries from a page in another language than German, so
 * Faruk knows which language to answer in. The mail itself stays German.
 */
const LANGUAGE_NOTES = {
  en: 'Sprache: Englisch (Anfrage über die englische Seite)',
};

/** Returns the value a rule checks: `checked` for checkboxes, the text otherwise. */
export const fieldValue = (input) => (input.type === 'checkbox' ? input.checked : input.value);

/**
 * Subject line of the enquiry e-mail: names the chosen offer, if any, so
 * Faruk sees what it is about right in his inbox.
 */
export const buildMailSubject = (name, interest = '') =>
  `Anfrage ${interest || 'Personal Training'} – ${name}`;

/**
 * Builds the plain-text body of the enquiry e-mail.
 * @param {{name: string, email: string, telefon?: string, quelle: string, nachricht: string, interesse?: string, sprache?: string}} data
 */
export function buildMailBody(data) {
  return [
    ...(LANGUAGE_NOTES[data.sprache] ? [LANGUAGE_NOTES[data.sprache]] : []),
    ...(data.interesse ? [`Interesse: ${data.interesse}`] : []),
    `Name: ${data.name}`,
    `E-Mail: ${data.email}`,
    `Telefon: ${data.telefon || '–'}`,
    `Aufmerksam geworden durch: ${data.quelle}`,
    '',
    data.nachricht,
  ].join('\n');
}
