const ACTION_LABELS = {
  fold:  'Fold',
  call:  'Call',
  raise: 'Raise / Iso-raise',
  '3bet': '3-Bet',
  '4bet': '4-Bet',
  'jam':  'Jam / 5-Bet'
};

export function showFeedback(result, playerAction) {
  const section = document.getElementById('feedback-section');
  const resultEl = document.getElementById('feedback-result');
  const actionEl = document.getElementById('feedback-action');
  const expl = document.getElementById('feedback-explanation');
  const range = document.getElementById('feedback-range');

  section.classList.remove('hidden', 'correct', 'wrong');
  section.classList.add(result.correct ? 'correct' : 'wrong');

  resultEl.className = `feedback-result ${result.correct ? 'correct' : 'wrong'}`;
  resultEl.textContent = result.correct ? '✓ Верно' : '✗ Неверно';

  if (!result.correct) {
    actionEl.textContent = `Ты выбрала: ${ACTION_LABELS[playerAction] || playerAction} → Правильно: ${ACTION_LABELS[result.correctAction] || result.correctAction}`;
  } else {
    actionEl.textContent = `Действие: ${ACTION_LABELS[result.correctAction] || result.correctAction}`;
  }

  expl.textContent  = result.explanation  || '';
  range.textContent = result.rangeNote    || '';

  // Подсветить кнопки
  highlightButtons(playerAction, result.correctAction, result.correct);
}

export function hideFeedback() {
  document.getElementById('feedback-section').classList.add('hidden');
  // Убрать подсветку с кнопок
  document.querySelectorAll('.action-btn').forEach(b => {
    b.classList.remove('selected-correct','selected-wrong','reveal-correct');
  });
}

function highlightButtons(playerAction, correctAction, isCorrect) {
  document.querySelectorAll('.action-btn').forEach(btn => {
    const a = btn.dataset.action;
    if (a === playerAction && isCorrect)  btn.classList.add('selected-correct');
    if (a === playerAction && !isCorrect) btn.classList.add('selected-wrong');
    if (a === correctAction && !isCorrect) btn.classList.add('reveal-correct');
  });
}

export function setActionsVisible(available) {
  const all = ['fold','call','raise','3bet'];
  for (const a of all) {
    const btn = document.getElementById(`btn-${a}`);
    if (!btn) continue;
    if (available.includes(a)) {
      btn.classList.remove('hidden');
      btn.disabled = false;
    } else {
      btn.classList.add('hidden');
      btn.disabled = true;
    }
  }
}

export function disableActions() {
  document.querySelectorAll('.action-btn').forEach(b => b.disabled = true);
}
