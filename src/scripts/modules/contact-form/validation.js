/**
 * Validation rules of the contact form.
 *
 * Pure functions without DOM access, so they can be unit-tested
 * (see test/validation.test.js). Messages are shown to visitors and
 * therefore German.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** One rule per required field, keyed by the input's id. */
export const RULES = [
  {
    id: 'f-name',
    isValid: (value) => value.trim().length >= 2,
    message: 'Bitte gib deinen Namen an.',
  },
  {
    id: 'f-mail',
    isValid: (value) => EMAIL_PATTERN.test(value.trim()),
    message: 'Bitte gib eine gültige E-Mail-Adresse an.',
  },
  {
    id: 'f-source',
    isValid: (value) => value.trim().length >= 2,
    message: 'Bitte sag mir kurz, wie du auf mich aufmerksam geworden bist.',
  },
  {
    id: 'f-msg',
    isValid: (value) => value.trim().length >= 10,
    message: 'Bitte beschreibe kurz dein Anliegen (mind. 10 Zeichen).',
  },
  {
    id: 'f-consent',
    isValid: (checked) => checked === true,
    message: 'Bitte stimme der Datenschutzerklärung zu.',
  },
];

/** Returns the value a rule checks: `checked` for checkboxes, the text otherwise. */
export const fieldValue = (input) => (input.type === 'checkbox' ? input.checked : input.value);

/**
 * Builds the plain-text body of the fallback e-mail.
 * @param {{name: string, email: string, telefon?: string, quelle: string, nachricht: string}} data
 */
export function buildMailBody(data) {
  return [
    `Name: ${data.name}`,
    `E-Mail: ${data.email}`,
    `Telefon: ${data.telefon || '–'}`,
    `Aufmerksam geworden durch: ${data.quelle}`,
    '',
    data.nachricht,
  ].join('\n');
}
