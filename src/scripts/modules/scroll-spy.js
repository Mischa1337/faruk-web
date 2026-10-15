import { $$, supportsIntersectionObserver } from '../lib/dom.js';

/** Highlights the menu item of the section currently in the middle of the viewport. */
export function initScrollSpy() {
  const links = $$('.site-nav a[href^="#"]:not(.btn)');
  const sections = links
    .map((link) => document.getElementById(link.getAttribute('href').slice(1)))
    .filter(Boolean);

  if (!supportsIntersectionObserver() || !sections.length) return;

  const spy = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        for (const link of links) {
          link.classList.toggle('is-active', link.getAttribute('href') === `#${entry.target.id}`);
        }
      }
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );

  for (const section of sections) spy.observe(section);
}
