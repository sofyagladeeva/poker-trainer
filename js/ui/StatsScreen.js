import { supabase } from '../auth/supabase.js';
import { RANKS } from '../utils/constants.js';

// Загружает все результаты текущего пользователя из Supabase
async function loadHandResults() {
  const { data, error } = await supabase
    .from('hand_results')
    .select('hand, situation_type, hero_pos, correct');
  if (error) { console.error('loadHandResults:', error); return []; }
  return data || [];
}

// Агрегирует массив строк по ключу → { key: { total, correct } }
function aggregate(rows, key) {
  const map = {};
  for (const row of rows) {
    const k = row[key];
    if (!map[k]) map[k] = { total: 0, correct: 0 };
    map[k].total++;
    if (row.correct) map[k].correct++;
  }
  return map;
}

function pct(correct, total) {
  return total === 0 ? null : Math.round((correct / total) * 100);
}

function pctColor(p) {
  if (p === null) return '#333';
  if (p >= 80) return '#52b788';
  if (p >= 60) return '#e9c46a';
  return '#e63946';
}

// Рендерит блок "по позициям" и "по ситуациям"
function renderGroupStats(container, data, orderedKeys, labelMap) {
  container.innerHTML = '';
  for (const key of orderedKeys) {
    const stat = data[key];
    if (!stat) continue;
    const p = pct(stat.correct, stat.total);
    const color = pctColor(p);
    const row = document.createElement('div');
    row.className = 'stat-row';
    row.innerHTML = `
      <span class="stat-row-label">${labelMap[key] || key}</span>
      <div class="stat-bar-wrap">
        <div class="stat-bar" style="width:${p ?? 0}%; background:${color}"></div>
      </div>
      <span class="stat-row-pct" style="color:${color}">${p !== null ? p + '%' : '—'}</span>
      <span class="stat-row-count">${stat.total} рук</span>
    `;
    container.appendChild(row);
  }
  if (container.children.length === 0) {
    container.innerHTML = '<div class="stats-empty">Нет данных</div>';
  }
}

// Рендерит тепловую карту ошибок 13×13
function renderHeatmap(container, handData) {
  container.innerHTML = '';

  // Заголовочная строка
  const headerRow = document.createElement('div');
  headerRow.className = 'heatmap-row';
  headerRow.appendChild(Object.assign(document.createElement('div'), { className: 'hm-corner' }));
  for (const r of RANKS) {
    const h = document.createElement('div');
    h.className = 'hm-header';
    h.textContent = r;
    headerRow.appendChild(h);
  }
  container.appendChild(headerRow);

  for (let i = 0; i < RANKS.length; i++) {
    const row = document.createElement('div');
    row.className = 'heatmap-row';

    const rowLabel = document.createElement('div');
    rowLabel.className = 'hm-header';
    rowLabel.textContent = RANKS[i];
    row.appendChild(rowLabel);

    for (let j = 0; j < RANKS.length; j++) {
      const hand = i === j
        ? RANKS[i] + RANKS[j]           // пара: AA, KK...
        : i < j
          ? RANKS[i] + RANKS[j] + 's'   // suited: верхний треугольник
          : RANKS[j] + RANKS[i] + 'o';  // offsuit: нижний треугольник

      const stat = handData[hand];
      const p = stat ? pct(stat.correct, stat.total) : null;

      const cell = document.createElement('div');
      cell.className = 'hm-cell';
      const handsPlayed = stat?.total ?? 0;
      cell.title = `${hand}: ${p !== null ? p + '%' : '—'} (${handsPlayed} рук)`;

      if (p === null) {
        cell.style.background = '#1a1a1a';
        cell.style.color = '#444';
      } else {
        const intensity = p / 100;
        if (p >= 80) {
          cell.style.background = `rgba(82,183,136,${0.15 + intensity * 0.6})`;
          cell.style.color = '#52b788';
        } else if (p >= 60) {
          cell.style.background = `rgba(233,196,106,${0.15 + intensity * 0.5})`;
          cell.style.color = '#e9c46a';
        } else {
          cell.style.background = `rgba(230,57,70,${0.2 + (1 - intensity) * 0.5})`;
          cell.style.color = '#e63946';
        }
      }

      cell.textContent = hand;
      row.appendChild(cell);
    }
    container.appendChild(row);
  }
}

