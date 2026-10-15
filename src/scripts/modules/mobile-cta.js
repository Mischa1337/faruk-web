import { $, supportsIntersectionObserver } from '../lib/dom.js';

/** Hides the fixed contact bar on phones while the contact section is in view. */
export function initMobileCta() {
  const bar = $('#mobileCta');
  const contact = $('#kontakt');
  if (!bar || !contact || !supportsIntersectionObserver()) return;

  new IntersectionObserver(([entry]) => bar.classList.toggle('is-hidden', entry.isIntersecting), {
    threshold: 0.12,
  }).observe(contact);
}
