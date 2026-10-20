/**
 * Data of every page in the page's language (`lang`, see lang.js).
 *
 * The data files hold their texts in all languages ({ "de": …, "en": … },
 * config/i18n.js). Here they are resolved once per page under their usual
 * names, so templates simply write {{ site.tagline }} or {{ offer.title }}
 * and never deal with languages themselves.
 */
import { LANGUAGES, homeAlternates, localize } from '../../config/i18n.js';

const localized = (key) => (data) => localize(data[key], data.lang, key);

const whatsappLink = (phone, message) =>
  `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;

export default {
  site: localized('site'),
  navigation: localized('navigation'),
  text: localized('text'),
  offers: localized('offers'),
  philosophy: localized('philosophy'),
  pricing: localized('pricing'),
  faq: localized('faq'),
  partners: localized('partners'),

  locale: (data) => LANGUAGES[data.lang].locale,

  /** The home page in every language (hreflang links, language switch); none for other pages. */
  alternates: (data) => (data.isHome ? homeAlternates() : []),

  /**
   * Ready-to-use contact links, so phone number and messages live only in
   * site.json. Reads the values one by one: Eleventy first calls computed
   * data with placeholder objects to find out what they depend on.
   */
  contactLinks: ({ site, lang }) => {
    const { phone, email } = site.contact;
    const message = (key) => localize(site.whatsappMessages[key], lang);
    return {
      phone: `tel:${phone}`,
      email: `mailto:${email}`,
      whatsapp: whatsappLink(phone, message('default')),
      whatsappAfterForm: whatsappLink(phone, message('afterForm')),
    };
  },
};
