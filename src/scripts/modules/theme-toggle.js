import { $, $$ } from '../lib/dom.js';

const STORAGE_KEY = 'theme';
const LABELS = {
  dark: 'Helles Farbschema aktivieren',
  light: 'Dunkles Farbschema aktivieren',
};

/**
 * Light/dark colour scheme.
 *
 * The button in the header toggles data-theme on <html>. The choice is
 * stored locally (localStorage – no cookie, never leaves the device); an
 * inline script in <head> applies it before the first paint to avoid a
 * flash of the wrong scheme. Default without a stored choice: dark.
 */
export function initThemeToggle() {
  const buttons = $$('.theme-toggle');
  if (!buttons.length) return;

  const root = document.documentElement;
  const themeColor = $('meta[name="theme-color"]');
  const current = () => (root.dataset.theme === 'light' ? 'light' : 'dark');

  const apply = (theme, { save = false } = {}) => {
    root.dataset.theme = theme;

    // Browser UI colour follows the page background defined in the CSS tokens
    const background = getComputedStyle(root).getPropertyValue('--bg').trim();
    if (themeColor && background) themeColor.setAttribute('content', background);

    for (const button of buttons) {
      button.setAttribute('aria-label', LABELS[theme]);
      button.title = LABELS[theme];
    }

    if (save) {
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch {
        // Storage unavailable (e.g. private mode): the choice simply isn't remembered
      }
    }
  };

  apply(current());

  for (const button of buttons) {
    button.hidden = false;
    button.addEventListener('click', () => {
      apply(current() === 'light' ? 'dark' : 'light', { save: true });
    });
  }
}
