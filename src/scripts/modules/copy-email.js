import { $ } from '../lib/dom.js';

/* On a desktop many people write e-mails in the browser (Gmail, Web.de …).
   There a mailto link only triggers a browser prompt and then opens a mail
   app that was never set up. So with a mouse, a click copies the address;
   phones keep the mailto link, as they almost always have a mail app.
   contact.css picks the matching hint with the same media query. */
const DESKTOP = '(hover: hover) and (pointer: fine)';

/* How long "copied" stays visible before the hint returns */
const RESET_MS = 2000;

/** E-mail card in the contact section: copy on click with a mouse. */
export function initCopyEmail() {
  const link = $('.contact-email');
  const hint = link && $('.hint-copy', link);
  if (!hint) return;

  const label = hint.textContent;
  let timer;

  link.addEventListener('click', async (event) => {
    if (!window.matchMedia(DESKTOP).matches || !navigator.clipboard) return;
    event.preventDefault();

    try {
      await navigator.clipboard.writeText(link.dataset.copy);
    } catch {
      // Copying was refused (permissions, old browser): open the mail app after all
      window.location.href = link.href;
      return;
    }

    link.classList.add('is-copied');
    hint.textContent = '✓ Adresse kopiert';
    clearTimeout(timer);
    timer = setTimeout(() => {
      link.classList.remove('is-copied');
      hint.textContent = label;
    }, RESET_MS);
  });
}
