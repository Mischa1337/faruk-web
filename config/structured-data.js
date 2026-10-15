/**
 * Builds the schema.org graph (JSON-LD) of the home page from the content
 * data files: business, FAQ, person and website.
 *
 * Prices are intentionally not part of it yet; they are shown on the page
 * and in llms.txt.
 */
export function buildStructuredData({ site, offers, faq }, { stripTags }) {
  const id = (fragment) => `${site.url}/#${fragment}`;
  const { address, contact, openingHours, owner, business } = site;

  const localBusiness = {
    '@type': ['LocalBusiness', 'SportsActivityLocation'],
    '@id': id('business'),
    name: site.name,
    description: business.description,
    url: `${site.url}/`,
    telephone: contact.phone,
    email: contact.email,
    image: `${site.url}${site.ogImage}`,
    priceRange: business.priceRange,
    currenciesAccepted: 'EUR',
    paymentAccepted: business.paymentAccepted,
    address: {
      '@type': 'PostalAddress',
      streetAddress: address.street,
      postalCode: address.postalCode,
      addressLocality: address.city,
      addressRegion: address.region,
      addressCountry: address.country,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: address.latitude,
      longitude: address.longitude,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: openingHours.days,
        opens: openingHours.opens,
        closes: openingHours.closes,
      },
    ],
    sameAs: [contact.instagram.url],
    makesOffer: offers.map(({ schema }) => ({
      '@type': 'Offer',
      itemOffered: { '@type': 'Service', name: schema.name, serviceType: schema.serviceType },
      ...(schema.description && { description: schema.description }),
    })),
  };

  const faqPage = {
    '@type': 'FAQPage',
    '@id': id('faq'),
    mainEntity: faq.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: stripTags(answer) },
    })),
  };

  const person = {
    '@type': 'Person',
    '@id': id('faruk'),
    name: owner.name,
    jobTitle: owner.jobTitle,
    knowsLanguage: owner.languages,
    worksFor: { '@id': id('business') },
    knowsAbout: owner.expertise,
  };

  const website = {
    '@type': 'WebSite',
    '@id': id('website'),
    url: `${site.url}/`,
    name: site.name,
    inLanguage: 'de-DE',
    publisher: { '@id': id('business') },
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [localBusiness, faqPage, person, website],
  };
}
