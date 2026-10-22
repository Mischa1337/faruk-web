/**
 * Regression tests for the generated site: SEO basics, structured data and
 * links. Builds the site into _site/ once before testing.
 */
import { before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import Eleventy from '@11ty/eleventy';

const SITE_URL = 'https://afp-coaching.de';
const output = '_site';
const read = (file) => readFileSync(join(output, file), 'utf8');

/** The home page in every language: file, URL and the language it must declare. */
const HOMES = [
  { file: 'index.html', url: '/', lang: 'de' },
  { file: 'en/index.html', url: '/en/', lang: 'en' },
];

const all = (html, pattern) => [...html.matchAll(pattern)].map((match) => match[1]);
const first = (html, pattern) => html.match(pattern)?.[1];
const meta = (html, name) => first(html, new RegExp(`<meta name="${name}" content="([^"]*)"`));
const decode = (text) =>
  text
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&shy;/g, '');

let pages;

before(async () => {
  const eleventy = new Eleventy('src', output, {
    quietMode: true,
    configPath: 'eleventy.config.js',
  });
  await eleventy.write();
  pages = readdirSync(output, { recursive: true })
    .filter((file) => file.endsWith('.html'))
    .map((file) => file.split('\\').join('/'));
});

describe('every page', () => {
  test('is built', () => {
    assert.deepEqual(pages.sort(), [
      '404.html',
      'datenschutz.html',
      'en/index.html',
      'impressum.html',
      'index.html',
    ]);
  });

  test('declares its language (English in en/, German elsewhere), a viewport and a reasonable title', () => {
    for (const page of pages) {
      const html = read(page);
      assert.match(html, page.startsWith('en/') ? /<html lang="en"/ : /<html lang="de"/, page);
      assert.ok(meta(html, 'viewport'), `${page}: viewport`);
      const title = decode(first(html, /<title>([^<]*)<\/title>/) ?? '');
      assert.ok(title.length > 10 && title.length <= 60, `${page}: title "${title}"`);
    }
  });

  test('has exactly one <h1>', () => {
    for (const page of pages) assert.equal(all(read(page), /<h1[\s>]()/g).length, 1, page);
  });

  test('keeps meta descriptions short enough for search results', () => {
    for (const page of pages) {
      const description = meta(read(page), 'description');
      if (description) assert.ok(decode(description).length <= 160, page);
    }
  });

  test('only links to anchors and files that exist', () => {
    for (const page of pages) {
      const html = read(page);
      const ids = new Set(all(html, /\sid="([^"]+)"/g));
      for (const href of all(html, /\s(?:href|src)="([^"]+)"/g)) {
        if (/^(https?:|mailto:|tel:)/.test(href)) continue;
        const [path, hash] = href.split('?')[0].split('#');
        if (!path) {
          assert.ok(ids.has(hash), `${page}: missing anchor #${hash}`);
          continue;
        }
        const file = (path.endsWith('/') ? `${path}index.html` : path).replace(/^\//, '');
        assert.ok(existsSync(join(output, file)), `${page}: broken link ${href}`);
        if (hash) {
          assert.ok(read(file).includes(`id="${hash}"`), `${page}: missing anchor ${href}`);
        }
      }
    }
  });

  test('references CSS and JS with a content hash, so browsers never mix old and new files', () => {
    for (const page of pages) {
      const html = read(page);
      assert.match(html, /href="\/css\/style\.css\?v=[0-9a-f]{8}"/, page);
      assert.match(html, /src="\/js\/main\.js\?v=[0-9a-f]{8}"/, page);
    }
  });

  test('gives every image an alt text and dimensions', () => {
    for (const page of pages) {
      for (const img of all(read(page), /(<img\s[^>]*>)/g)) {
        assert.match(img, /\salt="[^"]+"/, `${page}: ${img}`);
        assert.match(img, /\swidth="\d+"/, `${page}: ${img}`);
        assert.match(img, /\sheight="\d+"/, `${page}: ${img}`);
      }
    }
  });
});

