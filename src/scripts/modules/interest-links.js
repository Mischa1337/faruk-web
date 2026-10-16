/**
 * Links with data-interest (offer cards, price buttons) lead to the
 * contact form and pre-fill the message with the chosen offer, as long
 * as the visitor has not typed anything yet.
 */
export function initInterestLinks() {
  const message = document.getElementById('f-msg');
  if (!message) return;

  document.querySelectorAll('[data-interest]').forEach((link) => {
    link.addEventListener('click', () => {
      if (message.value.trim() && !message.dataset.prefilled) return;
      message.value = `Ich interessiere mich für: ${link.dataset.interest}.\n\n`;
      message.dataset.prefilled = 'true';
    });
  });

  message.addEventListener('input', () => delete message.dataset.prefilled);
}
