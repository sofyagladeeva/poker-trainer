import { ACTIVE_POSITIONS, PREFLOP_ORDER } from '../utils/constants.js';
import { shuffle, pick, randInt } from '../utils/random.js';
import { normalizeHand, buildDeck } from './HandEvaluator.js';

// Маппинг пресета ситуации → разрешённые типы
const SITUATION_TYPE_MAP = {
  random:        ['openRaise', 'vsRaise', 'vs3Bet', 'vs4Bet'],
  openRaise:     ['openRaise'],
  vsRaise:       ['vsRaise'],
  vsLimp:        ['vsLimp'],
  aggression34:  ['vs3Bet', 'vs4Bet'],
  allAggression: ['vsRaise', 'vs3Bet', 'vs4Bet'],
};

// Генерирует случайную ситуацию для тренажёра
// filters: { tableSize: 'random'|4..9, heroPos: 'random'|'BTN'|..., situationType: 'random'|'openRaise'|... }
export function generateSituation(rangesData, filters = {}) {
  const tableSizePref = filters.tableSize && filters.tableSize !== 'random' ? Number(filters.tableSize) : null;
  const heroPosPref   = filters.heroPos   && filters.heroPos   !== 'random' ? filters.heroPos   : null;
  const allowedTypes  = SITUATION_TYPE_MAP[filters.situationType] || SITUATION_TYPE_MAP.random;

  const numPlayers  = tableSizePref || randInt(4, 9);
  const activePosArr = ACTIVE_POSITIONS[numPlayers];

  const pool = buildTypePool(rangesData, activePosArr, heroPosPref, allowedTypes);

  if (!pool.length) {
    // Несовместимая комбинация — пробуем с рандомным столом
    return generateSituation(rangesData, { tableSize: 'random', heroPos: filters.heroPos, situationType: filters.situationType });
  }

  const type = pick(pool);
  if (type === 'openRaise') return genOpenRaise(numPlayers, activePosArr, rangesData, heroPosPref);
  if (type === 'vsRaise')   return genVsRaise(numPlayers, activePosArr, rangesData, heroPosPref);
  if (type === 'vsLimp')    return genVsLimp(numPlayers, activePosArr, rangesData, heroPosPref);
  if (type === 'vs3Bet')    return genVs3Bet(numPlayers, activePosArr, rangesData, heroPosPref);
  if (type === 'vs4Bet')    return genVs4Bet(numPlayers, activePosArr, rangesData, heroPosPref);
}

function buildTypePool(rangesData, activePosArr, heroPos, allowedTypes = ['openRaise', 'vsRaise', 'vsLimp', 'vs3Bet', 'vs4Bet']) {
  const allow = new Set(allowedTypes);
  const pool = [];

  if (allow.has('openRaise')) {
    const canOpenRaise = !heroPos
      || (rangesData.openRaise[heroPos] && activePosArr.includes(heroPos));
    if (canOpenRaise) pool.push('openRaise', 'openRaise', 'openRaise');
  }

  if (allow.has('vsRaise')) {
    const hasVsRaise = Object.values(rangesData.vsRaise).some(d =>
      activePosArr.includes(d.heroPos) && activePosArr.includes(d.raiserPos) &&
      (!heroPos || d.heroPos === heroPos)
    );
    if (hasVsRaise) pool.push('vsRaise', 'vsRaise');
  }

  if (allow.has('vsLimp')) {
    const hasVsLimp = Object.keys(rangesData.vsLimp).some(key => {
      const pos = key.split('_vs_')[0];
      return activePosArr.includes(pos) && (!heroPos || pos === heroPos);
    });
    if (hasVsLimp) pool.push('vsLimp');
  }

  if (allow.has('vs3Bet')) {
    const hasVs3Bet = Object.values(rangesData.vs3Bet).some(d =>
      activePosArr.includes(d.heroPos) && activePosArr.includes(d.threeBetterPos) &&
      (!heroPos || d.heroPos === heroPos)
    );
    if (hasVs3Bet) pool.push('vs3Bet');
  }

  if (allow.has('vs4Bet')) {
    const hasVs4Bet = Object.values(rangesData.vs4Bet).some(d =>
      activePosArr.includes(d.heroPos) && activePosArr.includes(d.fourBetterPos) &&
      (!heroPos || d.heroPos === heroPos)
    );
    if (hasVs4Bet) pool.push('vs4Bet');
  }

  return pool;
}

function dealHand() {
  const deck = shuffle(buildDeck());
  const card1 = deck[0];
  const card2 = deck[1];
  return {
    card1,
    card2,
    normalized: normalizeHand(card1, card2)
  };
}

// Раздаёт руку, которая входит в указанный диапазон
function dealHandFrom(range) {
  if (!range || !range.length) return dealHand();
  const rangeSet = new Set(range);
  for (let i = 0; i < 200; i++) {
    const hand = dealHand();
    if (rangeSet.has(hand.normalized)) return hand;
  }
  return dealHand(); // запасной вариант
}

