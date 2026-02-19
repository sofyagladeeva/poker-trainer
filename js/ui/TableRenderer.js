import { ACTIVE_POSITIONS, POSITION_LABELS } from '../utils/constants.js';

// Координаты 9 сидений по эллипсу (viewBox 600x340)
const SEAT_COORDS = {
  UTG:  { x: 150, y: 60  },
  UTG1: { x: 300, y: 30  },
  UTG2: { x: 450, y: 60  },
  LJ:   { x: 540, y: 140 },
  HJ:   { x: 510, y: 260 },
  CO:   { x: 390, y: 310 },
  BTN:  { x: 210, y: 310 },
  SB:   { x:  90, y: 260 },
  BB:   { x:  60, y: 140 },
};

export function renderTable(situation) {
  const svg = document.getElementById('seats');
  svg.innerHTML = '';

  const { numPlayers, heroPos, actionHistory, villainPos, type } = situation;
  const activePosArr = ACTIVE_POSITIONS[numPlayers];

  // Строим карту действий
  const actionMap = {};
  for (const a of actionHistory) actionMap[a.position] = a;

  for (const pos of activePosArr) {
    const coord = SEAT_COORDS[pos];
    if (!coord) continue;

    const isHero    = pos === heroPos;
    const action    = actionMap[pos];
    const isVillain = pos === villainPos;

    // Цвет кружка
    let fillColor = '#1a3a2a';  // по умолчанию (неактивный)
    let strokeColor = '#2d6a4f';
    if (isHero) { fillColor = '#f4a261'; strokeColor = '#e76f51'; }
    else if (isVillain) { fillColor = '#e63946'; strokeColor = '#c1121f'; }
    else if (action?.action === 'fold')  { fillColor = '#1a1a1a'; strokeColor = '#333'; }
    else if (action?.action === 'raise') { fillColor = '#c9184a'; strokeColor = '#ff4d6d'; }
    else if (action?.action === 'limp')  { fillColor = '#5c4033'; strokeColor = '#a0522d'; }

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'seat');

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', coord.x);
    circle.setAttribute('cy', coord.y);
    circle.setAttribute('r', 22);
    circle.setAttribute('fill', fillColor);
    circle.setAttribute('stroke', strokeColor);
    circle.setAttribute('stroke-width', isHero ? 3 : 2);
    g.appendChild(circle);

    // Метка позиции
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', coord.x);
    label.setAttribute('y', coord.y + 4);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-size', 10);
    label.setAttribute('font-weight', 'bold');
    label.setAttribute('fill', isHero ? '#1a1a1a' : '#d8f3dc');
    label.setAttribute('font-family', 'monospace');
    label.textContent = POSITION_LABELS[pos] || pos;
    g.appendChild(label);

    // Подпись действия снизу/сверху
    if (action) {
      const actionLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const offsetY = coord.y > 170 ? 38 : -28;
      actionLabel.setAttribute('x', coord.x);
      actionLabel.setAttribute('y', coord.y + offsetY);
      actionLabel.setAttribute('text-anchor', 'middle');
      actionLabel.setAttribute('font-size', 9);
      actionLabel.setAttribute('fill', action.action === 'fold' ? '#555' : '#ffb347');
      actionLabel.setAttribute('font-family', 'monospace');
      const labels = { fold: 'fold', raise: `raise ${action.amount}bb`, limp: 'limp 1bb', call: 'call' };
      actionLabel.textContent = labels[action.action] || action.action;
      g.appendChild(actionLabel);
    }

    // "YOU" под героем
    if (isHero) {
      const you = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const offsetY = coord.y > 170 ? 38 : -28;
      you.setAttribute('x', coord.x);
      you.setAttribute('y', coord.y + offsetY);
      you.setAttribute('text-anchor', 'middle');
      you.setAttribute('font-size', 9);
      you.setAttribute('fill', '#f4a261');
      you.setAttribute('font-family', 'monospace');
      you.textContent = 'YOU';
      g.appendChild(you);
    }

    svg.appendChild(g);
  }

  // Текст по центру стола
  const desc = document.getElementById('table-desc');
  const typeLabels = { openRaise: 'Open raise', vsRaise: 'Vs raise', vsLimp: 'Vs limp' };
  desc.textContent = `${typeLabels[situation.type] || ''} · ${numPlayers} players`;
}
