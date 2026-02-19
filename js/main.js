import { loadRanges, evaluate } from './engine/RangeEngine.js';
import { generateSituation } from './engine/SituationGenerator.js';
import { renderTable } from './ui/TableRenderer.js';
import { renderHand } from './ui/CardRenderer.js';
import { showFeedback, hideFeedback, setActionsVisible, disableActions } from './ui/FeedbackPanel.js';
import { record, reset, render as renderStats } from './ui/SessionTracker.js';
import { initGlossary } from './ui/GlossaryPopup.js';
import { initRangeModal, showRangeModal } from './ui/RangeGrid.js';

let rangesData = null;
let currentSituation = null;

// Привязываем кнопки сразу
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
  nextHand();
}

function nextHand() {
  if (!rangesData) return;
  try {
    hideFeedback();
    currentSituation = generateSituation(rangesData);
    renderTable(currentSituation);
    renderHand(currentSituation.hand);
    document.getElementById('situation-text').innerHTML = buildSituationHTML(currentSituation);
    // Всегда показываем все 4 кнопки
    setActionsVisible(['fold','call','raise','3bet']);
    // BB vs limp: "call" = бесплатный чек
    const callBtn = document.getElementById('btn-call');
    if (currentSituation.type === 'vsLimp' && currentSituation.heroPos === 'BB') {
      callBtn.textContent = 'Чек (Call)';
    } else {
      callBtn.textContent = 'Call';
    }
  } catch (e) {
    console.error('nextHand error:', e);
    nextHand(); // retry once
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
  return sit.description || '';
}

init();
