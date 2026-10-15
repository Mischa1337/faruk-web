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
  pages = readdirSync(output).filter((file) => file.endsWith('.html'));
});

describe('every page', () => {
  test('is built', () => {
    assert.deepEqual(pages.sort(), [
      '404.html',
      'datenschutz.html',
      'impressum.html',
      'index.html',
    ]);
  });

  test('has German language, a viewport and a reasonable title', () => {
    for (const page of pages) {
      const html = read(page);
      assert.match(html, /<html lang="de"/, page);
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
        const [path, hash] = href.split('#');
        if (!path) {
          assert.ok(ids.has(hash), `${page}: missing anchor #${hash}`);
          continue;
        }
        const file = path === '/' ? 'index.html' : path.replace(/^\//, '');
        assert.ok(existsSync(join(output, file)), `${page}: broken link ${href}`);
        if (hash) {
          assert.ok(read(file).includes(`id="${hash}"`), `${page}: missing anchor ${href}`);
        }
      }
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

describe('home page', () => {
  test('is indexable with canonical URL and social preview', () => {
    const html = read('index.html');
    assert.match(meta(html, 'robots'), /^index, follow/);
    assert.match(html, new RegExp(`<link rel="canonical" href="${SITE_URL}/">`));
    assert.match(html, new RegExp(`<meta property="og:image" content="${SITE_URL}/img/`));
  });

  test('has valid structured data whose FAQ matches the visible FAQ word for word', () => {
    const html = read('index.html');
    const json = first(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    const graph = JSON.parse(json)['@graph'];
    const types = graph.map((node) => [node['@type']].flat()[0]);
    assert.deepEqual(types, ['LocalBusiness', 'FAQPage', 'Person', 'WebSite']);

    const visible = all(html, /<summary>([^<]*)<\/summary>/g).map(decode);
    const structured = graph.find((node) => node['@type'] === 'FAQPage').mainEntity;
    assert.deepEqual(
      structured.map((q) => q.name),
      visible,
    );
    for (const { acceptedAnswer } of structured) {
      assert.doesNotMatch(acceptedAnswer.text, /<[^>]+>/, 'answers must be plain text');
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

describe('crawler files', () => {
  test('sitemap lists exactly the indexable pages', () => {
    const locations = all(read('sitemap.xml'), /<loc>([^<]+)<\/loc>/g);
    assert.deepEqual(locations, [`${SITE_URL}/`]);
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
