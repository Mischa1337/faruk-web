/**
 * Ready-to-use contact links, derived from site.json so that phone number
 * and messages are maintained in exactly one place.
 */
import { readFileSync } from 'node:fs';

const site = JSON.parse(readFileSync(new URL('./site.json', import.meta.url), 'utf8'));
const { phone, email } = site.contact;

const whatsapp = (message) =>
  `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;

export default {
  phone: `tel:${phone}`,
  email: `mailto:${email}`,
  whatsapp: whatsapp(site.whatsappMessages.default),
  whatsappAfterForm: whatsapp(site.whatsappMessages.afterForm),
};
