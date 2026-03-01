import { RANKS } from '../utils/constants.js';

const RANKS_ORDER = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];

export function initRangeModal() {
  document.getElementById('range-modal-close').addEventListener('click', closeModal);
  document.getElementById('range-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
}

export function showRangeModal(situation, rangesData) {
  const { type, heroPos, villainPos, hand } = situation;

  let actionMap = {};
  let titleText = '';
  let noteText = '';

  if (type === 'openRaise') {
    const data = rangesData.openRaise[heroPos];
    const raiseSet = new Set(data?.raise || []);
    titleText = `Open raise · ${heroPos}`;
    noteText = data?.note || '';
    for (const h of allHands()) actionMap[h] = raiseSet.has(h) ? 'raise' : 'fold';

  } else if (type === 'vsRaise') {
    const key = `${heroPos}_vs_${villainPos}`;
    const data = rangesData.vsRaise[key];
    const threeBetSet = new Set(data?.threeBet || []);
    const callSet    = new Set(data?.call     || []);
    titleText = `${heroPos} vs рейз ${villainPos}`;
    noteText = data?.note || '';
    for (const h of allHands()) {
      actionMap[h] = threeBetSet.has(h) ? '3bet' : callSet.has(h) ? 'call' : 'fold';
    }

  } else if (type === 'vsLimp') {
    const key = `${heroPos}_vs_limp`;
    const data = rangesData.vsLimp[key];
    const isoSet  = new Set(data?.iso  || []);
    const callSet = new Set(data?.call || []);
    titleText = `${heroPos} vs лимп`;
    noteText = data?.note || '';
    for (const h of allHands()) {
      actionMap[h] = isoSet.has(h) ? 'raise' : callSet.has(h) ? 'call' : 'fold';
    }

  } else if (type === 'vs3Bet') {
    const key = `${heroPos}_vs_${villainPos}`;
    const data = rangesData.vs3Bet[key];
    const fourBetSet = new Set(data?.fourBet || []);
    const callSet    = new Set(data?.call    || []);
    titleText = `${heroPos} vs 3-бет ${villainPos}`;
    noteText = data?.note || '';
    for (const h of allHands()) {
      actionMap[h] = fourBetSet.has(h) ? 'raise' : callSet.has(h) ? 'call' : 'fold';
    }

  } else if (type === 'vs4Bet') {
    const key = `${heroPos}_vs_${villainPos}`;
    const data = rangesData.vs4Bet[key];
    const jamSet  = new Set(data?.jam  || []);
    const callSet = new Set(data?.call || []);
    titleText = `${heroPos} vs 4-бет ${villainPos}`;
    noteText = data?.note || '';
    for (const h of allHands()) {
      actionMap[h] = jamSet.has(h) ? 'raise' : callSet.has(h) ? 'call' : 'fold';
    }
  }

  document.getElementById('range-modal-title').textContent = titleText;
  document.getElementById('range-modal-note').textContent  = noteText;

  const raiseLabel = document.querySelector('.leg.leg-raise');
  if (raiseLabel) {
    if (type === 'vs3Bet') raiseLabel.textContent = '4-Bet';
    else if (type === 'vs4Bet') raiseLabel.textContent = 'Jam / 5-Bet';
    else raiseLabel.textContent = 'Raise / 3-Bet';
  }

  renderGrid(actionMap, hand.normalized);
  document.getElementById('range-modal').classList.remove('hidden');
}

function renderGrid(actionMap, currentHand) {
  const grid = document.getElementById('range-grid');
  grid.innerHTML = '';

  // corner
  grid.appendChild(cell('', 'rg-corner'));
  // column headers
  for (const r of RANKS_ORDER) grid.appendChild(cell(r, 'rg-header'));

  for (let i = 0; i < RANKS_ORDER.length; i++) {
    // row header
    grid.appendChild(cell(RANKS_ORDER[i], 'rg-header'));

    for (let j = 0; j < RANKS_ORDER.length; j++) {
      let hand;
      if (i === j)      hand = RANKS_ORDER[i] + RANKS_ORDER[i];
      else if (i < j)   hand = RANKS_ORDER[i] + RANKS_ORDER[j] + 's';
      else              hand = RANKS_ORDER[j] + RANKS_ORDER[i] + 'o';

      const action  = actionMap[hand] || 'fold';
      const isCurrent = hand === currentHand;
      const el = cell(hand, `rg-cell rg-${action}${isCurrent ? ' rg-current' : ''}`);
      grid.appendChild(el);
    }
  }
}

function cell(text, className) {
  const el = document.createElement('div');
  el.className = className;
  el.textContent = text;
  return el;
}

function allHands() {
  const result = [];
  for (let i = 0; i < RANKS_ORDER.length; i++)
    for (let j = 0; j < RANKS_ORDER.length; j++) {
      if (i === j)    result.push(RANKS_ORDER[i] + RANKS_ORDER[i]);
      else if (i < j) result.push(RANKS_ORDER[i] + RANKS_ORDER[j] + 's');
      else            result.push(RANKS_ORDER[j] + RANKS_ORDER[i] + 'o');
    }
  return result;
}

function closeModal() {
  document.getElementById('range-modal').classList.add('hidden');
}
