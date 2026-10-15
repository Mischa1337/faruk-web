import { $ } from '../lib/dom.js';

/** Keeps the copyright year current even if the site is not rebuilt. */
export function initFooterYear() {
  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());
}
