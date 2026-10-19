import { $, supportsIntersectionObserver } from '../lib/dom.js';

/** How long an unfolded button waits for the second tap. */
const ARMED_MS = 4000;

/** iPhones and iPads (iPadOS reports itself as a Mac with a touch screen). */
const isIOS = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);

/**
 * Round contact buttons on phones: opened with two taps instead of one, and
 * shown only while neither the hero nor the contact section is in view.
 */
export function initMobileCta() {
  const bar = $('#mobileCta');
  if (!bar) return;
  const disarm = initTwoStepTap(bar);
  initVisibility(bar, disarm);
}

/**
 * The first tap unfolds the label, the second follows the link – a thumb
 * brushing past while scrolling opens nothing. Skipped for the keyboard
 * (a click without pointer has detail 0) and for the phone button on iOS,
 * which asks before every call anyway. Returns a function that folds the
 * unfolded button back.
 */
function initTwoStepTap(bar) {
  const ios = isIOS();
  let armed = null;
  let timer;

  const disarm = () => {
    armed?.classList.remove('is-armed');
    armed = null;
    clearTimeout(timer);
  };

  bar.addEventListener('click', (event) => {
    const link = event.target.closest('.mcta');
    if (!link) return;
    const direct = event.detail === 0 || (ios && link.classList.contains('mcta-tel'));
    if (link === armed || direct) {
      disarm();
      return;
    }
    event.preventDefault();
    disarm();
    armed = link;
    link.classList.add('is-armed');
    timer = setTimeout(disarm, ARMED_MS);
  });

  document.addEventListener('click', (event) => {
    if (armed && !bar.contains(event.target)) disarm();
  });

  return disarm;
}

/** Hero and contact section already offer WhatsApp and phone as large buttons. */
function initVisibility(bar, onHide) {
  const sections = [$('#top'), $('#kontakt')].filter(Boolean);
  if (!sections.length || !supportsIntersectionObserver()) {
    bar.classList.add('is-visible');
    return;
  }

  const inView = new Set();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) inView.add(entry.target);
        else inView.delete(entry.target);
      }
      const visible = inView.size === 0;
      bar.classList.toggle('is-visible', visible);
      if (!visible) onHide();
    },
    { threshold: 0.12 },
  );
  sections.forEach((section) => observer.observe(section));
}
