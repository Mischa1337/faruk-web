import { $, scrollBehavior } from '../../lib/dom.js';
import { t } from '../../lib/i18n.js';
import { RULES, buildMailBody, buildMailSubject, fieldValue } from './validation.js';

/* Time trap: humans need at least a few seconds to fill in the form,
   bots submit almost instantly. Anything faster is not a person. */
const MIN_FILL_MS = 3000;

/* Lock against double clicks and rapid repeated sending */
const COOLDOWN_MS = 60_000;

/* The worker gives up on the mail server after 10 s; this leaves room for that */
const REQUEST_TIMEOUT_MS = 20_000;

/** Contact form: validation, spam protection and sending. */
export function initContactForm() {
  const form = $('#contactForm');
  if (!form) return;

  const status = $('#formStatus');
  const submitButton = $('#submitBtn');
  const success = $('#formSuccess');
  const successName = $('#successName');
  const fallbackButton = $('#mailFallbackBtn');
  const { endpoint, mail } = form.dataset;

  let loadedAt = Date.now();
  let sentAt = 0;
  let sending = false;
  let unsent = null;

  /* If sending fails, the visitor can still send the message from their own
     mail app – nothing they typed is lost. */
  fallbackButton?.addEventListener('click', () => {
    if (unsent) openMailFallback(mail, unsent);
  });

  const setStatus = (text, kind = '') => {
    if (!status) return;
    status.textContent = text;
    status.className = kind ? `form-status ${kind}` : 'form-status';
  };

  /** Replaces the form with the confirmation, addressed by first name if known. */
  const showSuccess = (name = '') => {
    if (!success) return;
    const firstName = name.trim().split(/\s+/)[0];
    if (successName) successName.textContent = firstName ? `, ${firstName}` : '';
    form.hidden = true;
    success.hidden = false;
    success.setAttribute('tabindex', '-1');
    success.focus();
    success.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
  };

  const validateAll = () => {
    let firstInvalid = null;

    for (const rule of RULES) {
      const input = document.getElementById(rule.id);
      if (!input) continue;
      const valid = rule.isValid(fieldValue(input));
      showError(input, valid ? '' : t.errors[rule.id]);
      if (!valid && !firstInvalid) firstInvalid = input;
    }

    if (firstInvalid) {
      firstInvalid.focus();
      firstInvalid.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
    }
    return !firstInvalid;
  };

  attachLiveValidation();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    /* ── Spam protection, step 1: honeypot ──
       The field is moved off-screen via CSS and hidden from screen readers.
       No human can fill it in – bots stubbornly fill in everything. We
       pretend everything went fine instead of showing an error: a bot that
       sees an error message would otherwise try a different approach. */
    if ($('#f-hp')?.value) {
      showSuccess();
      return;
    }

    /* ── Spam protection, step 2: time trap ──
       Deliberately NO fake confirmation as with the honeypot: this hurdle
       could theoretically hit a very fast human (autofill plus instant
       click). So we show an honest message and allow a second try – a bot
       won't manage it, a human simply clicks again. No real enquiry is lost. */
    if (Date.now() - loadedAt < MIN_FILL_MS) {
      setStatus(t.form.tooFast, 'err');
      loadedAt = 0;
      return;
    }

    /* ── Spam protection, step 3: lock against repeated sending ── */
    if (sending) return;
    if (sentAt && Date.now() - sentAt < COOLDOWN_MS) {
      setStatus(t.form.alreadySent, 'ok');
      return;
    }

    if (!validateAll()) {
      setStatus(t.form.checkFields, 'err');
      return;
    }

    // These keys are the worker's API (worker/src/validation.js).
    const formData = new FormData(form);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      telefon: formData.get('telefon'),
      quelle: formData.get('quelle'),
      nachricht: formData.get('nachricht'),
      interesse: formData.get('interesse') || '',
      sprache: formData.get('sprache') || '',
      // Always sent, so the worker can check the trap as well
      _gotcha: formData.get('_gotcha') || '',
    };

    if (!endpoint) {
      openMailFallback(mail, data);
      setStatus(t.form.mailAppOpens, 'ok');
      return;
    }

    sending = true;
    if (fallbackButton) fallbackButton.hidden = true;
    submitButton.disabled = true;
    const label = submitButton.textContent;
    submitButton.textContent = t.form.sending;
    setStatus('');

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
        // Optional chaining: older Safari versions lack AbortSignal.timeout
        signal: AbortSignal.timeout?.(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      sentAt = Date.now();
      unsent = null;
      form.reset();
      showSuccess(data.name);
    } catch {
      unsent = data;
      if (fallbackButton) fallbackButton.hidden = false;
      setStatus(t.form.failed, 'err');
    } finally {
      sending = false;
      submitButton.disabled = false;
      submitButton.textContent = label;
    }
  });
}

/** Shows or clears the error message of a single field. */
function showError(input, message) {
  const box = $(`.error[data-for="${input.id}"]`);
  input.closest('.field')?.classList.toggle('has-error', Boolean(message));
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
  if (box) box.textContent = message;
}

/**
 * Clears an error as soon as the field is corrected, and checks a field
 * when it is left – a typo in the e-mail shows up before clicking "send".
 * Empty fields are left alone on blur, otherwise tabbing through the form
 * would produce a wall of errors.
 */
function attachLiveValidation() {
  for (const rule of RULES) {
    const input = document.getElementById(rule.id);
    if (!input) continue;
    const isCheckbox = input.type === 'checkbox';
    const valid = () => rule.isValid(fieldValue(input));

    input.addEventListener(isCheckbox ? 'change' : 'input', () => {
      if (valid()) showError(input, '');
    });

    input.addEventListener('blur', () => {
      if (!isCheckbox && !input.value.trim()) return;
      if (!valid()) showError(input, t.errors[rule.id]);
    });
  }
}

/** Opens the visitor's mail app with a ready-made message. */
function openMailFallback(mail, data) {
  const subject = encodeURIComponent(buildMailSubject(data.name, data.interesse));
  const body = encodeURIComponent(buildMailBody(data));
  window.location.href = `mailto:${mail}?subject=${subject}&body=${body}`;
}
