import { $, $$ } from '../lib/dom.js';

/** Fold-out menu (☰): open/close, close on link click, outside click and Escape. */
export function initNavigation() {
  const toggle = $('#navToggle');
  const nav = $('#siteNav');
  if (!toggle || !nav) return;

  const isOpen = () => nav.classList.contains('is-open');

  const setOpen = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
  };

  toggle.addEventListener('click', () => setOpen(!isOpen()));

  for (const link of $$('a', nav)) {
    link.addEventListener('click', () => setOpen(false));
  }

  document.addEventListener('click', (event) => {
    if (isOpen() && !nav.contains(event.target) && !toggle.contains(event.target)) {
      setOpen(false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) {
      setOpen(false);
      toggle.focus();
    }
  });
}
