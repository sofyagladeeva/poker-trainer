let rangesData = null;

// Загружает ranges.json один раз
export async function loadRanges() {
  if (rangesData) return rangesData;
  const resp = await fetch('./data/ranges.json');
  rangesData = await resp.json();
  return rangesData;
}

// Проверяет ответ игрока и возвращает результат
// situation: объект из SituationGenerator
// playerAction: 'fold' | 'call' | 'raise' | '3bet'
export function evaluate(situation, playerAction) {
  const { type, heroPos, hand, villainPos } = situation;
  const handKey = hand.normalized;

  let correct, explanation, rangeNote;

  if (type === 'openRaise') {
    const data = rangesData.openRaise[heroPos];
    const raiseSet = new Set(data.raise);
    correct = raiseSet.has(handKey) ? 'raise' : 'fold';
    rangeNote = data.note;

    if (correct === 'raise') {
      explanation = raiseSet.has(handKey)
        ? `${handKey} входит в диапазон открытия с ${heroPos} (~${rangeNote.split('%')[0].replace('~','').trim()}%). Рейзим.`
        : '';
    } else {
      explanation = `${handKey} не входит в диапазон открытия с ${heroPos}. ${rangeNote} Фолд.`;
    }

    if (playerAction === correct) {
      return {
        correct: true,
        correctAction: correct,
        explanation,
        rangeNote
      };
    } else {
      let wrongMsg;
      if (playerAction === '3bet' || playerAction === 'call') {
        const actionLabel = playerAction === '3bet' ? '3-бет' : 'колл';
        const correctLabel = correct === 'raise' ? 'рейз' : 'фолд';
        wrongMsg = `${actionLabel} невозможен — ещё никто не рейзил. Правильное действие: ${correctLabel}.`;
      } else {
        wrongMsg = correct === 'raise'
          ? `Эта рука входит в открывающий диапазон ${heroPos}. Нужно рейзить, а не фолдить.`
          : `${handKey} слишком слабая для открытия с ${heroPos}. ${rangeNote}`;
      }
      return {
        correct: false,
        correctAction: correct,
        explanation: wrongMsg,
        rangeNote
      };
    }
  }

  if (type === 'vsRaise') {
    const key = `${heroPos}_vs_${villainPos}`;
    const data = rangesData.vsRaise[key];

    if (!data) {
      return {
        correct: playerAction === 'fold',
        correctAction: 'fold',
        explanation: `Для этой комбинации позиций нет отдельного диапазона. По умолчанию — фолд с ${handKey}.`,
        rangeNote: ''
      };
    }

    const threeBetSet = new Set(data.threeBet);
    const callSet = new Set(data.call);

    let correctAction;
    if (threeBetSet.has(handKey)) correctAction = '3bet';
    else if (callSet.has(handKey)) correctAction = 'call';
    else correctAction = 'fold';

    rangeNote = data.note;

    const isCorrect = playerAction === correctAction;

    let explanation;
    if (correctAction === '3bet') {
      explanation = `${handKey} — 3-бет с ${heroPos} против рейза с ${villainPos}. ${rangeNote}`;
    } else if (correctAction === 'call') {
      explanation = `${handKey} — колл с ${heroPos} против рейза с ${villainPos}. ${rangeNote}`;
    } else {
      explanation = `${handKey} — фолд с ${heroPos} против рейза с ${villainPos}. ${rangeNote}`;
    }

    return { correct: isCorrect, correctAction, explanation, rangeNote };
  }

  if (type === 'vsLimp') {
    const key = `${heroPos}_vs_limp`;
    const data = rangesData.vsLimp[key];

    if (!data) {
      return {
        correct: playerAction === 'call',
        correctAction: 'call',
        explanation: `Для ${heroPos} нет специального iso-диапазона. Коллируем лимп с ${handKey}.`,
        rangeNote: ''
      };
    }

    const isoSet = new Set(data.iso);
    const callSet = new Set(data.call || []);

    let correctAction;
    if (isoSet.has(handKey)) correctAction = 'raise'; // iso = рейз
    else if (callSet.has(handKey)) correctAction = 'call';
    else if (heroPos === 'BB') correctAction = 'call'; // BB уже заплатил 1BB — чек бесплатен
    else correctAction = 'fold';

    rangeNote = data.note;

    const isCorrect = playerAction === correctAction;
    const actionLabel = {raise: 'изо-рейз', call: 'колл', fold: 'фолд'}[correctAction];

    let explanation;
    if (correctAction === 'raise') {
      explanation = `${handKey} — изоляционный рейз с ${heroPos} против лимпера (${data.isoSizingBB}BB). ${rangeNote}`;
    } else if (correctAction === 'call' && heroPos === 'BB') {
      explanation = `${handKey} — чек с BB. BB уже заплатил 1BB, поэтому колл (чек) всегда доступен. ${rangeNote}`;
    } else if (correctAction === 'call') {
      explanation = `${handKey} — колл лимпа с ${heroPos}. Рука имеет потенциал в мульти-вей поте. ${rangeNote}`;
    } else {
      explanation = `${handKey} — фолд с ${heroPos}. Рука не входит ни в iso, ни в колл диапазон. ${rangeNote}`;
    }

    if (playerAction === '3bet' && !isCorrect) {
      explanation = `3-бет невозможен — лимп это не рейз. Правильное действие: ${correctAction === 'raise' ? 'изо-рейз' : correctAction === 'call' ? 'колл' : 'фолд'}.`;
    }
    return { correct: isCorrect, correctAction, explanation, rangeNote };
  }

  return { correct: false, correctAction: 'fold', explanation: 'Неизвестный тип ситуации.', rangeNote: '' };
}
