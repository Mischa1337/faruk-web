# Architecture

This document explains how the site is put together and why. For day-to-day
work see the [README](README.md).

## Goals

1. **Fast and findable.** Fully pre-rendered HTML, one small CSS and one small
   JS file, no render-blocking third-party requests. Search engines and AI
   crawlers get the complete content without executing JavaScript.
2. **Privacy by design.** No cookies, no analytics, no external fonts or
   scripts – so no cookie banner is needed (see the privacy policy).
3. **Maintainable by one person.** Small files with obvious names, content
   separated from markup, automated checks instead of manual ones.

## Why Eleventy and not a framework?

The site is a one-pager with three legal sub-pages and a contact form. A
client-side framework (React, Vue …) would add bundle size and hydration cost
without adding value, and would make SEO depend on JavaScript. Eleventy only
runs at build time: it turns templates and data into plain HTML and then gets
out of the way. The browser receives the same kind of static files as a
hand-written site.

esbuild bundles and minifies CSS and JavaScript. It also adds vendor prefixes
and syntax fallbacks for the browser targets in
[`config/assets.js`](config/assets.js), so the sources stay modern and
unprefixed.

## Build pipeline

```
src/_data/*.json ──┐
src/_includes/**   ├─► Eleventy (Nunjucks) ─► _site/*.html, sitemap.xml, robots.txt, llms.txt
src/*.njk         ─┘
src/styles/main.css ─► esbuild (bundle, prefix, minify) ─► _site/css/style.css
src/scripts/main.js ─► esbuild (bundle, minify, IIFE)   ─► _site/js/main.js
src/img/*.jpg       ─► eleventy-img (AVIF, WebP, 3 widths) ─► _site/img/…
src/public/**       ─► copied as is                      ─► _site/…
```

`_site/` is build output: never edited by hand and not committed.

CSS and JS are referenced with a content hash (`/css/style.css?v=1a2b3c4d`,
via the `asset` filter). GitHub Pages lets browsers cache files for ten
minutes; without the hash a returning visitor could get new HTML combined
with a stale stylesheet right after a deploy.

## Content model

Rule of thumb: **templates hold the markup, data files hold every visible
text.** That way each section's markup exists once, whatever the language.

- Lists of similar items – offers, price cards, FAQ, reviews, partners, the
  three values of the philosophy, navigation – are JSON in `src/_data/` and
  rendered with loops.
- The texts of each section (headings, prose, labels) are in
  `src/_data/text/<section>.json`, named like the section template.
- Business facts (address, phone, opening hours, owner) live in
  `src/_data/site.json` and are reused by the page, the legal pages, the
  structured data and `llms.txt`.

Text fields in the data files may contain inline HTML (`<strong>`, `&shy;`,
`&nbsp;`). Templates mark exactly those fields as `| safe`; everything else is
escaped automatically (`autoescape: true`).

## Languages

German is the main language at `/`, English lives at `/en/`.

- **Translations side by side.** Every text is stored as
  `{ "de": "…", "en": "…" }` in the data files; whatever is the same in
  every language (prices, URLs, icons, ids) is written once.
- **Resolved once per page.** [`src/_data/eleventyComputed.js`](src/_data/eleventyComputed.js)
  turns the data into the page's language with `localize()` from
  [`config/i18n.js`](config/i18n.js). `lang` is German by default
  (`src/_data/lang.js`) and English for everything in `src/en/`
  (`en.11tydata.json`). Templates simply write `{{ text.hero.title }}` or
  `{{ offer.title }}` and never deal with languages.
- **Nothing goes out half translated.** A translation without all
  languages stops the build, and a test checks that every text in
  `src/_data/text/` exists in every language.
- **One home page layout.** Both home pages are thin files on
  `layouts/home.njk`. The head links all language versions (`hreflang`),
  the header shows a language switch ("EN" / "DE" – a code, not a flag).
