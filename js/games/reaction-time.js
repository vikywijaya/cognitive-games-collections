/* ============================================================
   Reaction Time
   A circle stays RED (wait state) for a random 1–4 s delay,
   then turns GREEN — click as fast as possible!
   5 attempts; average reaction time determines score.
   ============================================================ */
'use strict';

GameRegistry.register({
  id: 'reaction-time',

  _waitTimer: null,

  init(container, onComplete) {
    this._onComplete = onComplete;
    this._container  = container;
    this._startGame();
  },

  destroy() {
    if (this._waitTimer) { clearTimeout(this._waitTimer); this._waitTimer = null; }
  },

  _TOTAL_ROUNDS: 5,
  _MIN_WAIT_MS:  1000,
  _MAX_WAIT_MS:  4000,

  _startGame() {
    this._state = {
      round:    0,
      times:    [],
      phase:    'idle',  // 'idle' | 'waiting' | 'go' | 'done'
      startMs:  null,
    };
    this._render();
  },

  _render() {
    const s = this._state;
    this._container.innerHTML = `
      <div class="game-instructions">
        ⚡ <strong>How to play:</strong> Wait for the circle to turn
        <span style="color:var(--clr-success);font-weight:700">GREEN</span>,
        then click it as fast as you can! Don't click early.
      </div>
      <div class="d-flex justify-center mb-sm" style="gap:24px">
        <div class="stat-chip">Round: <span class="stat-val" id="rtRound">0/${this._TOTAL_ROUNDS}</span></div>
        <div class="stat-chip">Best: <span class="stat-val" id="rtBest">—</span></div>
      </div>
      <div class="reaction-area">
        <div class="reaction-msg" id="rtMsg">Press Start when you're ready</div>
        <div class="reaction-circle" id="rtCircle">
          <span id="rtCircleLabel">START</span>
        </div>
        <div id="rtResults" style="font-size:var(--fs-md);color:var(--clr-text-muted);text-align:center;max-width:360px;"></div>
      </div>`;

    const circle = this._container.querySelector('#rtCircle');
    circle.addEventListener('click', () => this._handleCircleClick());
  },

  _handleCircleClick() {
    const s = this._state;

    if (s.phase === 'idle') {
      this._beginRound();
    } else if (s.phase === 'waiting') {
      // Clicked too early!
      clearTimeout(this._waitTimer);
      this._showEarlyClick();
    } else if (s.phase === 'go') {
      const elapsed = Date.now() - s.startMs;
      s.times.push(elapsed);
      s.phase = 'result';
      this._showResult(elapsed);
    }
  },

  _beginRound() {
    const s = this._state;
    if (s.round >= this._TOTAL_ROUNDS) { this._finish(); return; }
    s.round++;
    s.phase  = 'waiting';

    const circle     = this._container.querySelector('#rtCircle');
    const msgEl      = this._container.querySelector('#rtMsg');
    const roundEl    = this._container.querySelector('#rtRound');
    const labelEl    = this._container.querySelector('#rtCircleLabel');

    if (roundEl) roundEl.textContent = `${s.round}/${this._TOTAL_ROUNDS}`;
    if (msgEl)   msgEl.textContent   = 'Wait for GREEN…';
    circle.className = 'reaction-circle waiting';
    if (labelEl) labelEl.textContent = 'Wait…';

    // Random delay
    const delay = this._MIN_WAIT_MS + Math.random() * (this._MAX_WAIT_MS - this._MIN_WAIT_MS);
    this._waitTimer = setTimeout(() => {
      s.phase    = 'go';
      s.startMs  = Date.now();
      circle.className  = 'reaction-circle ready';
      if (labelEl) labelEl.textContent = 'CLICK!';
      if (msgEl)   msgEl.textContent   = 'NOW!';
    }, delay);
  },

  _showEarlyClick() {
    const s      = this._state;
    s.phase      = 'idle';
    const circle  = this._container.querySelector('#rtCircle');
    const msgEl   = this._container.querySelector('#rtMsg');
    const labelEl = this._container.querySelector('#rtCircleLabel');

    circle.className  = 'reaction-circle';
    if (labelEl) labelEl.textContent = 'Too Early!';
    if (msgEl)   msgEl.textContent   = '❌ Too early! Click to try again.';

    // Don't count this round — decrement so it doesn't advance
    this._state.round--;
    setTimeout(() => {
      if (labelEl) labelEl.textContent = 'START';
      s.phase = 'idle';
    }, 1500);
  },

  _showResult(elapsed) {
    const s       = this._state;
    const circle  = this._container.querySelector('#rtCircle');
    const msgEl   = this._container.querySelector('#rtMsg');
    const bestEl  = this._container.querySelector('#rtBest');
    const labelEl = this._container.querySelector('#rtCircleLabel');
    const resEl   = this._container.querySelector('#rtResults');

    circle.className  = 'reaction-circle done';
    if (labelEl) labelEl.textContent = `${elapsed} ms`;
    if (msgEl)   msgEl.textContent   = `Reaction time: ${elapsed} ms`;

    const best = Math.min(...s.times);
    if (bestEl) bestEl.textContent = `${best} ms`;

    const resultLine = `Round ${s.round}: <strong>${elapsed} ms</strong>`;
    if (resEl) resEl.innerHTML += (resEl.innerHTML ? ' &nbsp;|&nbsp; ' : '') + resultLine;

    const isDone = s.round >= this._TOTAL_ROUNDS;

    setTimeout(() => {
      if (isDone) {
        this._finish();
      } else {
        s.phase = 'idle';
        circle.className  = 'reaction-circle';
        if (labelEl) labelEl.textContent = 'Next →';
        if (msgEl)   msgEl.textContent   = 'Click the circle for the next round';
      }
    }, 1200);
  },

  _finish() {
    const s   = this._state;
    const avg = Math.round(s.times.reduce((a, b) => a + b, 0) / s.times.length);
    const best= Math.min(...s.times);

    // Score: < 200ms = 100, 200-350 = 80, 350-500 = 60, 500-700 = 40, >700 = 20
    let score;
    if (avg < 200)      score = 100;
    else if (avg < 300) score = 90;
    else if (avg < 400) score = 75;
    else if (avg < 500) score = 60;
    else if (avg < 650) score = 45;
    else                score = 25;

    this._onComplete({
      score,
      detail: `Average: ${avg} ms · Best: ${best} ms across ${s.times.length} rounds.`,
    });
  },
});
