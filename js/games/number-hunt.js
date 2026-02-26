/* ============================================================
   Number Hunt – Schulte Table
   A 5×5 grid of numbers 1–25 in random positions.
   Click them in ascending order as fast as possible.
   Score based on time taken.
   ============================================================ */
'use strict';

GameRegistry.register({
  id: 'number-hunt',

  _timer: null,

  init(container, onComplete) {
    this._onComplete = onComplete;
    this._container  = container;
    this._startGame();
  },

  destroy() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  },

  _GRID_SIZE: 5,
  _TARGET_SECS: 60, // time budget for 100 score; overtime still allowed

  _startGame() {
    const size  = this._GRID_SIZE;
    const total = size * size;
    const nums  = Array.from({ length: total }, (_, i) => i + 1)
                       .sort(() => Math.random() - 0.5);

    this._state = {
      numbers:    nums,
      nextTarget: 1,
      total,
      found:      0,
      startTime:  null,
      elapsedSec: 0,
      done:       false,
    };

    this._render();
    this._startTimer();
  },

  _render() {
    const s    = this._state;
    const size = this._GRID_SIZE;

    this._container.innerHTML = `
      <div class="game-instructions">
        🔢 <strong>How to play:</strong> Click numbers <strong>1 → ${s.total}</strong>
        in order, as fast as you can!
      </div>
      <div class="d-flex justify-center mb-sm" style="gap:24px">
        <div class="stat-chip">Find: <span class="stat-val" id="nhTarget" style="color:var(--clr-accent);font-size:var(--fs-lg)">1</span></div>
        <div class="stat-chip">Time: <span class="stat-val" id="nhTime">0s</span></div>
        <div class="stat-chip">Found: <span class="stat-val" id="nhFound">0/${s.total}</span></div>
      </div>
      <div class="schulte-grid" id="nhGrid"
           style="grid-template-columns:repeat(${size},1fr);max-width:${size * 76}px">
      </div>`;

    const grid = this._container.querySelector('#nhGrid');
    s.numbers.forEach(num => {
      const cell = document.createElement('div');
      cell.className    = 'schulte-cell';
      cell.textContent  = num;
      cell.dataset.num  = num;
      cell.addEventListener('click', () => this._handleClick(num, cell));
      grid.appendChild(cell);
      s[`_cell_${num}`] = cell;
    });
  },

  _startTimer() {
    this._state.startTime = Date.now();
    this._timer = setInterval(() => {
      if (this._state.done) { clearInterval(this._timer); return; }
      const elapsed = Math.floor((Date.now() - this._state.startTime) / 1000);
      this._state.elapsedSec = elapsed;
      const el = this._container.querySelector('#nhTime');
      if (el) el.textContent = `${elapsed}s`;
    }, 500);
  },

  _handleClick(num, cell) {
    const s = this._state;
    if (s.done) return;

    if (num === s.nextTarget) {
      cell.classList.add('found');
      s.found++;
      s.nextTarget++;

      const foundEl  = this._container.querySelector('#nhFound');
      const targetEl = this._container.querySelector('#nhTarget');
      if (foundEl)  foundEl.textContent  = `${s.found}/${s.total}`;
      if (targetEl) targetEl.textContent = s.nextTarget <= s.total ? s.nextTarget : '✅';

      if (s.found === s.total) {
        s.done = true;
        clearInterval(this._timer);
        const elapsed = Math.floor((Date.now() - s.startTime) / 1000);
        this._state.elapsedSec = elapsed;

        setTimeout(() => this._finish(), 600);
      }
    } else {
      // Wrong number – flash red
      cell.classList.add('wrong');
      setTimeout(() => cell.classList.remove('wrong'), 500);
    }
  },

  _finish() {
    const s       = this._state;
    const elapsed = s.elapsedSec || 1;
    // 100% if done in ≤ TARGET_SECS; reduce linearly, min 10
    const score   = Math.max(10, Math.round((this._TARGET_SECS / elapsed) * 100));
    this._onComplete({
      score:  Math.min(100, score),
      detail: `Found all ${s.total} numbers in ${elapsed} seconds.`,
    });
  },
});
