# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the project

ES Modules require an HTTP server (not `file://`):

```bash
python3 -m http.server 8765
# open http://localhost:8765
```

No build step, no npm, no dependencies. Open directly in a modern browser.

**Safari caching:** Safari aggressively caches CSS/JS. When deploying changes:
- Bump `?v=N` query string on `<link rel="stylesheet">` in `index.html` to bust CSS cache
- User should open a private window (`Cmd+Shift+N`) to bypass JS module cache
- Hard reload in Safari is NOT `Cmd+Shift+R` (that toggles reader mode) — use private window instead

**Actual project path** (non-breaking spaces in folder name):
```
/Users/sofyagladeeva/Documents/Документы — MacBook Air — Софья (2)/poker-trainer
```
In Python: `base = '/Users/sofyagladeeva/Documents/' + 'Документы — MacBook Air — Софья (2)' + '/poker-trainer'`
Read/write files via `python3 << 'PYEOF'` blocks since the path breaks shell quoting.

---

## Current state (as of Feb 2026)

### Module 1 — Preflop trainer ✅ fully working

**Three situation types:**
- `openRaise` — all folded, hero acts first → Fold / Raise
- `vsRaise` — someone raised → Fold / Call / 3-Bet
- `vsLimp` — someone limped → Fold / Call (limp behind) / Raise (iso)

**All 4 buttons always visible** — Fold, Call, Raise/Iso, 3-Bet shown on every hand.
Clicking an "impossible" action (e.g. 3-Bet pre-raise) gives an explanatory error message,
not a silent wrong answer.

**BB vs limp special case:** BB already paid 1BB, so Call = free check.
`RangeEngine.js` treats any non-iso hand as correctAction='call' when `heroPos === 'BB'` in vsLimp.
The Call button label changes to "Чек (Call)" in this situation.

**Range modal (P2 ✅):** Button "Показать диапазон" opens a 13×13 hand grid (`js/ui/RangeGrid.js`).
Color coding: green = Raise/3-Bet, yellow = Call, dark = Fold. Current hand has white outline.
Modal closes on ✕ button or clicking the backdrop.

**Design decisions:**
- No open-limp option — tренажёр teaches GTO raise-or-fold strategy
- BB is excluded from `openRaise` situations (BB has a free check, no open decision)
- Limp in `vsLimp` refers to limp-behind (calling someone else's limp), not open-limp

---

## Architecture

Vanilla HTML/CSS/JS with ES Modules. Three layers:

**`js/engine/`** — pure logic, no DOM:
- `HandEvaluator.js` — normalizes two card strings (`"As"`,`"Kh"`) into hand notation (`"AKs"` / `"AKo"` / `"AA"`)
- `RangeEngine.js` — loads `ranges.json` once (cached), evaluates player action against GTO range, returns `{ correct, correctAction, explanation, rangeNote }`. Has special BB vs limp logic and impossible-action handling.
- `SituationGenerator.js` — generates random situation objects

**`js/ui/`** — DOM-only, no game logic:
- `TableRenderer.js` — renders SVG table; reads `situation.actionHistory` and `SEAT_COORDS` constants
- `FeedbackPanel.js` — shows/hides feedback, applies CSS classes to action buttons
- `SessionTracker.js` — localStorage key `pokerTrainer_session`; module-level singleton state
- `GlossaryPopup.js` — event delegation on `document.body`; looks up `data-term` attribute in `glossary.json`
- `RangeGrid.js` — renders 13×13 range modal for current situation/position

**`js/main.js`** — orchestrator only:
- Event listeners attached **outside** `async init()` to avoid async race conditions
- `nextHand()` wrapped in try/catch — on error retries once (`nextHand()` recursive call)
- `buildSituationHTML()` uses if/else (NOT object literal) to avoid eager evaluation of `null.toLowerCase()`

---

## Known bugs fixed this session

| Bug | Fix |
|-----|-----|
| Buttons unresponsive on load | Moved event listeners outside `async init()` |
| "Ошибка генерации: null is not an object" on every openRaise hand | `buildSituationHTML` was using object literal — all branches evaluated eagerly including `villainPos.toLowerCase()` where villainPos=null for openRaise. Changed to if/else. |
| BB vs limp: Call incorrectly marked as wrong | BB already paid 1BB → call = free check. Logic now: if heroPos==='BB' in vsLimp, everything not in iso range = correctAction='call' |
| 3-Bet button visible in openRaise (confused user) | All 4 buttons now always shown; impossible actions get explanatory feedback |

---

## Data formats

**`data/ranges.json`** has three top-level keys: `openRaise`, `vsRaise`, `vsLimp`.

- `openRaise[position].raise` — array of hand strings to open-raise; everything else is fold
- `vsRaise["HERO_vs_VILLAIN"].threeBet / .call` — hands for each action; anything absent = fold
- `vsLimp["HERO_vs_limp"].iso / .call` — iso-raise or call range; anything absent = fold (except BB where absent = call/check)

Current positions in ranges.json:
- `openRaise`: UTG, UTG1, UTG2, LJ, HJ, CO, BTN, SB (no BB — BB has free check)
- `vsRaise`: BTN_vs_UTG, BTN_vs_CO, BB_vs_BTN, BB_vs_CO, SB_vs_BTN
- `vsLimp`: HJ_vs_limp, CO_vs_limp, BTN_vs_limp, SB_vs_limp, BB_vs_limp

Hand strings: `"AA"` (pair), `"AKs"` (suited), `"AKo"` (offsuit). Always high card first.

## Situation object shape

```js
{
  type: 'openRaise' | 'vsRaise' | 'vsLimp',
  numPlayers: 4..9,
  heroPos: 'BTN',
  hand: { card1, card2, normalized },
  actionHistory: [{ position, action, amount? }],
  villainPos: 'CO' | null,
  availableActions: [...]   // kept for reference but UI always shows all 4 buttons
}
```

## Extending ranges

To add a new `vsRaise` matchup, add a key `"HEROPOS_vs_VILLAINPOS"` to `ranges.json` with `heroPos`, `raiserPos`, `threeBet[]`, `call[]`, `note`. `SituationGenerator` discovers keys dynamically — no code changes needed.

To add a new `vsLimp` position, add `"HEROPOS_vs_limp"` with `iso[]`, `call[]`, `isoSizingBB`, `note`.

## Adding glossary terms

Add entry to `glossary.json`. Then in any HTML or in `buildSituationHTML()` in `main.js`, use:
```html
<span data-term="your-key">visible text</span>
```

---

## Roadmap

| Приоритет | Фича | Статус |
|-----------|------|--------|
| P0 | Префлоп тренажёр (open / vs raise / vs limp) | ✅ готово |
| P0 | Словарь терминов с hover-подсказками | ✅ готово |
| P0 | Прогресс сессии | ✅ готово |
| P2 | Просмотр диапазона (кнопка "Показать диапазон") | ✅ готово |
| P1 | Постфлоп калькулятор (ауты + пот-оддсы) | 🔲 следующий |
| P1 | Статистика по позициям (где ошибаюсь чаще) | 🔲 следующий |
| P2 | Фильтр по типу ситуации (тренировать только vsRaise) | 🔲 идея |
| P3 | Экспорт прогресса / история сессий | 🔲 идея |

## Planned Module 2 (postflop math)

Architecture is ready: add `js/engine/PotOddsEngine.js` and `data/pot_scenarios.json`.
Hash routing (`#preflop` / `#postflop`) is the intended navigation pattern — `main.js` should listen to `window.hashchange`.
