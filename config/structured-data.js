/**
 * Builds the schema.org graph (JSON-LD) of a home page from the content
 * data files: business with priced offers, FAQ, person and website.
 *
 * Prices come from pricing.json – the same data as the price cards – so
 * search engines and AI assistants always see the current prices.
 *
 * The data arrives already in the page's language. Every language version
 * describes its own graph (ids below its own URL, e.g. /en/#business), so
 * German and English texts never get mixed up in one entity.
 */
export function buildStructuredData(
  { site, offers, pricing, faq, pageUrl = '/', locale = 'de_DE' },
  { stripTags, fill },
) {
  const id = (fragment) => `${site.url}${pageUrl}#${fragment}`;
  const url = (path) => `${site.url}${path}`;
  const { address, contact, openingHours, owner, business } = site;

  const services = new Map(
    offers.map(({ id: offerId, schema }) => [
      offerId,
      {
        '@type': 'Service',
        '@id': id(`service-${offerId}`),
        name: schema.name,
        serviceType: schema.serviceType,
        ...(schema.description && { description: schema.description }),
        provider: { '@id': id('business') },
      },
    ]),
  );

  const serviceFor = (offerId) => {
    const service = services.get(offerId);
    if (!service) throw new Error(`pricing.json refers to unknown offer "${offerId}"`);
    return service;
  };

  const pricedOffer = (offerId, name, amount, extra = {}) => ({
    '@type': 'Offer',
    name,
    price: amount,
    priceCurrency: 'EUR',
    itemOffered: serviceFor(offerId),
    ...extra,
  });

  // One offer per price: every duration of every plan, the monthly coaching and the duo session
  const priced = [
    ...pricing.plans.flatMap((plan) =>
      plan.rates
        ? plan.rates.map((rate) =>
            pricedOffer(plan.offer, `${plan.name} – ${rate.duration}`, rate.amount),
          )
        : [
            pricedOffer(plan.offer, plan.name, plan.price.amount, {
              priceSpecification: {
                '@type': 'UnitPriceSpecification',
                price: plan.price.amount,
                priceCurrency: 'EUR',
                referenceQuantity: {
                  '@type': 'QuantitativeValue',
                  value: 1,
                  unitCode: plan.price.unitCode,
                },
              },
            }),
          ],
    ),
    pricedOffer(pricing.duo.offer, fill(pricing.duo.schemaName, pricing.duo), pricing.duo.amount),
  ];

  // Services without a fixed price (e.g. nutrition coaching) are still listed, price on request
  const pricedIds = new Set([...pricing.plans.map((plan) => plan.offer), pricing.duo.offer]);
  const onRequest = [...services]
    .filter(([offerId]) => !pricedIds.has(offerId))
    .map(([, service]) => ({ '@type': 'Offer', itemOffered: service }));

  const localBusiness = {
    '@type': ['LocalBusiness', 'SportsActivityLocation'],
    '@id': id('business'),
    name: site.name,
    description: business.description,
    url: url(pageUrl),
    telephone: contact.phone,
    email: contact.email,
    image: url(site.ogImage),
    logo: url(site.logo),
    founder: { '@id': id('faruk') },
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
    // Towns for training on site – the same list as the service area in the
    // Google Business Profile (site.json → serviceArea); online coaching is not tied to a place
    areaServed: site.serviceArea.map((name) => ({ '@type': 'City', name })),
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
    makesOffer: [...priced, ...onRequest],
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
    image: url(owner.photo),
    sameAs: [contact.instagram.url],
    knowsLanguage: owner.languages,
    worksFor: { '@id': id('business') },
    knowsAbout: owner.expertise,
    hasCredential: owner.credentials.map((name) => ({
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: owner.credentialCategory,
      name,
    })),
  };

  const website = {
    '@type': 'WebSite',
    '@id': id('website'),
    url: url(pageUrl),
    name: site.name,
    inLanguage: locale.replace('_', '-'),
    publisher: { '@id': id('business') },
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [localBusiness, faqPage, person, website],
  };
}