function genOpenRaise(numPlayers, activePosArr, rangesData, heroPos) {
  let validPositions = Object.keys(rangesData.openRaise).filter(p => activePosArr.includes(p));
  if (heroPos) validPositions = validPositions.filter(p => p === heroPos);
  if (!validPositions.length) return genOpenRaise(randInt(4,9), ACTIVE_POSITIONS[randInt(4,9)], rangesData, heroPos);

  const pickedHeroPos = pick(validPositions);
  const hand = dealHand();

  const heroIdx = PREFLOP_ORDER.indexOf(pickedHeroPos);
  const actionHistory = PREFLOP_ORDER
    .filter(p => activePosArr.includes(p))
    .filter(p => PREFLOP_ORDER.indexOf(p) < heroIdx)
    .map(p => ({ position: p, action: 'fold' }));

  return {
    type: 'openRaise',
    numPlayers,
    heroPos: pickedHeroPos,
    hand,
    actionHistory,
    villainPos: null,
    availableActions: ['fold', 'raise'],
    description: buildDescription('openRaise', pickedHeroPos, null, actionHistory)
  };
}

function genVsRaise(numPlayers, activePosArr, rangesData, heroPos) {
  let validKeys = Object.keys(rangesData.vsRaise).filter(key => {
    const data = rangesData.vsRaise[key];
    return activePosArr.includes(data.heroPos) && activePosArr.includes(data.raiserPos) &&
      (!heroPos || data.heroPos === heroPos);
  });

  if (!validKeys.length) return genOpenRaise(numPlayers, activePosArr, rangesData, heroPos);

  const key = pick(validKeys);
  const data = rangesData.vsRaise[key];
  const pickedHeroPos = data.heroPos;
  const villainPos = data.raiserPos;
  const hand = dealHand();

  const heroIdx    = PREFLOP_ORDER.indexOf(pickedHeroPos);
  const villainIdx = PREFLOP_ORDER.indexOf(villainPos);

  const actionHistory = PREFLOP_ORDER
    .filter(p => activePosArr.includes(p))
    .filter(p => PREFLOP_ORDER.indexOf(p) < heroIdx)
    .map(p => {
      if (p === villainPos) return { position: p, action: 'raise', amount: 2.5 };
      return { position: p, action: 'fold' };
    });

  return {
    type: 'vsRaise',
    numPlayers,
    heroPos: pickedHeroPos,
    hand,
    actionHistory,
    villainPos,
    availableActions: ['fold', 'call', '3bet'],
    description: buildDescription('vsRaise', pickedHeroPos, villainPos, actionHistory)
  };
}

function genVsLimp(numPlayers, activePosArr, rangesData, heroPos) {
  let validKeys = Object.keys(rangesData.vsLimp).filter(key => {
    const pos = key.split('_vs_')[0];
    return activePosArr.includes(pos) && (!heroPos || pos === heroPos);
  });

  if (!validKeys.length) return genOpenRaise(numPlayers, activePosArr, rangesData, heroPos);

  const key = pick(validKeys);
  const pickedHeroPos = key.split('_vs_')[0];
  const hand = dealHand();

  const heroIdx = PREFLOP_ORDER.indexOf(pickedHeroPos);

  const beforeHero = PREFLOP_ORDER
    .filter(p => activePosArr.includes(p) && PREFLOP_ORDER.indexOf(p) < heroIdx && p !== 'SB' && p !== 'BB');

  if (!beforeHero.length) return genOpenRaise(numPlayers, activePosArr, rangesData, heroPos);

  const limperPos = pick(beforeHero);
  const villainPos = limperPos;

  const actionHistory = PREFLOP_ORDER
    .filter(p => activePosArr.includes(p))
    .filter(p => PREFLOP_ORDER.indexOf(p) < heroIdx)
    .map(p => {
      if (p === limperPos) return { position: p, action: 'limp', amount: 1 };
      if (PREFLOP_ORDER.indexOf(p) < PREFLOP_ORDER.indexOf(limperPos)) return { position: p, action: 'fold' };
      return { position: p, action: 'fold' };
    });

  return {
    type: 'vsLimp',
    numPlayers,
    heroPos: pickedHeroPos,
    hand,
    actionHistory,
    villainPos,
    availableActions: ['fold', 'call', 'raise'],
    description: buildDescription('vsLimp', pickedHeroPos, villainPos, actionHistory)
  };
}

