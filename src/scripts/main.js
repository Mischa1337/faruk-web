/**
 * AFP-Coaching · Script entry point
 *
 * Vanilla JavaScript, no libraries, no third-party requests. esbuild
 * bundles this file and its imports into a single js/main.js.
 *
 * Every module checks on its own whether its elements exist on the
 * current page, so all pages (home, imprint, privacy, 404) share this
 * one bundle.
 */
import { initFooterYear } from './modules/footer-year.js';
import { initHeader } from './modules/header.js';
import { initThemeToggle } from './modules/theme-toggle.js';
import { initNavigation } from './modules/navigation.js';
import { initScrollSpy } from './modules/scroll-spy.js';
import { initReveal } from './modules/reveal.js';
import { initMobileCta } from './modules/mobile-cta.js';
import { initReviewToggles } from './modules/review-toggles.js';
import { initInterestLinks } from './modules/interest-links.js';
import { initContactForm } from './modules/contact-form/index.js';

// Tells the safety net in <head> that the script has arrived, so the
// reveal animation may stay active (see partials/head-scripts.njk).
window.__siteReady = true;

initFooterYear();
initHeader();
initThemeToggle();
initNavigation();
initScrollSpy();
initReveal();
initMobileCta();
initReviewToggles();
initContactForm();
initInterestLinks();
