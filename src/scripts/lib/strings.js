/**
 * Texts that the scripts write into the page, in every language of the
 * site (config/i18n.js). The page's own texts live in src/_data/; these are
 * only the messages that appear in response to an action.
 *
 * Pure data without DOM access, so it can be checked in tests
 * (test/validation.test.js). lib/i18n.js picks the page's language.
 */
import { MIN_LENGTH } from '../modules/contact-form/validation.js';

export const STRINGS = {
  de: {
    menuOpen: 'Menü öffnen',
    menuClose: 'Menü schließen',
    emailCopied: '✓ Adresse kopiert',
    form: {
      tooFast: 'Fast geschafft – bitte klicke noch einmal auf „Jetzt unverbindlich anfragen".',
      alreadySent: 'Deine Anfrage ist bereits unterwegs. Einen Moment bitte.',
      checkFields: 'Bitte prüfe die markierten Felder.',
      mailAppOpens:
        'Dein E-Mail-Programm öffnet sich mit der fertigen Nachricht – bitte nur noch abschicken.',
      sending: 'Wird gesendet …',
      failed:
        'Das Senden hat leider nicht geklappt. Du kannst deine Nachricht mit deinem E-Mail-Programm senden oder mir per WhatsApp schreiben.',
    },
    // Keyed by the input's id, like the rules in contact-form/validation.js
    errors: {
      'f-name': 'Bitte gib deinen Namen an.',
      'f-mail': 'Bitte gib eine gültige E-Mail-Adresse an.',
      'f-source': 'Bitte sag mir kurz, wie du auf mich aufmerksam geworden bist.',
      'f-msg': `Bitte beschreibe kurz dein Anliegen (mind. ${MIN_LENGTH.nachricht} Zeichen).`,
      'f-consent': 'Bitte stimme der Datenschutzerklärung zu.',
    },
  },
  en: {
    menuOpen: 'Open menu',
    menuClose: 'Close menu',
    emailCopied: '✓ Address copied',
    form: {
      tooFast: 'Almost there – please click “Send enquiry – no obligation” once more.',
      alreadySent: 'Your enquiry is already on its way. Just a moment, please.',
      checkFields: 'Please check the highlighted fields.',
      mailAppOpens: 'Your email program opens with the message ready – just hit send.',
      sending: 'Sending …',
      failed:
        'Unfortunately, sending didn’t work. You can send your message with your email program or write to me on WhatsApp.',
    },
    errors: {
      'f-name': 'Please enter your name.',
      'f-mail': 'Please enter a valid email address.',
      'f-source': 'Please tell me briefly how you heard about me.',
      'f-msg': `Please briefly describe what you’re looking for (at least ${MIN_LENGTH.nachricht} characters).`,
      'f-consent': 'Please agree to the privacy policy.',
    },
  },
};
