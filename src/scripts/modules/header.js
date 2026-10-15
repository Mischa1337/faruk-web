import { $ } from '../lib/dom.js';

const STUCK_AFTER_PX = 12;

/** Fades in the header background as soon as the page is scrolled. */
export function initHeader() {
  const header = $('#siteHeader');
  if (!header) return;

  const update = () => header.classList.toggle('is-stuck', window.scrollY > STUCK_AFTER_PX);
  update();
  window.addEventListener('scroll', update, { passive: true });
}
