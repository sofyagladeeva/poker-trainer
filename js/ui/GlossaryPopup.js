let glossaryData = {};
const popup = document.getElementById('glossary-popup');
const termEl = document.getElementById('glossary-term');
const defEl  = document.getElementById('glossary-def');

export async function initGlossary() {
  try {
    const resp = await fetch('./data/glossary.json');
    glossaryData = await resp.json();
  } catch { glossaryData = {}; }

  document.body.addEventListener('mouseover', onHover);
  document.body.addEventListener('mouseout',  onOut);
}

function onHover(e) {
  const el = e.target.closest('[data-term]');
  if (!el) { popup.classList.add('hidden'); return; }

  const key = el.dataset.term;
  const entry = glossaryData[key];
  if (!entry) return;

  termEl.textContent = entry.term || key;
  defEl.textContent  = entry.def  || entry;

  popup.classList.remove('hidden');

  const rect = el.getBoundingClientRect();
  let top  = rect.bottom + window.scrollY + 6;
  let left = rect.left   + window.scrollX;

  // Не выходить за правый край экрана
  const popupW = 290;
  if (left + popupW > window.innerWidth) left = window.innerWidth - popupW - 12;

  popup.style.top  = `${top}px`;
  popup.style.left = `${left}px`;
}

function onOut(e) {
  const el = e.target.closest('[data-term]');
  if (el) popup.classList.add('hidden');
}
