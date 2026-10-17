/**
 * Links with data-interest (offer cards, price buttons) lead to the
 * contact form and note the chosen offer above the message field. It is
 * sent as its own field (`interesse`), so the message stays free for the
 * visitor's own words and Faruk sees the offer in the mail's subject.
 */
export function initInterestLinks() {
  const input = document.getElementById('f-interest');
  const chip = document.getElementById('interestChip');
  const label = document.getElementById('interestLabel');
  if (!input || !chip || !label) return;

  const choose = (value) => {
    input.value = value;
    label.textContent = value;
    chip.hidden = !value;
  };

  document.querySelectorAll('[data-interest]').forEach((link) => {
    link.addEventListener('click', () => choose(link.dataset.interest));
  });

  document.getElementById('interestClear')?.addEventListener('click', () => choose(''));
}