export async function initStatsScreen(currentUser) {
  const screen = document.getElementById('stats-screen');
  screen.innerHTML = '<div class="stats-loading">Загружаем статистику…</div>';

  if (!currentUser) {
    screen.innerHTML = `
      <div class="stats-guest">
        <p>Войди в аккаунт — и здесь появится твоя статистика по всем сыгранным рукам.</p>
        <button class="btn-start" id="btn-stats-login">Войти / Зарегистрироваться</button>
      </div>`;
    document.getElementById('btn-stats-login').addEventListener('click', () => {
      screen.dispatchEvent(new CustomEvent('go-login'));
    });
    return;
  }

  const rows = await loadHandResults();
  const total = rows.length;

  if (total === 0) {
    screen.innerHTML = '<div class="stats-empty">Сыграй несколько рук — и здесь появится статистика.</div>';
    return;
  }

  const totalCorrect = rows.filter(r => r.correct).length;
  const overallPct = pct(totalCorrect, total);
  const overallColor = pctColor(overallPct);

  const byPos  = aggregate(rows, 'hero_pos');
  const bySit  = aggregate(rows, 'situation_type');
  const byHand = aggregate(rows, 'hand');

  const POS_ORDER = ['UTG','UTG1','UTG2','LJ','HJ','CO','BTN','SB','BB'];
  const POS_LABELS = { UTG:'UTG', UTG1:'UTG+1', UTG2:'UTG+2', LJ:'LJ', HJ:'HJ', CO:'CO', BTN:'BTN', SB:'SB', BB:'BB' };
  const SIT_ORDER  = ['openRaise','vsRaise','vs3Bet','vs4Bet','vsLimp'];
  const SIT_LABELS = { openRaise:'Открытие', vsRaise:'vs Рейз', vs3Bet:'vs 3-бет', vs4Bet:'vs 4-бет', vsLimp:'vs Лимп' };

  // Генерируем инсайты (только по данным с ≥5 рук)
  const insights = [];
  const MIN_HANDS = 5;

  // Слабейшая позиция
  const weakPos = POS_ORDER
    .filter(p => byPos[p]?.total >= MIN_HANDS)
    .sort((a, b) => pct(byPos[a].correct, byPos[a].total) - pct(byPos[b].correct, byPos[b].total))[0];
  if (weakPos) {
    const p = pct(byPos[weakPos].correct, byPos[weakPos].total);
    if (p < 80) insights.push(`Позиция <strong>${POS_LABELS[weakPos]}</strong> — ${p}%. Попробуй фильтр по позиции в настройках.`);
  }

  // Слабейшая ситуация
  const weakSit = SIT_ORDER
    .filter(s => bySit[s]?.total >= MIN_HANDS)
    .sort((a, b) => pct(bySit[a].correct, bySit[a].total) - pct(bySit[b].correct, bySit[b].total))[0];
  if (weakSit) {
    const p = pct(bySit[weakSit].correct, bySit[weakSit].total);
    if (p < 80) insights.push(`Ситуация <strong>${SIT_LABELS[weakSit]}</strong> — ${p}%. Выбери её в настройках и потренируй отдельно.`);
  }

  // Топ-3 проблемных руки
  const weakHands = Object.entries(byHand)
    .filter(([, s]) => s.total >= 3)
    .map(([h, s]) => ({ h, p: pct(s.correct, s.total) }))
    .filter(x => x.p < 60)
    .sort((a, b) => a.p - b.p)
    .slice(0, 3);
  if (weakHands.length) {
    insights.push(`Проблемные руки: <strong>${weakHands.map(x => x.h).join(', ')}</strong> — найди их на тепловой карте ниже.`);
  }

  const insightsHTML = insights.length
    ? `<div class="stats-section">
        <div class="stats-section-title">На что обратить внимание</div>
        <ul class="stats-insights">${insights.map(i => `<li>${i}</li>`).join('')}</ul>
       </div>`
    : total >= 20
      ? `<div class="stats-section"><div class="stats-insights-good">Отлично! Всё на уровне 80%+. Продолжай в том же духе.</div></div>`
      : '';

  screen.innerHTML = `
    <div class="stats-overview">
      <span class="stats-overview-pct" style="color:${overallColor}">${overallPct}%</span>
      <span class="stats-overview-label">всего верно · ${total} рук</span>
    </div>

    ${insightsHTML}

    <div class="stats-section">
      <div class="stats-section-title">По позиции</div>
      <div id="stats-by-pos"></div>
    </div>

    <div class="stats-section">
      <div class="stats-section-title">По ситуации</div>
      <div id="stats-by-sit"></div>
    </div>

    <div class="stats-section">
      <div class="stats-section-title">Тепловая карта ошибок</div>

      <div class="heatmap-explainer">
        <p>Каждая ячейка — рука. <span style="color:#e63946">Красная</span> = часто ошибаешься, <span style="color:#52b788">зелёная</span> = всё хорошо, тёмная = ещё не видела эту руку. Наведи на ячейку — увидишь процент.</p>
        ${total < 100 ? `<p class="stats-heatmap-few">Пока мало данных (${total} рук) — сыграй ещё ${100 - total}+ чтобы картина была полной.</p>` : ''}
      </div>

      <div class="stats-heatmap-legend">
        <span style="color:#52b788">■ ≥80% верно</span>
        <span style="color:#e9c46a">■ 60–79%</span>
        <span style="color:#e63946">■ &lt;60% — проблема</span>
        <span style="color:#333">■ нет данных</span>
      </div>
<div class="stats-heatmap-wrap">
        <div class="stats-heatmap" id="stats-heatmap"></div>
      </div>
    </div>
  `;

  renderGroupStats(document.getElementById('stats-by-pos'), byPos, POS_ORDER, POS_LABELS);
  renderGroupStats(document.getElementById('stats-by-sit'), bySit, SIT_ORDER, SIT_LABELS);
  renderHeatmap(document.getElementById('stats-heatmap'), byHand);
}
