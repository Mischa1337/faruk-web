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
src/public/**       ─► copied as is                      ─► _site/img/…
```

`_site/` is build output: never edited by hand and not committed.

## Content model

Rule of thumb: **content that repeats lives in data files, prose lives in
templates.**

- Lists of similar items – offers, price cards, FAQ, reviews, partners,
  navigation – are JSON in `src/_data/` and rendered with loops.
- One-off prose – hero, about me, process – stays as HTML in its section
  template, where it is easiest to read and edit.
- Business facts (address, phone, opening hours, owner) live in
  `src/_data/site.json` and are reused by the page, the legal pages, the
  structured data and `llms.txt`.

Text fields in the data files may contain inline HTML (`<strong>`, `&shy;`,
`&nbsp;`). Templates mark exactly those fields as `| safe`; everything else is
escaped automatically (`autoescape: true`).

## SEO and GEO

- **Structured data** (JSON-LD: `LocalBusiness`, `FAQPage`, `Person`,
  `WebSite`) is generated in [`config/structured-data.js`](config/structured-data.js)
  from the same data as the visible page. The FAQ in the structured data is
  therefore always word for word identical to the visible FAQ, which a test
  verifies as well.
- **`llms.txt`** gives AI assistants a plain-text summary of offers, prices,
  FAQ and contact details ([`src/llms.11ty.js`](src/llms.11ty.js)).
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

| Folder        | Contents                                                  |
| ------------- | --------------------------------------------------------- |
| `base/`       | design tokens, reset, typography, page layout             |
| `utilities/`  | accessibility helpers; motion and print at the very end   |
| `components/` | reusable parts: button, icon, card, theme toggle, form    |
| `layout/`     | site frame: header, footer, mobile contact bar            |
| `sections/`   | one file per home page section, same name as its template |
| `pages/`      | styles used only by the legal pages                       |

All colours are custom properties in `base/tokens.css`. The light scheme only
redefines the base tones; everything else is derived with `color-mix()`.
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

## Paths

Templates use root-relative URLs (`/css/style.css`). When the site is served
from a sub-path – a GitHub Pages project URL before the custom domain is
connected – CI sets `PATH_PREFIX` and Eleventy's `HtmlBasePlugin` prefixes all
URLs. This also keeps the 404 page working at any depth.
