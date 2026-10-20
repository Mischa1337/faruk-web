# AFP-Coaching · Website

[![Site](https://github.com/Mischa1337/faruk-web/actions/workflows/site.yml/badge.svg)](https://github.com/Mischa1337/faruk-web/actions/workflows/site.yml)

Website of AFP-Coaching – personal training on site and online coaching, in
German and English. Live at [afp-coaching.de](https://afp-coaching.de).

A static site built with [Eleventy](https://www.11ty.dev/) and
[esbuild](https://esbuild.github.io/): plain HTML, CSS and JavaScript in the
browser – no framework, no cookies, no tracking and no requests to
third-party servers while browsing. The contact form posts to a small
Cloudflare Worker that sends it by e-mail ([`worker/`](worker/README.md)).

| Lighthouse (home page) | Score |
| ---------------------- | ----- |
| Performance            | 98+   |
| Accessibility          | 96    |
| Best Practices         | 100   |
| SEO                    | 100   |

The scores are enforced in CI (see [Quality gates](#quality-gates)).

## Getting started

Requires Node.js 20 or newer (`.nvmrc` pins the version used in CI).

```bash
npm install
npm run dev      # local server with live reload on http://localhost:4321
```

## Where do I change what?

| I want to change …                            | File                                       |
| --------------------------------------------- | ------------------------------------------ |
| Prices, offers, FAQ, reviews, partners        | `src/_data/*.json`                         |
| Phone, e-mail, address, WhatsApp text         | `src/_data/site.json`                      |
| Menu and footer links                         | `src/_data/navigation.json`                |
| Text of a section (hero, about me, process …) | `src/_data/text/<section>.json`            |
| English version of a text                     | right next to the German one (`"en"`)      |
| Messages of the scripts (form errors …)       | `src/scripts/lib/strings.js`               |
| Markup of a section                           | `src/_includes/sections/<section>.njk`     |
| Order of the sections                         | `src/_includes/layouts/home.njk`           |
| Look of a section                             | `src/styles/sections/<section>.css`        |
| Colours, spacing, fonts                       | `src/styles/base/tokens.css`               |
| Behaviour (menu, form, theme toggle …)        | `src/scripts/modules/`                     |
| Contact form endpoint (worker URL)            | `src/_data/site.json` (`formEndpoint`)     |
| Imprint, privacy policy                       | `src/impressum.njk`, `src/datenschutz.njk` |
| Photos (optimised automatically)              | `src/img/`                                 |
| Logo, favicons, social preview                | `src/public/`                              |

Content data is the single source of truth: the FAQ, offers and contact
details and prices also feed the structured data for Google (JSON-LD) and `llms.txt` for
AI assistants, so they can never contradict the visible page.

## Scripts

| Command            | What it does                                           |
| ------------------ | ------------------------------------------------------ |
| `npm run dev`      | Development server with live reload                    |
| `npm run build`    | Builds the site into `_site/`                          |
| `npm run lint`     | ESLint, Stylelint and Prettier check                   |
| `npm run format`   | Formats all files with Prettier                        |
| `npm run validate` | Validates the generated HTML (html-validate)           |
| `npm test`         | Unit tests and SEO/link regression tests (`node:test`) |
| `npm run check`    | Everything above in one go – run this before pushing   |

## Quality gates

Every push and pull request runs [`.github/workflows/site.yml`](.github/workflows/site.yml):

1. **Lint** – ESLint, Stylelint, Prettier
2. **Build** – Eleventy + esbuild
3. **Validate** – html-validate on every generated page
4. **Test** – form validation and contact worker unit tests; translations
   complete in every language; SEO regression tests (one `<h1>` per page,
   canonical URLs, `hreflang`, `noindex` on legal pages, structured data
   matching the visible FAQ, sitemap, no broken internal links or anchors)
5. **Lighthouse CI** – fails below 95 accessibility / best practices and below
   100 SEO on the home page ([`lighthouserc.json`](lighthouserc.json))
6. **Deploy** – only from `main`, to GitHub Pages

## Project structure

```
src/
  _data/            content and settings (JSON) – single source of truth, in every language
    text/           texts of the sections, one file per section
  _includes/
    layouts/        page skeletons (base, home page, sub-page)
    partials/       header, footer, head, icons, contact form, JSON-LD
    sections/       one file per section of the home page
  styles/           CSS, bundled by esbuild into css/style.css
  scripts/          ES modules, bundled by esbuild into js/main.js
  img/              photos, turned into AVIF/WebP in several widths
  public/           static files copied as they are (logo, favicons)
  index.njk         German home page
  en/               English home page (lang: en)
  impressum.njk     imprint
  datenschutz.njk   privacy policy
  404.njk           error page
  sitemap.njk, robots.njk, llms.11ty.js
config/             build helpers (asset bundling, filters, languages, structured data)
test/               automated tests
worker/             Cloudflare Worker that sends the contact form (own package.json)
eleventy.config.js  build configuration
```

More background on the design decisions: [ARCHITECTURE.md](ARCHITECTURE.md).

## Deployment

GitHub Actions builds the site and publishes it to GitHub Pages on every push
to `main` (repository settings → Pages → Source: **GitHub Actions**). A change
is live about two minutes after it is merged.

The contact worker is deployed to Cloudflare by
[`.github/workflows/worker.yml`](.github/workflows/worker.yml) whenever it
changes, and [`contact-health.yml`](.github/workflows/contact-health.yml)
checks once a day that it can still log in to the mail server. Setup and
details: [worker/README.md](worker/README.md).
