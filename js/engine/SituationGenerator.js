import { ACTIVE_POSITIONS, PREFLOP_ORDER } from '../utils/constants.js';
import { shuffle, pick, randInt } from '../utils/random.js';
import { normalizeHand, buildDeck } from './HandEvaluator.js';

// Генерирует случайную ситуацию для тренажёра
export function generateSituation(rangesData) {
  const numPlayers = randInt(4, 9);
  const activePosArr = ACTIVE_POSITIONS[numPlayers];

  // Выбираем тип сценария с весами
  const scenarioTypes = ['openRaise','openRaise','openRaise','vsRaise','vsRaise','vsLimp'];
  const type = pick(scenarioTypes);

  if (type === 'openRaise') return genOpenRaise(numPlayers, activePosArr, rangesData);
  if (type === 'vsRaise')   return genVsRaise(numPlayers, activePosArr, rangesData);
  if (type === 'vsLimp')    return genVsLimp(numPlayers, activePosArr, rangesData);
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

function genOpenRaise(numPlayers, activePosArr, rangesData) {
  // Позиции, для которых есть openRaise диапазон, и которые есть за столом
  const validPositions = Object.keys(rangesData.openRaise).filter(p => activePosArr.includes(p));
  if (!validPositions.length) return genOpenRaise(randInt(4,9), ACTIVE_POSITIONS[randInt(4,9)], rangesData);

  const heroPos = pick(validPositions);
  const hand = dealHand();

  // История действий: все до героя сфолдили
  const heroIdx = PREFLOP_ORDER.indexOf(heroPos);
  const actionHistory = PREFLOP_ORDER
    .filter(p => activePosArr.includes(p))
    .filter(p => PREFLOP_ORDER.indexOf(p) < heroIdx)
    .map(p => ({ position: p, action: 'fold' }));

  return {
    type: 'openRaise',
    numPlayers,
    heroPos,
    hand,
    actionHistory,
    villainPos: null,
    availableActions: ['fold', 'raise'],
    description: buildDescription('openRaise', heroPos, null, actionHistory)
  };
}

function genVsRaise(numPlayers, activePosArr, rangesData) {
  // Берём ключи vsRaise, у которых обе позиции есть за столом
  const validKeys = Object.keys(rangesData.vsRaise).filter(key => {
    const [hero, , villain] = key.split('_vs_');
    return activePosArr.includes(hero) && activePosArr.includes(villain);
  });

  if (!validKeys.length) return genOpenRaise(numPlayers, activePosArr, rangesData);

  const key = pick(validKeys);
  const data = rangesData.vsRaise[key];
  const heroPos = data.heroPos;
  const villainPos = data.raiserPos;
  const hand = dealHand();

  // Строим историю: все до рейзера фолдят, рейзер рейзит, между рейзером и героем фолдят
  const heroIdx    = PREFLOP_ORDER.indexOf(heroPos);
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
    heroPos,
    hand,
    actionHistory,
    villainPos,
    availableActions: ['fold', 'call', '3bet'],
    description: buildDescription('vsRaise', heroPos, villainPos, actionHistory)
  };
}

function genVsLimp(numPlayers, activePosArr, rangesData) {
  const validKeys = Object.keys(rangesData.vsLimp).filter(key => {
    const heroPos = key.split('_vs_')[0];
    return activePosArr.includes(heroPos);
  });

  if (!validKeys.length) return genOpenRaise(numPlayers, activePosArr, rangesData);

  const key = pick(validKeys);
  const heroPos = key.split('_vs_')[0];
  const hand = dealHand();

  const heroIdx = PREFLOP_ORDER.indexOf(heroPos);

  // Выбираем лимпера — кто-то до героя (не блайнды)
  const beforeHero = PREFLOP_ORDER
    .filter(p => activePosArr.includes(p) && PREFLOP_ORDER.indexOf(p) < heroIdx && p !== 'SB' && p !== 'BB');

  if (!beforeHero.length) return genOpenRaise(numPlayers, activePosArr, rangesData);

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
    heroPos,
    hand,
    actionHistory,
    villainPos,
    availableActions: ['fold', 'call', 'raise'],
    description: buildDescription('vsLimp', heroPos, villainPos, actionHistory)
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