describe('home pages', () => {
  const graphOf = (html) =>
    JSON.parse(first(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/))['@graph'];

  test('are indexable with canonical URL and social preview', () => {
    for (const { file, url } of HOMES) {
      const html = read(file);
      assert.match(meta(html, 'robots'), /^index, follow/, file);
      assert.match(html, new RegExp(`<link rel="canonical" href="${SITE_URL}${url}">`), file);
      assert.match(html, new RegExp(`<meta property="og:image" content="${SITE_URL}/img/`), file);
    }
  });

  test('point to each other with hreflang and the language switch', () => {
    for (const { file, lang } of HOMES) {
      const html = read(file);
      for (const other of HOMES) {
        assert.ok(
          html.includes(
            `<link rel="alternate" hreflang="${other.lang}" href="${SITE_URL}${other.url}">`,
          ),
          `${file} → ${other.lang}`,
        );
      }
      assert.ok(html.includes(`hreflang="x-default" href="${SITE_URL}/"`), file);
      const switches = all(html, /<a class="lang-switch" href="([^"]+)"/g);
      assert.deepEqual(
        switches,
        HOMES.filter((other) => other.lang !== lang).map((other) => other.url),
        file,
      );
    }
  });

  test('have valid structured data whose FAQ matches the visible FAQ word for word', () => {
    for (const { file } of HOMES) {
      const html = read(file);
      const graph = graphOf(html);
      const types = graph.map((node) => [node['@type']].flat()[0]);
      assert.deepEqual(types, ['LocalBusiness', 'FAQPage', 'Person', 'WebSite'], file);

      const visible = all(html, /<summary>([^<]*)<\/summary>/g).map(decode);
      const structured = graph.find((node) => node['@type'] === 'FAQPage').mainEntity;
      assert.deepEqual(
        structured.map((q) => decode(q.name)),
        visible,
        file,
      );
      for (const { acceptedAnswer } of structured) {
        assert.doesNotMatch(acceptedAnswer.text, /<[^>]+>/, 'answers must be plain text');
      }
    }
  });

  test('describe each language version as its own graph', () => {
    for (const { file, url, lang } of HOMES) {
      const graph = graphOf(read(file));
      assert.equal(graph[0]['@id'], `${SITE_URL}${url}#business`, file);
      assert.match(graph.at(-1).inLanguage, new RegExp(`^${lang}-`), file);
    }
  });

  test('name the same towns in the structured data as in the contact section', () => {
    for (const { file } of HOMES) {
      const html = read(file);
      const list = first(html, /<ul class="service-area"[^>]*>([\s\S]*?)<\/ul>/);
      const visible = all(list, /<li>([^<]*)<\/li>/g).map(decode);
      assert.ok(visible.length > 1, file);
      assert.deepEqual(
        graphOf(html)[0].areaServed.map((place) => place.name),
        visible,
        file,
      );
    }
  });

  test('offer every visible price in the structured data', () => {
    for (const { file } of HOMES) {
      const html = read(file);
      const business = graphOf(html)[0];
      const structured = business.makesOffer.filter((offer) => offer.price).map((o) => o.price);

      const visible = [
        ...all(html, /<span class="amount">(\d+)<\/span>/g),
        ...all(html, /Duo[- ]training: €?(\d+)/gi),
        // Monthly prices in the footnote (nutrition coaching, alone and combined)
        ...all(html, /€?(\d+)(?: €)? \/ (?:Monat|month)/g),
      ];
      assert.deepEqual(structured.sort(), visible.sort(), file);
      for (const offer of business.makesOffer) {
        assert.equal(offer.itemOffered['@type'], 'Service');
        if (offer.price) assert.equal(offer.priceCurrency, 'EUR');
      }
    }
  });
});

describe('sub-pages', () => {
  test('are kept out of the search index', () => {
    for (const page of ['impressum.html', 'datenschutz.html', '404.html']) {
      assert.equal(meta(read(page), 'robots'), 'noindex, follow', page);
    }
  });
});

describe('contact form', () => {
  const { formEndpoint } = JSON.parse(readFileSync('src/_data/site.json', 'utf8')).contact;

  test('sends to the worker only when an endpoint is configured', () => {
    const form = first(read('index.html'), /(<form[^>]*id="contactForm"[^>]*>)/);
    assert.match(form, /data-mail="kontakt@afp-coaching\.de"/);
    assert.equal(form.includes('data-endpoint='), Boolean(formEndpoint));
  });

  test('privacy policy describes the way the form actually sends', () => {
    const privacy = read('datenschutz.html');
    assert.equal(privacy.includes('Cloudflare'), Boolean(formEndpoint));
    assert.equal(privacy.includes('mailto:-Link'), !formEndpoint);
  });
});

describe('crawler files', () => {
  test('sitemap lists exactly the indexable pages', () => {
    const locations = all(read('sitemap.xml'), /<loc>([^<]+)<\/loc>/g);
    assert.deepEqual(locations, [`${SITE_URL}/`, `${SITE_URL}/en/`]);
    assert.match(read('sitemap.xml'), /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
  });

  test('robots.txt allows crawling and points to the sitemap', () => {
    const robots = read('robots.txt');
    assert.match(robots, /^Allow: \/$/m);
    assert.match(robots, new RegExp(`^Sitemap: ${SITE_URL}/sitemap.xml$`, 'm'));
  });

  test('llms.txt summarises offers, prices and contact as plain text', () => {
    const llms = read('llms.txt');
    for (const heading of ['## Angebote', '## Preise', '## Häufige Fragen', '## Kontakt']) {
      assert.ok(llms.includes(heading), heading);
    }
    assert.doesNotMatch(llms, /<[a-z][^>]*>|&amp;|&shy;/);
  });
});
