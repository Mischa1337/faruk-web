import { $$ } from '../lib/dom.js';
import { t } from '../lib/i18n.js';

const STORAGE_KEY = 'theme';
const LABELS = {
  dark: t.themeToLight,
  light: t.themeToDark,
};

/**
 * Light/dark toggle – PREVIEW ONLY, removed before launch.
 *
 * Without a choice the site follows the system setting (pure CSS). The
 * button overrides it by setting data-theme on <html>; the choice is stored
 * locally (localStorage – no cookie, never leaves the device) and applied
 * before the first paint by an inline script in <head>.
 */
export function initThemeToggle() {
  const buttons = $$('.theme-toggle');
  if (!buttons.length) return;

  const root = document.documentElement;
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  const themeColors = $$('meta[name="theme-color"]');
  const current = () => root.dataset.theme || (systemDark.matches ? 'dark' : 'light');

  const updateLabels = () => {
    for (const button of buttons) {
      button.setAttribute('aria-label', LABELS[current()]);
      button.title = LABELS[current()];
    }
  };

  const apply = (theme) => {
    root.dataset.theme = theme;

    // Browser UI colour follows the page background defined in the CSS tokens
    const background = getComputedStyle(root).getPropertyValue('--bg').trim();
    for (const meta of themeColors) meta.setAttribute('content', background);

    updateLabels();
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Storage unavailable (e.g. private mode): the choice simply isn't remembered
    }
  };

  updateLabels();
  systemDark.addEventListener('change', updateLabels);

  for (const button of buttons) {
    button.hidden = false;
    button.addEventListener('click', () => apply(current() === 'light' ? 'dark' : 'light'));
  }
}
