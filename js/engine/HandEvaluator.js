import { RANKS } from '../utils/constants.js';

// Нормализует две карты в строку: "AKs", "AKo", "AA"
// Вход: ["As","Kh"] или ["7d","7c"]
export function normalizeHand(card1, card2) {
  const rank1 = card1[0];
  const rank2 = card2[0];
  const suit1 = card1.slice(1);
  const suit2 = card2.slice(1);

  // Сортируем по убыванию ранга
  const r1idx = RANKS.indexOf(rank1);
  const r2idx = RANKS.indexOf(rank2);

  let high, low, highSuit, lowSuit;
  if (r1idx <= r2idx) {
    [high, low, highSuit, lowSuit] = [rank1, rank2, suit1, suit2];
  } else {
    [high, low, highSuit, lowSuit] = [rank2, rank1, suit2, suit1];
  }

  if (high === low) return `${high}${low}`; // пара: "AA"
  const suited = highSuit === lowSuit ? 's' : 'o';
  return `${high}${low}${suited}`;           // "AKs" или "AKo"
}

// Генерирует полную колоду 52 карты
export function buildDeck() {
  const ranks = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
  const suits = ['s','h','d','c'];
  const deck = [];
  for (const r of ranks) for (const s of suits) deck.push(r + s);
  return deck;
}
