import { $$, prefersReducedMotion, supportsIntersectionObserver } from '../lib/dom.js';

const STAGGER_MS = 70;
const MAX_DELAY_MS = 280;

/** Gently fades in `.reveal` elements as they scroll into view. */
export function initReveal() {
  const elements = $$('.reveal');

  if (prefersReducedMotion() || !supportsIntersectionObserver()) {
    for (const el of elements) el.classList.add('is-visible');
    return;
  }

  const revealer = new IntersectionObserver(
    (entries, observer) => {
      entries
        .filter((entry) => entry.isIntersecting)
        .forEach((entry, i) => {
          // Small offset so that cards appearing together show up one after another
          entry.target.style.animationDelay = `${Math.min(i * STAGGER_MS, MAX_DELAY_MS)}ms`;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );

  for (const el of elements) revealer.observe(el);
}
