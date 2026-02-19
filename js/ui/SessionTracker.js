const STORAGE_KEY = 'pokerTrainer_session';

let session = load();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { total: 0, correct: 0 };
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function record(isCorrect) {
  session.total++;
  if (isCorrect) session.correct++;
  save();
  render();
}

export function reset() {
  session = { total: 0, correct: 0 };
  save();
  render();
}

export function render() {
  document.getElementById('stat-total').textContent   = session.total;
  document.getElementById('stat-correct').textContent = session.correct;
  const pctEl = document.getElementById('stat-pct');
  if (session.total > 0) {
    const pct = Math.round((session.correct / session.total) * 100);
    pctEl.textContent = `(${pct}%)`;
  } else {
    pctEl.textContent = '';
  }
}
