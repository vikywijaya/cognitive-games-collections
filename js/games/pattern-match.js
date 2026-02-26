/* ============================================================
   Pattern Match – Visual Matrix Reasoning
   A 3×3 grid of emoji symbols (like Raven's Matrices).
   The bottom-right cell is missing ("?").
   Player picks the symbol that correctly completes the pattern.
   10 rounds.
   ============================================================ */
'use strict';

GameRegistry.register({
  id: 'pattern-match',

  _timer: null,

  init(container, onComplete) {
    this._onComplete = onComplete;
    this._container  = container;
    this._startGame();
  },

  destroy() {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
  },

  _SYMBOL_SETS: [
    ['🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤'],
    ['⬛','⬜','🔲','🔳','▪️','▫️','◾','◽','◼'],
    ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘','🌙'],
    ['♠️','♥️','♦️','♣️','🃏','🀄','🎴','🎲','🎰'],
    ['🍎','🍊','🍋','🍇','🍓','🍒','🍑','🍍','🥝'],
    ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨'],
    ['🌸','🌺','🌻','🌹','🌷','💐','🌼','🪷','🌾'],
    ['🚗','🚕','🚙','🚌','🚎','🏎','🚓','🚑','🚒'],
    ['🎸','🎺','🎻','🥁','🎷','🪗','🎹','🪘','🪕'],
    ['⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🥏'],
  ],

  /* Pattern types:
     'row-shift'  — each row cycles through 3 symbols from a set
     'col-repeat' — each column repeats one symbol; rows pick different ones
     'diagonal'   — main diagonal is one symbol, rest are two others
  */
  _PATTERN_TYPES: ['row-shift', 'col-repeat', 'diagonal'],

  _TOTAL_ROUNDS: 10,

  _startGame() {
    this._state = { round: 0, correct: 0, score: 0 };
    this._render();
    this._nextRound();
  },

  _render() {
    this._container.innerHTML = `
      <div class="game-instructions">
        🧩 <strong>How to play:</strong> Look at the 3×3 grid. One cell is missing.
        Pick the symbol that correctly completes the pattern.
      </div>
      <div class="d-flex justify-center mb-md" style="gap:24px">
        <div class="stat-chip">Round: <span class="stat-val" id="pmRound">0/${this._TOTAL_ROUNDS}</span></div>
        <div class="stat-chip">Score: <span class="stat-val" id="pmScore">0</span></div>
      </div>
      <div id="pmMatrix" class="pattern-matrix"></div>
      <div class="text-center mb-sm" style="font-size:var(--fs-sm);color:var(--clr-text-muted)">
        Which symbol goes in the <strong>?</strong> position?
      </div>
      <div class="pattern-choices" id="pmChoices"></div>
      <div class="text-center mt-sm" id="pmFeedback"
           style="font-size:var(--fs-md);font-weight:700;min-height:32px;"></div>`;
  },

  _nextRound() {
    const s = this._state;
    if (s.round >= this._TOTAL_ROUNDS) { this._finish(); return; }
    s.round++;
    s._answered = false;

    const { grid, answer } = this._generatePuzzle();
    s.answer     = answer;
    s._startTime = Date.now();

    const roundEl = this._container.querySelector('#pmRound');
    const scoreEl = this._container.querySelector('#pmScore');
    const fbEl    = this._container.querySelector('#pmFeedback');
    if (roundEl) roundEl.textContent = `${s.round}/${this._TOTAL_ROUNDS}`;
    if (scoreEl) scoreEl.textContent = s.score;
    if (fbEl)    fbEl.textContent    = '';

    this._renderMatrix(grid);
    this._renderChoices(answer, grid);
  },

  _generatePuzzle() {
    const symSet = this._SYMBOL_SETS[Math.floor(Math.random() * this._SYMBOL_SETS.length)];
    const type   = this._PATTERN_TYPES[Math.floor(Math.random() * this._PATTERN_TYPES.length)];

    let grid = [];

    if (type === 'row-shift') {
      // Each row uses 3 symbols in order, shifted each row
      const [a, b, c] = symSet.slice(0, 3);
      grid = [
        [a, b, c],
        [b, c, a],
        [c, a, b],
      ];
    } else if (type === 'col-repeat') {
      // Each column has the same symbol; rows pick from first 3
      const [a, b, c] = symSet.slice(0, 3);
      grid = [
        [a, b, c],
        [a, b, c],
        [a, b, c],
      ];
    } else {
      // diagonal: main diagonal = sym[0], off-diagonal = sym[1] and sym[2]
      const [a, b, c] = symSet.slice(0, 3);
      grid = [
        [a, b, c],
        [c, a, b],
        [b, c, a],
      ];
    }

    const answer = grid[2][2];
    return { grid, answer };
  },

  _renderMatrix(grid) {
    const matEl = this._container.querySelector('#pmMatrix');
    if (!matEl) return;
    matEl.innerHTML = '';
    grid.forEach((row, r) => {
      row.forEach((sym, c) => {
        const cell = document.createElement('div');
        const isMissing = r === 2 && c === 2;
        cell.className  = 'pattern-cell' + (isMissing ? ' missing' : '');
        cell.textContent = isMissing ? '?' : sym;
        matEl.appendChild(cell);
      });
    });
  },

  _renderChoices(answer, grid) {
    const allSymbols = [...new Set(grid.flat())];
    const distractors = this._SYMBOL_SETS
      .flat()
      .filter(s => !allSymbols.includes(s))
      .sort(() => Math.random() - 0.5);

    const opts = [answer];
    for (const d of distractors) {
      if (opts.length >= 4) break;
      opts.push(d);
    }
    opts.sort(() => Math.random() - 0.5);

    const choicesEl = this._container.querySelector('#pmChoices');
    if (!choicesEl) return;
    choicesEl.innerHTML = opts.map(sym => `
      <div class="pattern-choice" data-sym="${sym}">${sym}</div>
    `).join('');

    choicesEl.querySelectorAll('.pattern-choice').forEach(el => {
      el.addEventListener('click', () => this._handleAnswer(el.dataset.sym, el));
    });
  },

  _handleAnswer(sym, el) {
    const s = this._state;
    if (s._answered) return;
    s._answered = true;

    const elapsed = (Date.now() - s._startTime) / 1000;
    const correct = sym === s.answer;
    const fbEl    = this._container.querySelector('#pmFeedback');

    this._container.querySelectorAll('.pattern-choice').forEach(c => {
      if (c.dataset.sym === s.answer) c.classList.add('correct');
    });

    if (correct) {
      const bonus = Math.max(0, Math.round(15 - elapsed));
      const pts   = 10 + bonus;
      s.score  += pts;
      s.correct++;
      el.classList.add('correct');
      if (fbEl) fbEl.innerHTML = `<span style="color:var(--clr-success)">✅ Correct! +${pts} pts</span>`;
    } else {
      el.classList.add('wrong');
      if (fbEl) fbEl.innerHTML = `<span style="color:var(--clr-error)">❌ The answer was: ${s.answer}</span>`;
    }

    const scoreEl = this._container.querySelector('#pmScore');
    if (scoreEl) scoreEl.textContent = s.score;

    this._timer = setTimeout(() => this._nextRound(), 1400);
  },

  _finish() {
    const s   = this._state;
    const max = this._TOTAL_ROUNDS * 25;
    const score = Math.round((s.score / max) * 100);
    this._onComplete({
      score:  Math.min(100, score),
      detail: `${s.correct} correct out of ${this._TOTAL_ROUNDS} patterns.`,
    });
  },
});
