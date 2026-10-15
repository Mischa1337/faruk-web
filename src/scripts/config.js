/**
 * Site-wide settings for the scripts.
 *
 * formEndpoint: URL of the free form service Formspree,
 *   e.g. https://formspree.io/f/xxxxxxxx (50 messages/month for free).
 *   As long as it is empty, submitting the form opens the visitor's mail
 *   app with a pre-filled message – so the page works from day one.
 *   When setting it, the privacy policy has to be updated as well.
 */
export const CONFIG = {
  formEndpoint: '',
  fallbackMail: 'kontakt@afp-coaching.de',
};