- **Deliberately German only:** the legal pages (the German version is the
  binding one) and the Google reviews (translating them would put words
  into real people's mouths).
- **Scripts** take their messages (form errors, menu labels) from
  [`src/scripts/lib/strings.js`](src/scripts/lib/strings.js), chosen by
  `<html lang>`. Enquiries from the English page reach Faruk in German with
  a note on the language.
- **Adding a language:** add it to `LANGUAGES` in `config/i18n.js`, create
  `src/<code>/` with a directory data file and an `index.njk`, and add the
  texts – the build fails until every translation exists.

## SEO and GEO

- **Structured data** (JSON-LD: `LocalBusiness` with priced offers, `FAQPage`, `Person`,
  `WebSite`) is generated in [`config/structured-data.js`](config/structured-data.js)
  from the same data as the visible page. The FAQ in the structured data is
  therefore always word for word identical to the visible FAQ, which a test
  verifies as well.
- **`llms.txt`** gives AI assistants a plain-text summary of offers, prices,
  FAQ and contact details ([`src/llms.11ty.js`](src/llms.11ty.js)).
- **Every language version** has its own URL, `hreflang` links to the
  others and its own structured data graph (`/en/#business`), so German and
  English texts never mix in one entity.
- **Sitemap** lists only indexable pages; `lastmod` is the date of the last
  commit that touched `src/`.
- **Legal pages and the 404 page** are `noindex, follow`.
- **No content behind JavaScript.** Elements fade in on scroll, but they are
  only hidden when a tiny inline script confirms that JavaScript runs, and
  they reappear if the main script fails to load
  ([`partials/head-scripts.njk`](src/_includes/partials/head-scripts.njk)).

## CSS

[`src/styles/main.css`](src/styles/main.css) only lists imports. Their order
defines the cascade, from generic to specific:

| Folder        | Contents                                                                |
| ------------- | ----------------------------------------------------------------------- |
| `base/`       | design tokens, reset, typography, page layout                           |
| `utilities/`  | accessibility helpers; motion and print at the very end                 |
| `components/` | reusable parts: button, icon, card, language switch, theme toggle, form |
| `layout/`     | site frame: header, footer, mobile contact bar                          |
| `sections/`   | one file per home page section, same name as its template               |
| `pages/`      | styles used only by the legal pages                                     |

All colours are custom properties in `base/tokens.css`. The colour scheme
follows the visitor's system setting (`prefers-color-scheme`): light by
default, and the dark scheme only redefines the base tones; everything else
is derived with `color-mix()`. No JavaScript is involved.
Responsive rules sit next to the component they belong to.

## JavaScript

[`src/scripts/main.js`](src/scripts/main.js) imports one module per feature
and initialises them in order. Each module exports a single `init…` function
that first checks whether its elements exist on the current page, so all pages
share one bundle. The scripts only enhance the page: without JavaScript
everything is readable and the contact details remain usable.

The contact form logic is split into
[`validation.js`](src/scripts/modules/contact-form/validation.js) (pure
functions, unit-tested) and [`index.js`](src/scripts/modules/contact-form/index.js)
(DOM wiring, spam protection, sending). Spam protection works without a
CAPTCHA: a honeypot field, a minimum fill-in time and a send cooldown.

## Contact form backend

A static host cannot send e-mail, and the browser can neither keep a
mailbox password secret nor speak SMTP. So the form posts to a
[Cloudflare Worker](worker/README.md) – the only server code in the
project – which checks the submission again and sends it through the
site's IONOS mailbox to a fixed address.

- **Free and bounded.** Workers Free without a payment method: exceeding a
  limit makes requests fail, it never creates costs. A global daily limit
  (Durable Object) caps how many mails bots could ever trigger.
- **Shared rules.** The worker imports patterns, length limits and the mail
  builders from the browser's `validation.js`, so both sides check the same
  rules and the e-mail looks the same as the mailto fallback.
- **Testable core.** Request handling and rate-limit logic are plain
  functions; SMTP, health check and storage are injected, so `node:test`
  covers the worker without the Workers runtime.
- **Degrades gracefully.** Without a configured endpoint
  (`contact.formEndpoint` in `site.json`) the form opens the visitor's mail
  app. If sending fails, the same mailto message is offered as a way out.
  The privacy policy switches its text on the same setting, and a test
  ensures form and privacy policy always agree.

## Paths

Templates use root-relative URLs (`/css/style.css`). When the site is served
from a sub-path – a GitHub Pages project URL before the custom domain is
connected – CI sets `PATH_PREFIX` and Eleventy's `HtmlBasePlugin` prefixes all
URLs. This also keeps the 404 page working at any depth.
