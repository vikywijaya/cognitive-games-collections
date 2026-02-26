/* ============================================================
   Number Sequence – What Comes Next?
   Show a number series with the last value replaced by "?".
   Player picks the correct answer from 4 choices.
   10 rounds with increasing complexity.
   ============================================================ */
'use strict';

GameRegistry.register({
  id: 'number-sequence',

  _timer: null,

  init(container, onComplete) {
    this._onComplete = onComplete;
    this._container  = container;
    this._startGame();
  },

  destroy() {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
  },

  _TOTAL_ROUNDS: 10,

  /* ---- Sequence generators ---- */
  _GENERATORS: [
    // Linear
    () => { const s = rnd(1,10), d = rnd(2,10); return seq(4, i => s + i * d); },
    () => { const s = rnd(50,100), d = rnd(2,10); return seq(4, i => s - i * d); },
    // Quadratic
    () => { const s = rnd(1,5); return seq(4, i => s + i * i); },
    // Multiply
    () => { const s = rnd(2,4), r = rnd(2,3); return seq(4, i => s * Math.pow(r, i)); },
    // Fibonacci-style
    () => { const a = rnd(1,5), b = rnd(1,5); const arr = [a, b]; for(let i=2;i<5;i++) arr.push(arr[i-1]+arr[i-2]); return arr; },
    // Alternating add
    () => { const s = rnd(5,20), d1 = rnd(2,8), d2 = rnd(2,8);
            return [s, s+d1, s+d1-d2, s+d1-d2+d1, s+d1-d2+d1-d2]; },
    // Even/Odd
    () => { const s = rnd(2,20)*2; return seq(5, i => s + i*2); },
    // Powers of 2
    () => { const start = rnd(1,3); return seq(4, i => start * Math.pow(2, i)); },
    // Skip count
    () => { const s = rnd(1,10), d = rnd(3,7); return seq(5, i => s + i*d); },
    // Minus series
    () => { const s = rnd(80,150), d = rnd(5,15); return seq(5, i => s - i*d); },
  ],

  _startGame() {
    this._state = {
      round:   0,
      correct: 0,
      score:   0,
    };
    this._render();
    this._nextRound();
  },

  _render() {
    this._container.innerHTML = `
      <div class="game-instructions">
        🔢 <strong>How to play:</strong> Look at the number series and choose
        the number that correctly continues it.
      </div>
      <div class="d-flex justify-center mb-md" style="gap:24px">
        <div class="stat-chip">Round: <span class="stat-val" id="nsRound">0/${this._TOTAL_ROUNDS}</span></div>
        <div class="stat-chip">Score: <span class="stat-val" id="nsScore">0</span></div>
      </div>
      <div class="sequence-display" id="nsSequence">…</div>
      <div class="text-center mb-md" style="font-size:var(--fs-sm);color:var(--clr-text-muted)">
        What comes next?
      </div>
      <div class="sequence-options" id="nsOptions"></div>
      <div class="text-center mt-sm" id="nsFeedback"
           style="font-size:var(--fs-md);font-weight:700;min-height:32px;"></div>`;
  },

  _nextRound() {
    const s = this._state;
    if (s.round >= this._TOTAL_ROUNDS) { this._finish(); return; }
    s.round++;
    s._answered = false;

    // Generate sequence
    const gen   = this._GENERATORS[Math.floor(Math.random() * this._GENERATORS.length)];
    const full  = gen();
    const shown = full.slice(0, -1); // all but last
    const answer= full[full.length - 1];

    s.currentAnswer = answer;
    s._startTime    = Date.now();

    // 4 options
    const opts = this._makeOptions(answer, full);

    // Update display
    const roundEl = this._container.querySelector('#nsRound');
    const scoreEl = this._container.querySelector('#nsScore');
    const seqEl   = this._container.querySelector('#nsSequence');
    const optsEl  = this._container.querySelector('#nsOptions');
    const fbEl    = this._container.querySelector('#nsFeedback');

    if (roundEl) roundEl.textContent = `${s.round}/${this._TOTAL_ROUNDS}`;
    if (scoreEl) scoreEl.textContent = s.score;
    if (fbEl)    fbEl.textContent    = '';
    if (seqEl)   seqEl.textContent   = shown.join('  ,  ') + '  ,  ?';

    if (optsEl) {
      optsEl.innerHTML = opts.map(o => `
        <button class="seq-opt" data-val="${o}">${o}</button>
      `).join('');
      optsEl.querySelectorAll('.seq-opt').forEach(btn => {
        btn.addEventListener('click', () => this._handleAnswer(Number(btn.dataset.val), btn));
      });
    }
  },

  _makeOptions(answer, fullSeq) {
    const step = Math.abs(fullSeq[fullSeq.length - 1] - fullSeq[fullSeq.length - 2]) || 1;
    const opts  = new Set([answer]);
    const deltas = [step, step * 2, Math.max(1, Math.round(step * 0.5)), step + 1];
    for (const d of deltas) {
      if (opts.size >= 4) break;
      opts.add(answer + d);
      if (opts.size < 4) opts.add(Math.max(0, answer - d));
    }
    // Fallback random
    while (opts.size < 4) {
      opts.add(answer + Math.floor(Math.random() * 20) + 1);
    }
    return [...opts].slice(0, 4).sort(() => Math.random() - 0.5);
  },

  _handleAnswer(val, btn) {
    const s = this._state;
    if (s._answered) return;
    s._answered = true;

    const elapsed = (Date.now() - s._startTime) / 1000;
    const correct = val === s.currentAnswer;
    const fbEl    = this._container.querySelector('#nsFeedback');

    this._container.querySelectorAll('.seq-opt').forEach(b => {
      b.disabled = true;
      if (Number(b.dataset.val) === s.currentAnswer) b.classList.add('correct');
    });

    if (correct) {
      const bonus = Math.max(0, Math.round(10 - elapsed));
      const pts   = 10 + bonus;
      s.score  += pts;
      s.correct++;
      btn.classList.add('correct');
      if (fbEl) fbEl.innerHTML = `<span style="color:var(--clr-success)">✅ Correct! +${pts} points</span>`;
    } else {
      btn.classList.add('wrong');
      if (fbEl) fbEl.innerHTML = `<span style="color:var(--clr-error)">❌ Answer was: ${s.currentAnswer}</span>`;
    }

    const scoreEl = this._container.querySelector('#nsScore');
    if (scoreEl) scoreEl.textContent = s.score;

    this._timer = setTimeout(() => this._nextRound(), 1400);
  },

  _finish() {
    const s   = this._state;
    const max = this._TOTAL_ROUNDS * 20;
    const score = Math.round((s.score / max) * 100);
    this._onComplete({
      score:  Math.min(100, score),
      detail: `${s.correct} correct out of ${this._TOTAL_ROUNDS} sequences.`,
    });
  },
});

/* ---- Helpers ---- */
function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function seq(n, fn)    { return Array.from({ length: n }, (_, i) => fn(i)); }
