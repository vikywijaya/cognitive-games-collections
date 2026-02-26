/* ============================================================
   Color Match – Stroop Test
   A colour word is displayed in a different ink colour.
   Player must tap the INK COLOUR (not what the word says).
   15 questions. Correct + fast = higher score.
   ============================================================ */
'use strict';

GameRegistry.register({
  id: 'color-match',

  _timer: null,

  init(container, onComplete) {
    this._onComplete = onComplete;
    this._container  = container;
    this._startGame();
  },

  destroy() {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
  },

  _COLORS: [
    { name: 'RED',    hex: '#E53935' },
    { name: 'BLUE',   hex: '#1E88E5' },
    { name: 'GREEN',  hex: '#43A047' },
    { name: 'YELLOW', hex: '#FDD835' },
    { name: 'PURPLE', hex: '#8E24AA' },
    { name: 'ORANGE', hex: '#FB8C00' },
  ],

  _TOTAL_ROUNDS: 15,

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
        🎨 <strong>Stroop Test:</strong> Tap the button that matches the
        <em>ink colour</em> of the word — <strong>ignore what the word says!</strong>
      </div>
      <div class="d-flex justify-center mb-sm" style="gap:24px">
        <div class="stat-chip">Question: <span class="stat-val" id="stRound">0/${this._TOTAL_ROUNDS}</span></div>
        <div class="stat-chip">Score: <span class="stat-val" id="stScore">0</span></div>
      </div>
      <div class="stroop-question">What colour is the ink?</div>
      <div class="stroop-word" id="stroopWord">—</div>
      <div class="stroop-options" id="stroopOptions"></div>
      <div class="text-center mt-sm" id="stFeedback"
           style="font-size:var(--fs-md);font-weight:700;min-height:32px;"></div>`;
  },

  _nextRound() {
    const s = this._state;
    if (s.round >= this._TOTAL_ROUNDS) { this._finish(); return; }
    s.round++;
    s._answered = false;

    const colors = this._COLORS;

    // Pick ink colour and word colour (they differ — that's the challenge)
    const inkColor  = colors[Math.floor(Math.random() * colors.length)];
    let   wordColor = colors[Math.floor(Math.random() * colors.length)];
    while (wordColor === inkColor) {
      wordColor = colors[Math.floor(Math.random() * colors.length)];
    }

    s.inkColor = inkColor;
    s._startTime = Date.now();

    // Build 4 answer options (always includes the correct ink colour)
    const others  = colors.filter(c => c !== inkColor).sort(() => Math.random() - 0.5).slice(0, 3);
    const options = [...others, inkColor].sort(() => Math.random() - 0.5);

    // Update UI
    const roundEl = this._container.querySelector('#stRound');
    const scoreEl = this._container.querySelector('#stScore');
    const fbEl    = this._container.querySelector('#stFeedback');
    const wordEl  = this._container.querySelector('#stroopWord');
    const optsEl  = this._container.querySelector('#stroopOptions');

    if (roundEl) roundEl.textContent = `${s.round}/${this._TOTAL_ROUNDS}`;
    if (scoreEl) scoreEl.textContent = s.score;
    if (fbEl)    fbEl.textContent = '';

    // Display the word in the ink colour
    if (wordEl) {
      wordEl.textContent  = wordColor.name;
      wordEl.style.color  = inkColor.hex;
    }

    // Render option buttons
    if (optsEl) {
      optsEl.innerHTML = options.map(c => `
        <button class="stroop-opt" data-name="${c.name}"
                style="background:${c.hex}">${c.name}</button>
      `).join('');

      optsEl.querySelectorAll('.stroop-opt').forEach(btn => {
        btn.addEventListener('click', () => this._handleAnswer(btn.dataset.name));
      });
    }
  },

  _handleAnswer(colorName) {
    const s = this._state;
    if (s._answered) return;
    s._answered = true;

    const elapsed  = (Date.now() - s._startTime) / 1000;
    const correct  = colorName === s.inkColor.name;
    const fbEl     = this._container.querySelector('#stFeedback');

    // Lock buttons and highlight
    this._container.querySelectorAll('.stroop-opt').forEach(btn => {
      btn.disabled = true;
      if (btn.dataset.name === s.inkColor.name) {
        btn.style.outline = '5px solid #fff';
        btn.style.boxShadow = '0 0 0 8px rgba(0,0,0,0.4)';
      }
    });

    if (correct) {
      const timeBonus = Math.max(0, Math.round(8 - elapsed));
      const pts = 8 + timeBonus;
      s.score   += pts;
      s.correct++;
      if (fbEl) fbEl.innerHTML = `<span style="color:var(--clr-success)">✅ Correct! +${pts} pts</span>`;
    } else {
      if (fbEl) fbEl.innerHTML = `<span style="color:var(--clr-error)">❌ The ink was ${s.inkColor.name}</span>`;
    }

    const scoreEl = this._container.querySelector('#stScore');
    if (scoreEl) scoreEl.textContent = s.score;

    this._timer = setTimeout(() => this._nextRound(), 1200);
  },

  _finish() {
    const s   = this._state;
    const max = this._TOTAL_ROUNDS * 16; // up to 16 pts per round
    const score = Math.round((s.score / max) * 100);
    this._onComplete({
      score: Math.min(100, score),
      detail: `${s.correct} correct out of ${this._TOTAL_ROUNDS} questions.`,
    });
  },
});
