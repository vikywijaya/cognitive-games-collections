/* ============================================================
   Sequence Recall – Simon Says Memory Game
   Watch the colour sequence; repeat it by clicking buttons.
   Sequence grows by 1 each round. 5 rounds total.
   ============================================================ */
'use strict';

GameRegistry.register({
  id: 'sequence-recall',

  _timers: [],
  _state:  null,

  init(container, onComplete) {
    this._onComplete = onComplete;
    this._container  = container;
    this._startGame();
  },

  destroy() {
    this._timers.forEach(clearTimeout);
    this._timers = [];
  },

  _COLORS: [
    { id: 'red',    label: 'Red',    hex: '#E53935' },
    { id: 'blue',   label: 'Blue',   hex: '#1E88E5' },
    { id: 'green',  label: 'Green',  hex: '#43A047' },
    { id: 'yellow', label: 'Yellow', hex: '#F9A825' },
  ],
  _TOTAL_ROUNDS: 6,

  _startGame() {
    this._state = {
      sequence:       [],
      userInput:      [],
      round:          0,
      phase:          'watching', // 'watching' | 'input' | 'done'
      score:          0,
      inputsCorrect:  0,
    };
    this._render();
    this._nextRound();
  },

  _render() {
    this._container.innerHTML = `
      <div class="game-instructions">
        🎯 <strong>How to play:</strong> Watch the colours light up in sequence,
        then tap the same colours in the same order.
      </div>
      <div class="simon-status" id="simonStatus">Get ready…</div>
      <div class="d-flex justify-center mb-md" style="gap:24px">
        <div class="stat-chip">Round: <span class="stat-val" id="simonRound">0/${this._TOTAL_ROUNDS}</span></div>
        <div class="stat-chip">Score: <span class="stat-val" id="simonScore">0</span></div>
      </div>
      <div class="simon-buttons" id="simonButtons">
        ${this._COLORS.map(c => `
          <button class="simon-btn" data-color="${c.id}"
                  style="background:${c.hex}"
                  aria-label="${c.label}" disabled>
            ${c.label}
          </button>`).join('')}
      </div>`;

    this._container.querySelectorAll('.simon-btn').forEach(btn => {
      btn.addEventListener('click', () => this._handleInput(btn.dataset.color));
    });
  },

  _nextRound() {
    const s = this._state;
    if (s.round >= this._TOTAL_ROUNDS) {
      this._finish();
      return;
    }
    s.round++;
    s.userInput = [];
    s.phase = 'watching';

    // Add one random colour to sequence
    const next = this._COLORS[Math.floor(Math.random() * this._COLORS.length)].id;
    s.sequence.push(next);

    this._setStatus(`Round ${s.round} – Watch carefully…`);
    this._updateDisplay();
    this._lockButtons(true);
    this._playSequence();
  },

  _playSequence() {
    const s = this._state;
    const BASE_DELAY = 600;

    s.sequence.forEach((colorId, i) => {
      const showT = this._later(i * (BASE_DELAY + 200) + 600, () => {
        this._flashButton(colorId, true);
      });
      const hideT = this._later(i * (BASE_DELAY + 200) + 600 + BASE_DELAY, () => {
        this._flashButton(colorId, false);
      });
      this._timers.push(showT, hideT);
    });

    const totalTime = s.sequence.length * (BASE_DELAY + 200) + BASE_DELAY + 400;
    const doneT = this._later(totalTime, () => {
      s.phase = 'input';
      this._setStatus('Your turn! Repeat the sequence.');
      this._lockButtons(false);
    });
    this._timers.push(doneT);
  },

  _handleInput(colorId) {
    const s = this._state;
    if (s.phase !== 'input') return;

    const pos = s.userInput.length;
    s.userInput.push(colorId);

    this._flashButton(colorId, true);
    const t = this._later(300, () => this._flashButton(colorId, false));
    this._timers.push(t);

    if (colorId !== s.sequence[pos]) {
      // Wrong – round failed
      s.phase = 'done';
      this._lockButtons(true);
      this._setStatus('❌ Wrong! Moving to next round…');
      const t2 = this._later(1200, () => this._nextRound());
      this._timers.push(t2);
      return;
    }

    if (s.userInput.length === s.sequence.length) {
      // Round complete!
      s.score += s.round * 10;
      s.inputsCorrect++;
      s.phase = 'watching';
      this._lockButtons(true);
      this._updateDisplay();
      this._setStatus(`✅ Correct! +${s.round * 10} points`);
      const t2 = this._later(1000, () => this._nextRound());
      this._timers.push(t2);
    }
  },

  _flashButton(colorId, on) {
    const btn = this._container.querySelector(`.simon-btn[data-color="${colorId}"]`);
    if (btn) btn.classList.toggle('active', on);
  },

  _lockButtons(locked) {
    this._container.querySelectorAll('.simon-btn').forEach(b => {
      b.disabled = locked;
    });
  },

  _setStatus(msg) {
    const el = this._container.querySelector('#simonStatus');
    if (el) el.textContent = msg;
  },

  _updateDisplay() {
    const s = this._state;
    const roundEl = this._container.querySelector('#simonRound');
    const scoreEl = this._container.querySelector('#simonScore');
    if (roundEl) roundEl.textContent = `${s.round}/${this._TOTAL_ROUNDS}`;
    if (scoreEl) scoreEl.textContent = s.score;
  },

  _later(ms, fn) {
    return setTimeout(fn, ms);
  },

  _finish() {
    const s = this._state;
    const maxScore = this._TOTAL_ROUNDS * (this._TOTAL_ROUNDS + 1) * 5; // sum of rounds*10 /2
    const score = Math.round((s.score / maxScore) * 100);
    this._onComplete({
      score: Math.min(100, score),
      detail: `Completed ${s.inputsCorrect}/${this._TOTAL_ROUNDS} rounds correctly.`,
    });
  },
});