function genVs3Bet(numPlayers, activePosArr, rangesData, heroPos) {
  let validKeys = Object.keys(rangesData.vs3Bet).filter(key => {
    const d = rangesData.vs3Bet[key];
    return activePosArr.includes(d.heroPos) && activePosArr.includes(d.threeBetterPos) &&
      (!heroPos || d.heroPos === heroPos);
  });

  if (!validKeys.length) return genOpenRaise(numPlayers, activePosArr, rangesData, heroPos);

  const key = pick(validKeys);
  const data = rangesData.vs3Bet[key];
  const pickedHeroPos = data.heroPos;
  const threeBetterPos = data.threeBetterPos;
  // Раздаём только руки из диапазона открытия героя — BTN не мог открыться с мусором
  const hand = dealHandFrom(rangesData.openRaise[pickedHeroPos]?.raise || []);

  const heroIdx       = PREFLOP_ORDER.indexOf(pickedHeroPos);
  const threeBetterIdx = PREFLOP_ORDER.indexOf(threeBetterPos);

  // Build action history: folds before hero → hero raises → folds between → villain 3-bets
  const actionHistory = [];
  PREFLOP_ORDER
    .filter(p => activePosArr.includes(p) && PREFLOP_ORDER.indexOf(p) < heroIdx)
    .forEach(p => actionHistory.push({ position: p, action: 'fold' }));
  actionHistory.push({ position: pickedHeroPos, action: 'raise', amount: 2.5 });
  PREFLOP_ORDER
    .filter(p => activePosArr.includes(p))
    .filter(p => PREFLOP_ORDER.indexOf(p) > heroIdx && PREFLOP_ORDER.indexOf(p) < threeBetterIdx)
    .forEach(p => actionHistory.push({ position: p, action: 'fold' }));
  actionHistory.push({ position: threeBetterPos, action: '3bet', amount: 7.5 });

  return {
    type: 'vs3Bet',
    numPlayers,
    heroPos: pickedHeroPos,
    hand,
    actionHistory,
    villainPos: threeBetterPos,
    availableActions: ['fold', 'call', '4bet'],
    description: buildDescription('vs3Bet', pickedHeroPos, threeBetterPos, actionHistory)
  };
}

function genVs4Bet(numPlayers, activePosArr, rangesData, heroPos) {
  let validKeys = Object.keys(rangesData.vs4Bet).filter(key => {
    const d = rangesData.vs4Bet[key];
    return activePosArr.includes(d.heroPos) && activePosArr.includes(d.fourBetterPos) &&
      (!heroPos || d.heroPos === heroPos);
  });

  if (!validKeys.length) return genOpenRaise(numPlayers, activePosArr, rangesData, heroPos);

  const key = pick(validKeys);
  const data = rangesData.vs4Bet[key];
  const pickedHeroPos = data.heroPos;
  const fourBetterPos = data.fourBetterPos;
  // Раздаём только руки из 3-бет диапазона героя против данного оппонента
  const threeBetRange = rangesData.vsRaise[`${pickedHeroPos}_vs_${fourBetterPos}`]?.threeBet || [];
  const hand = dealHandFrom(threeBetRange);

  const heroIdx      = PREFLOP_ORDER.indexOf(pickedHeroPos);
  const fourBetterIdx = PREFLOP_ORDER.indexOf(fourBetterPos);

  // Build action history: folds → fourBetter raises → folds → hero 3-bets → folds → fourBetter 4-bets
  const actionHistory = [];
  PREFLOP_ORDER
    .filter(p => activePosArr.includes(p) && PREFLOP_ORDER.indexOf(p) < fourBetterIdx)
    .forEach(p => actionHistory.push({ position: p, action: 'fold' }));
  actionHistory.push({ position: fourBetterPos, action: 'raise', amount: 2.5 });
  PREFLOP_ORDER
    .filter(p => activePosArr.includes(p))
    .filter(p => PREFLOP_ORDER.indexOf(p) > fourBetterIdx && PREFLOP_ORDER.indexOf(p) < heroIdx)
    .forEach(p => actionHistory.push({ position: p, action: 'fold' }));
  actionHistory.push({ position: pickedHeroPos, action: '3bet', amount: 7.5 });
  actionHistory.push({ position: fourBetterPos, action: '4bet', amount: 20 });

  return {
    type: 'vs4Bet',
    numPlayers,
    heroPos: pickedHeroPos,
    hand,
    actionHistory,
    villainPos: fourBetterPos,
    availableActions: ['fold', 'call', 'jam'],
    description: buildDescription('vs4Bet', pickedHeroPos, fourBetterPos, actionHistory)
  };
}

function buildDescription(type, heroPos, villainPos, actionHistory) {
  if (type === 'openRaise') {
    return `Все до тебя сфолдили. Твоя очередь действовать с позиции ${heroPos}.`;
  }
  if (type === 'vsRaise') {
    return `${villainPos} сделал рейз (2.5BB), все остальные сфолдили. Ты на ${heroPos}.`;
  }
  if (type === 'vsLimp') {
    return `${villainPos} залимпил (1BB), все остальные сфолдили. Ты на ${heroPos}.`;
  }
  if (type === 'vs3Bet') {
    return `Ты рейзнула с ${heroPos}. ${villainPos} сделал 3-бет. Все сфолдили. Твоё действие?`;
  }
  if (type === 'vs4Bet') {
    return `Ты 3-бетила с ${heroPos}. ${villainPos} ответил 4-бетом. Твоё действие?`;
  }
  return '';
}
