import { STRINGS } from './strings.js';

/** The script texts in the language of the current page (<html lang>), German as fallback. */
export const t = STRINGS[document.documentElement.lang] ?? STRINGS.de;
