export const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
export const SUITS = ['s','h','d','c']; // spades, hearts, diamonds, clubs
export const SUIT_SYMBOLS = { s: '♠', h: '♥', d: '♦', c: '♣' };
export const SUIT_COLORS   = { s: 'black', h: 'red', d: 'red', c: 'black' };

export const POSITIONS = ['UTG','UTG1','UTG2','LJ','HJ','CO','BTN','SB','BB'];

// Сколько игроков минимум нужно для позиции
export const POSITION_MIN_PLAYERS = {
  UTG: 4, UTG1: 5, UTG2: 6, LJ: 7, HJ: 5, CO: 4, BTN: 2, SB: 2, BB: 2
};

// Для стола: какие позиции активны при N игроках
export const ACTIVE_POSITIONS = {
  2:  ['BTN','BB'],
  3:  ['BTN','SB','BB'],
  4:  ['CO','BTN','SB','BB'],
  5:  ['HJ','CO','BTN','SB','BB'],
  6:  ['UTG','HJ','CO','BTN','SB','BB'],
  7:  ['UTG','UTG1','HJ','CO','BTN','SB','BB'],
  8:  ['UTG','UTG1','LJ','HJ','CO','BTN','SB','BB'],
  9:  ['UTG','UTG1','UTG2','LJ','HJ','CO','BTN','SB','BB'],
};

// Порядок действия на префлопе (UTG первый, BB последний)
export const PREFLOP_ORDER = ['UTG','UTG1','UTG2','LJ','HJ','CO','BTN','SB','BB'];

// Отображаемые имена позиций
export const POSITION_LABELS = {
  UTG: 'UTG', UTG1: 'UTG+1', UTG2: 'UTG+2',
  LJ: 'LJ', HJ: 'HJ', CO: 'CO', BTN: 'BTN', SB: 'SB', BB: 'BB'
};
