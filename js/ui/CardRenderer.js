import { SUIT_SYMBOLS, SUIT_COLORS } from '../utils/constants.js';

// Рендерит две карты героя в DOM
export function renderHand(hand) {
  renderCard('card1', hand.card1);
  renderCard('card2', hand.card2);

  // Нормализованная строка (AKs, TT и т.д.)
  document.getElementById('hand-normalized').textContent = hand.normalized;
}

function renderCard(id, card) {
  const el = document.getElementById(id);
  const rank = card[0];
  const suit = card.slice(1);
  const symbol = SUIT_SYMBOLS[suit] || suit;
  const color  = SUIT_COLORS[suit] === 'red' ? 'red' : 'black';

  el.className = `card ${color}`;
  el.innerHTML = `
    <span class="rank">${rank === 'T' ? '10' : rank}</span>
    <span class="suit">${symbol}</span>
  `;
}
