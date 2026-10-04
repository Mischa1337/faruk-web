/* ═══════════════════════════════════════════════════════════
   AFP-Coaching · Skript
   Vanilla JS, keine Bibliotheken, keine externen Requests.

   AUFBAU
     Einstellungen · Hilfsfunktionen
     initYear          Jahreszahl im Footer
     initHeader        Hintergrund der Kopfzeile beim Scrollen
     initMobileNav     Klappmenü am Handy
     initScrollSpy     aktiven Menüpunkt markieren
     initReveal        Elemente beim Scrollen einblenden
     initMobileCta     Kontaktleiste am Handy ein-/ausblenden
     initPackageLinks  Preiskarten wählen das Anliegen im Formular vor
     initContactForm   Prüfung, Spam-Schutz und Versand des Formulars
     Start             ruft alles der Reihe nach auf

   Jede init-Funktion prüft selbst, ob ihre Elemente auf der Seite
   existieren. Impressum, Datenschutz und 404 nutzen dieselbe Datei.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── EINSTELLUNGEN ────────────────────────────────────────
     formEndpoint: URL des Gratis-Formulardienstes Formspree,
       z. B. https://formspree.io/f/xxxxxxxx (50 Nachrichten/Monat gratis).
     Solange das Feld leer ist, öffnet der Absenden-Button
     das E-Mail-Programm mit fertig ausgefüllter Nachricht –
     die Seite funktioniert also von der ersten Minute an. */
  var CONFIG = {
    formEndpoint: '',
    fallbackMail: 'kontakt@afp-coaching.de'
  };

  // Signal an das Sicherheitsnetz im <head>: Das Skript ist angekommen,
  // die Einblend-Animation darf aktiv bleiben.
  window.__siteReady = true;

  /* ── Hilfsfunktionen ──────────────────────────────────── */
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasObserver  = 'IntersectionObserver' in window;

  /* ── Jahreszahl im Footer ─────────────────────────────── */
  function initYear() {
    var yearEl = $('#year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  /* ── Header: Hintergrund einblenden, sobald gescrollt wird ── */
  function initHeader() {
    var header = $('#siteHeader');
    if (!header) return;

    var setStuck = function () {
      header.classList.toggle('is-stuck', window.scrollY > 12);
    };
    setStuck();
    window.addEventListener('scroll', setStuck, { passive: true });
  }

  /* ── Mobile Navigation ────────────────────────────────── */
  function initMobileNav() {
    var toggle = $('#navToggle');
    var nav    = $('#siteNav');
    if (!toggle || !nav) return;

    var closeNav = function () {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Menü öffnen');
    };

    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    });

    $$('a', nav).forEach(function (link) {
      link.addEventListener('click', closeNav);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        closeNav();
        toggle.focus();
      }
    });
  }

  /* ── Aktiven Menüpunkt beim Scrollen markieren ─────────── */
  function initScrollSpy() {
    var navLinks = $$('.site-nav a[href^="#"]').filter(function (a) {
      return !a.classList.contains('btn');
    });
    var sections = navLinks
      .map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
      .filter(Boolean);

    if (!hasObserver || !sections.length) return;

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ── Elemente beim Scrollen sanft einblenden ──────────── */
  function initReveal() {
    var revealables = $$('.reveal');

    if (reduceMotion || !hasObserver) {
      revealables.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var revealer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry, i) {
        if (!entry.isIntersecting) return;
        // Kleiner Versatz, damit Karten nacheinander erscheinen
        entry.target.style.transitionDelay = Math.min(i * 70, 280) + 'ms';
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    revealables.forEach(function (el) { revealer.observe(el); });
  }

  /* ── Kontaktleiste am Handy ausblenden, wenn der
        Kontaktbereich ohnehin im Bild ist ──────────────── */
  function initMobileCta() {
    var mobileCta      = $('#mobileCta');
    var contactSection = $('#kontakt');
    if (!mobileCta || !contactSection || !hasObserver) return;

    new IntersectionObserver(function (entries) {
      mobileCta.classList.toggle('is-hidden', entries[0].isIntersecting);
    }, { threshold: 0.12 }).observe(contactSection);
  }

  /* ── Paket aus den Preiskarten vorauswählen ───────────────
     Ein Schritt weniger im Formular. */
  function initPackageLinks() {
    var topicSelect = $('#f-topic');
    if (!topicSelect) return;

    $$('a[data-package]').forEach(function (link) {
      link.addEventListener('click', function () {
        var wanted = link.getAttribute('data-package');
        $$('option', topicSelect).forEach(function (opt) {
          if (opt.value === wanted) topicSelect.value = wanted;
        });
      });
    });
  }

  /* ── Kontaktformular ──────────────────────────────────── */
  function initContactForm() {
    var form = $('#contactForm');
    if (!form) return;

    var statusEl   = $('#formStatus');
    var submitBtn  = $('#submitBtn');
    var successEl  = $('#formSuccess');

    /* Zeitfalle: Menschen brauchen zum Ausfüllen zwangsläufig ein paar Sekunden,
       Bots senden praktisch sofort. Alles unter dieser Grenze ist kein Mensch. */
    var MIN_FILL_MS = 3000;
    var loadedAt = Date.now();

    /* Sperre gegen Doppelklicks und schnelles Mehrfachsenden */
    var COOLDOWN_MS = 60000;
    var sentAt = 0;
    var sending = false;

    var RULES = [
      { id: 'f-name',    test: function (v) { return v.trim().length >= 2; },            msg: 'Bitte gib deinen Namen an.' },
      { id: 'f-mail',    test: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); }, msg: 'Bitte gib eine gültige E-Mail-Adresse an.' },
      { id: 'f-msg',     test: function (v) { return v.trim().length >= 10; },           msg: 'Bitte beschreibe kurz dein Anliegen (mind. 10 Zeichen).' },
      { id: 'f-consent', test: null,                                                     msg: 'Bitte stimme der Datenschutzerklärung zu.' }
    ];

    var showError = function (id, msg) {
      var input = document.getElementById(id);
      var box   = $('.error[data-for="' + id + '"]');
      if (input && input.closest('.field')) input.closest('.field').classList.toggle('has-error', !!msg);
      if (box) box.textContent = msg || '';
      if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    };

    var validate = function () {
      var firstBad = null;

      RULES.forEach(function (rule) {
        var input = document.getElementById(rule.id);
        if (!input) return;
        var ok = rule.test ? rule.test(input.value) : input.checked;
        showError(rule.id, ok ? '' : rule.msg);
        if (!ok && !firstBad) firstBad = input;
      });

      if (firstBad) {
        firstBad.focus();
        firstBad.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
      }
      return !firstBad;
    };

    RULES.forEach(function (rule) {
      var input = document.getElementById(rule.id);
      if (!input) return;
      var check = function () { return rule.test ? rule.test(input.value) : input.checked; };

      // Fehler verschwindet sofort, sobald korrigiert wird
      input.addEventListener(input.type === 'checkbox' ? 'change' : 'input', function () {
        if (check()) showError(rule.id, '');
      });

      // Beim Verlassen des Feldes prüfen – der Tippfehler in der E-Mail fällt
      // so schon auf, bevor auf „Senden" geklickt wird. Leere Felder bleiben
      // dabei unangetastet, sonst würde man beim Durchtabben angemeckert.
      input.addEventListener('blur', function () {
        if (input.type !== 'checkbox' && !input.value.trim()) return;
        if (!check()) showError(rule.id, rule.msg);
      });
    });

    var setStatus = function (text, kind) {
      if (!statusEl) return;
      statusEl.textContent = text;
      statusEl.className = 'form-status' + (kind ? ' ' + kind : '');
    };

    var mailtoFallback = function (data) {
      var body = [
        'Name: '     + data.name,
        'E-Mail: '   + data.email,
        'Telefon: '  + (data.telefon || '–'),
        'Interesse: ' + data.ziel,
        '',
        data.nachricht
      ].join('\n');

      var href = 'mailto:' + CONFIG.fallbackMail +
        '?subject=' + encodeURIComponent('Anfrage Personal Training – ' + data.name) +
        '&body='    + encodeURIComponent(body);

      window.location.href = href;
      setStatus('Dein E-Mail-Programm öffnet sich mit der fertigen Nachricht – bitte nur noch abschicken.', 'ok');
    };

    var showSuccess = function () {
      if (!successEl) return;
      form.hidden = true;
      successEl.hidden = false;
      successEl.setAttribute('tabindex', '-1');
      successEl.focus();
      successEl.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      /* ── Spam-Schutz, Stufe 1: Honeypot ──
         Das Feld ist per CSS aus dem Bild geschoben und von Screenreadern
         ausgenommen. Kein Mensch kann es ausfüllen – Bots füllen stur alles aus.
         Wir tun so, als sei alles in Ordnung, statt einen Fehler zu zeigen:
         Ein Bot, der eine Fehlermeldung sieht, probiert es sonst anders herum. */
      if ($('#f-hp') && $('#f-hp').value) { showSuccess(); return; }

      /* ── Spam-Schutz, Stufe 2: Zeitfalle ──
         Bewusst KEINE vorgetäuschte Bestätigung wie beim Honeypot: Diese Hürde
         könnte theoretisch auch einen sehr schnellen Menschen treffen (Autofill
         plus sofortiger Klick). Deshalb hier eine ehrliche Meldung und ein
         zweiter Versuch – ein Bot schafft den nicht, ein Mensch klickt einfach
         noch einmal. So geht garantiert keine echte Anfrage verloren. */
      if (Date.now() - loadedAt < MIN_FILL_MS) {
        setStatus('Fast geschafft – bitte klicke noch einmal auf „Anfrage senden".', 'err');
        loadedAt = 0;
        return;
      }

      /* ── Spam-Schutz, Stufe 3: Sperre gegen Mehrfachsenden ── */
      if (sending) return;
      if (sentAt && Date.now() - sentAt < COOLDOWN_MS) {
        setStatus('Deine Anfrage ist bereits unterwegs. Einen Moment bitte.', 'ok');
        return;
      }

      if (!validate()) {
        setStatus('Bitte prüfe die markierten Felder.', 'err');
        return;
      }

      // Die Schlüssel bleiben deutsch: Formspree zeigt sie in der E-Mail
      // an Faruk als Feldnamen an.
      var fd = new FormData(form);
      var data = {
        name:      fd.get('name'),
        email:     fd.get('email'),
        telefon:   fd.get('telefon'),
        ziel:      fd.get('ziel'),
        nachricht: fd.get('nachricht'),
        // Leer mitschicken, damit Formspree das Feld kennt und selbst filtert
        _gotcha:   fd.get('_gotcha') || ''
      };

      if (!CONFIG.formEndpoint) {
        mailtoFallback(data);
        return;
      }

      sending = true;
      submitBtn.disabled = true;
      var label = submitBtn.textContent;
      submitBtn.textContent = 'Wird gesendet …';
      setStatus('');

      fetch(CONFIG.formEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          sentAt = Date.now();
          form.reset();
          showSuccess();
        })
        .catch(function () {
          setStatus('Das Senden hat nicht geklappt. Schreib mir bitte direkt per WhatsApp oder an ' + CONFIG.fallbackMail + '.', 'err');
        })
        .finally(function () {
          sending = false;
          submitBtn.disabled = false;
          submitBtn.textContent = label;
        });
    });
  }

  /* ── Start ────────────────────────────────────────────── */
  initYear();
  initHeader();
  initMobileNav();
  initScrollSpy();
  initReveal();
  initMobileCta();
  initPackageLinks();
  initContactForm();
})();
