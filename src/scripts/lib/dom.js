/** Small DOM and environment helpers shared by all modules. */

/** First element matching `selector` within `context`, or null. */
export const $ = (selector, context = document) => context.querySelector(selector);

/** All elements matching `selector` within `context`, as a real array. */
export const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const supportsIntersectionObserver = () => 'IntersectionObserver' in window;

/** Scroll behaviour that respects the visitor's motion preference. */
export const scrollBehavior = () => (prefersReducedMotion() ? 'auto' : 'smooth');
