import { ACTIVE_POSITIONS, PREFLOP_ORDER } from '../utils/constants.js';
import { shuffle, pick, randInt } from '../utils/random.js';
import { normalizeHand, buildDeck } from './HandEvaluator.js';

// Генерирует случайную ситуацию для тренажёра
// filters: { tableSize: 'random'|4..9, heroPos: 'random'|'BTN'|... }
export function generateSituation(rangesData, filters = {}) {
  const tableSizePref = filters.tableSize && filters.tableSize !== 'random' ? Number(filters.tableSize) : null;
  const heroPosPref   = filters.heroPos   && filters.heroPos   !== 'random' ? filters.heroPos   : null;

  const numPlayers  = tableSizePref || randInt(4, 9);
  const activePosArr = ACTIVE_POSITIONS[numPlayers];

  const pool = buildTypePool(rangesData, activePosArr, heroPosPref);

  if (!pool.length) {
    // Несовместимая комбинация позиции и стола — пробуем с рандомным столом
    return generateSituation(rangesData, { tableSize: 'random', heroPos: filters.heroPos });
  }

  const type = pick(pool);
  if (type === 'openRaise') return genOpenRaise(numPlayers, activePosArr, rangesData, heroPosPref);
  if (type === 'vsRaise')   return genVsRaise(numPlayers, activePosArr, rangesData, heroPosPref);
  if (type === 'vsLimp')    return genVsLimp(numPlayers, activePosArr, rangesData, heroPosPref);
}

function buildTypePool(rangesData, activePosArr, heroPos) {
  const pool = [];

  // openRaise: valid если heroPos в rangesData.openRaise и за этим столом
  const canOpenRaise = !heroPos
    || (rangesData.openRaise[heroPos] && activePosArr.includes(heroPos));
  if (canOpenRaise) pool.push('openRaise', 'openRaise', 'openRaise');

  // vsRaise: valid если есть хоть один matchup с этим heroPos за этим столом
  const hasVsRaise = Object.values(rangesData.vsRaise).some(d =>
    activePosArr.includes(d.heroPos) && activePosArr.includes(d.raiserPos) &&
    (!heroPos || d.heroPos === heroPos)
  );
  if (hasVsRaise) pool.push('vsRaise', 'vsRaise');

  // vsLimp: valid если есть хоть одна запись для этого heroPos за этим столом
  const hasVsLimp = Object.keys(rangesData.vsLimp).some(key => {
    const pos = key.split('_vs_')[0];
    return activePosArr.includes(pos) && (!heroPos || pos === heroPos);
  });
  if (hasVsLimp) pool.push('vsLimp');

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
  return '';
}
