/**
 * Notes below the price cards. The Duo line is built from `pricing.duo`, so
 * the Duo price is maintained in one place and also feeds the structured
 * data.
 */
import { readFileSync } from 'node:fs';

const pricing = JSON.parse(readFileSync(new URL('./pricing.json', import.meta.url), 'utf8'));
const { duo } = pricing;

export default [
  `Duo-Training: ${duo.amount} € pro Person für eine extralange Einheit von ${duo.minutes} Minuten.`,
  ...pricing.footnotes,
];
