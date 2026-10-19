/**
 * llms.txt (https://llmstxt.org): a plain-text summary of the business for
 * AI assistants and AI search (GEO). Generated from the same data files as
 * the page itself, so it can never contradict it.
 *
 * Written as a JavaScript template because it is plain text, not HTML,
 * and must not be HTML-escaped.
 */
import { stripTags } from '../config/filters.js';

export const data = {
  permalink: 'llms.txt',
  eleventyExcludeFromCollections: true,
};

const list = (items) => items.map((item) => `- ${item}`).join('\n');

const formatPrice = (plan) =>
  plan.rates
    ? plan.rates.map((rate) => `${rate.duration} ${rate.amount} €`).join(', ')
    : `${plan.price.amount} ${plan.price.unit}`;

export function render({ site, philosophy, offers, pricing, pricingNotes, faq }) {
  const { owner, address, contact } = site;

  return `# ${site.name}

> Personal Training und Online-Coaching mit ${owner.name} – 1:1-Training für Kraft, Abnehmen und Beweglichkeit, vor Ort in ${address.city} und Umgebung oder online von überall. Das Erstgespräch ist kostenlos und unverbindlich.

${list([
  `Website: ${site.url}/`,
  `Trainer: ${owner.name}, zertifizierter Personal Trainer (Fitnesstrainer A- und B-Lizenz), seit 2019 in der Trainingsbetreuung`,
  `Schwerpunkte: ${owner.expertise.join(', ')}`,
  'Sprachen: Deutsch, Englisch, Türkisch',
  `Standort: ${address.street}, ${address.postalCode} ${address.city}; Online-Coaching ortsunabhängig`,
])}

## Philosophie

AFP steht für Achtsamkeit, Fortschritt und Präzision.

${list(philosophy.map((pillar) => `**${pillar.title}** – ${pillar.claim}: ${pillar.text}`))}

## Angebote

${list(offers.map((offer) => `**${stripTags(offer.title)}**: ${stripTags(offer.text)}`))}

## Preise

${list([
  ...pricing.plans.map((plan) => `**${plan.name}**: ${formatPrice(plan)} – ${plan.description}`),
  ...pricingNotes.map(stripTags),
])}

## Häufige Fragen

${faq.map((item) => `### ${item.question}\n\n${stripTags(item.answer)}`).join('\n\n')}

## Kontakt

${list([
  `WhatsApp / Telefon: ${contact.phoneDisplay} (${contact.whatsappHours})`,
  `E-Mail: ${contact.email}`,
  `Instagram: ${contact.instagram.url}`,
  `Kontaktformular: ${site.url}/#kontakt`,
])}
`;
}
