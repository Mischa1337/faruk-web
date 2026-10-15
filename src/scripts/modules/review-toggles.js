import { $, $$ } from '../lib/dom.js';

const MOBILE_QUERY = '(max-width: 600px)';

/**
 * Shortens long reviews on phones.
 *
 * On phones the reviews are stacked. Every review longer than
 * --review-lines (sections/reviews.css) only shows its first lines plus a
 * "Weiterlesen" button; shorter ones stay without a button. On desktop
 * everything stays expanded, and without JavaScript nothing is shortened.
 */
export function initReviewToggles() {
  const reviews = $$('.quote');
  if (!reviews.length) return;

  const mobile = window.matchMedia(MOBILE_QUERY);

  reviews.forEach((review, i) => {
    const text = $('blockquote p', review);
    text.id ||= `quote-text-${i + 1}`;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quote-toggle';
    button.textContent = 'Weiterlesen';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', text.id);
    button.addEventListener('click', () => {
      const open = review.classList.toggle('is-open');
      button.setAttribute('aria-expanded', String(open));
      button.textContent = open ? 'Weniger anzeigen' : 'Weiterlesen';
    });

    $('blockquote', review).after(button);
  });

  const update = () => {
    for (const review of reviews) {
      const text = $('blockquote p', review);
      review.classList.remove('is-collapsible'); // measure at full length
      const maxLines = Number(getComputedStyle(review).getPropertyValue('--review-lines')) || 4;
      review.classList.toggle('is-collapsible', mobile.matches && countLines(text) > maxLines);
    }
  };

  update();
  mobile.addEventListener('change', update);
}

function countLines(element) {
  const style = getComputedStyle(element);
  let lineHeight = parseFloat(style.lineHeight);
  // Some browsers report the line height as a factor instead of pixels
  if (!lineHeight || lineHeight < 4) lineHeight = (lineHeight || 1.6) * parseFloat(style.fontSize);
  return element.scrollHeight / lineHeight;
}
