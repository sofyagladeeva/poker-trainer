import { loadRanges, evaluate } from './engine/RangeEngine.js';
import { generateSituation } from './engine/SituationGenerator.js';
import { renderTable } from './ui/TableRenderer.js';
import { renderHand } from './ui/CardRenderer.js';
import { showFeedback, hideFeedback, setActionsVisible, disableActions } from './ui/FeedbackPanel.js';
import { record, reset, render as renderStats } from './ui/SessionTracker.js';
import { initGlossary } from './ui/GlossaryPopup.js';
import { initRangeModal, showRangeModal } from './ui/RangeGrid.js?v=2';
import { ACTIVE_POSITIONS } from './utils/constants.js';

let rangesData = null;
let currentSituation = null;
let trainingSettings = { tableSize: 'random', heroPos: 'random' };

// === Настройки ===

function showSettingsScreen() {
  document.getElementById('settings-screen').classList.remove('hidden');
  document.getElementById('training-screen').classList.add('hidden');
}

function showTrainingScreen() {
  document.getElementById('settings-screen').classList.add('hidden');
  document.getElementById('training-screen').classList.remove('hidden');
}

// Обновляет доступность чипов позиций при смене размера стола
function updatePositionChips(tableSize) {
  const activePosArr = tableSize === 'random'
    ? null
    : ACTIVE_POSITIONS[Number(tableSize)];

  document.querySelectorAll('#chips-pos .chip').forEach(chip => {
    const val = chip.dataset.val;
    if (val === 'random') { chip.disabled = false; return; }
    const available = !activePosArr || activePosArr.includes(val);
    chip.disabled = !available;
    if (!available && chip.classList.contains('active')) {
      chip.classList.remove('active');
      document.querySelector('#chips-pos .chip[data-val="random"]').classList.add('active');
      trainingSettings.heroPos = 'random';
    }
  });
}

function initSettingsUI() {
  trainingSettings = { tableSize: 'random', heroPos: 'random' };

  // Предзаполнить чипы стола
  document.querySelectorAll('#chips-table .chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.val === String(trainingSettings.tableSize));
    chip.addEventListener('click', () => {
      document.querySelectorAll('#chips-table .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      trainingSettings.tableSize = chip.dataset.val === 'random' ? 'random' : Number(chip.dataset.val);
      updatePositionChips(chip.dataset.val);
    });
  });

  // Предзаполнить чипы позиций
  updatePositionChips(String(trainingSettings.tableSize));
  document.querySelectorAll('#chips-pos .chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.val === trainingSettings.heroPos);
    chip.addEventListener('click', () => {
      if (chip.disabled) return;
      document.querySelectorAll('#chips-pos .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      trainingSettings.heroPos = chip.dataset.val;
    });
  });

  // Кнопка старта
  document.getElementById('btn-start').addEventListener('click', () => {
    reset();
    showTrainingScreen();
    nextHand();
  });

  // Кнопка настроек во время тренировки
  document.getElementById('btn-settings').addEventListener('click', showSettingsScreen);
}

// === Тренировка ===

document.querySelectorAll('.action-btn').forEach(btn => {
  btn.addEventListener('click', () => onAction(btn.dataset.action));
});
document.getElementById('btn-next').addEventListener('click', nextHand);
document.getElementById('btn-reset').addEventListener('click', () => { reset(); nextHand(); });
document.getElementById('btn-hint').addEventListener('click', () => {
  if (currentSituation && rangesData) showRangeModal(currentSituation, rangesData);
});

async function init() {
  rangesData = await loadRanges();
  await initGlossary();
  initRangeModal();
  renderStats();
  initSettingsUI();
  showSettingsScreen();
}

function nextHand() {
  if (!rangesData) return;
  try {
    hideFeedback();
    currentSituation = generateSituation(rangesData, trainingSettings);
    renderTable(currentSituation);
    renderHand(currentSituation.hand);
    document.getElementById('situation-text').innerHTML = buildSituationHTML(currentSituation);
    const visibleActions = {
      openRaise: ['fold', 'call', 'raise'],
      vsRaise:   ['fold', 'call', '3bet'],
      vsLimp:    ['fold', 'call', 'raise'],
      vs3Bet:    ['fold', 'call', '3bet'],
      vs4Bet:    ['fold', 'call', '3bet']
    }[currentSituation.type] || ['fold','call','raise','3bet'];
    setActionsVisible(visibleActions);

    const callBtn = document.getElementById('btn-call');
    if (currentSituation.type === 'vsLimp' && currentSituation.heroPos === 'BB') {
      callBtn.textContent = 'Чек (Call)';
    } else {
      callBtn.textContent = 'Call';
    }

    const threeBetBtn = document.getElementById('btn-3bet');
    if (currentSituation.type === 'vs3Bet') {
      threeBetBtn.textContent = '4-Bet';
      threeBetBtn.dataset.action = '4bet';
    } else if (currentSituation.type === 'vs4Bet') {
      threeBetBtn.textContent = 'Jam';
      threeBetBtn.dataset.action = 'jam';
    } else {
      threeBetBtn.textContent = '3-Bet';
      threeBetBtn.dataset.action = '3bet';
    }
  } catch (e) {
    console.error('nextHand error:', e);
    nextHand();
  }
}

function onAction(action) {
  if (!currentSituation) return;
  disableActions();
  const result = evaluate(currentSituation, action);
  record(result.correct);
  showFeedback(result, action);
}

function buildSituationHTML(sit) {
  const posLink = (p) => `<span data-term="${p.toLowerCase()}">${p}</span>`;
  if (sit.type === 'openRaise') {
    return `Все до тебя сфолдили. Твоя очередь открыться с <strong>${posLink(sit.heroPos)}</strong>.`;
  }
  if (sit.type === 'vsRaise') {
    return `<strong>${posLink(sit.villainPos)}</strong> сделал <span data-term="open-raise">рейз</span> (2.5BB). Все остальные сфолдили. Ты на <strong>${posLink(sit.heroPos)}</strong>. Твоё действие?`;
  }
  if (sit.type === 'vsLimp') {
    return `<strong>${posLink(sit.villainPos)}</strong> <span data-term="limp">залимпил</span> (1BB). Все остальные сфолдили. Ты на <strong>${posLink(sit.heroPos)}</strong>. Что делаешь?`;
  }
  if (sit.type === 'vs3Bet') {
    return `Ты сделала <span data-term="open-raise">рейз</span> с <strong>${posLink(sit.heroPos)}</strong>. <strong>${posLink(sit.villainPos)}</strong> сделал <span data-term="3bet">3-бет</span> (7.5BB). Все остальные сфолдили. Твоё действие?`;
  }
  if (sit.type === 'vs4Bet') {
    return `Ты сделала <span data-term="3bet">3-бет</span> с <strong>${posLink(sit.heroPos)}</strong>. <strong>${posLink(sit.villainPos)}</strong> ответил <strong>4-бетом</strong> (20BB). Все сфолдили. Джэм, колл или фолд?`;
  }
  return sit.description || '';
}

init();
