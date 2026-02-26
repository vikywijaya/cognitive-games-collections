/* ============================================================
   Quick Math – Mental Arithmetic
   Simple arithmetic equations flash on screen.
   Player picks the correct answer from 4 choices.
   20 questions; 8-second timer per question.
   Score: accuracy + speed.
   ============================================================ */
'use strict';

GameRegistry.register({
  id: 'quick-math',

  _timer:     null,
  _barTimer:  null,

  init(container, onComplete) {
    this._onComplete = onComplete;
    this._container  = container;
    this._startGame();
  },

  destroy() {
    if (this._timer)    { clearTimeout(this._timer);    this._timer    = null; }
    if (this._barTimer) { clearInterval(this._barTimer); this._barTimer = null; }
  },

  _TOTAL_ROUNDS: 20,
  _TIME_PER_Q:   8,   // seconds

  _startGame() {
    this._state = {
      round:    0,
      correct:  0,
      score:    0,
      answered: false,
      timeLeft: this._TIME_PER_Q,
    };
    this._render();
    this._nextQuestion();
  },

  _render() {
    this._container.innerHTML = `
      <div class="game-instructions">
        ➕ <strong>How to play:</strong> Solve each equation and tap the correct answer
        before time runs out!
      </div>
      <div class="d-flex justify-center mb-sm" style="gap:24px">
        <div class="stat-chip">Q: <span class="stat-val" id="qmRound">0/${this._TOTAL_ROUNDS}</span></div>
        <div class="stat-chip">Score: <span class="stat-val" id="qmScore">0</span></div>
        <div class="stat-chip">⏱ <span class="stat-val" id="qmTime">${this._TIME_PER_Q}s</span></div>
      </div>
      <div class="math-timer-bar-wrap">
        <div class="math-timer-bar" id="qmBar" style="width:100%"></div>
      </div>
      <div class="math-equation" id="qmEquation">—</div>
      <div class="math-options" id="qmOptions"></div>
      <div class="text-center mt-sm" id="qmFeedback"
           style="font-size:var(--fs-md);font-weight:700;min-height:32px;"></div>`;
  },

  _generateQuestion() {
    const ops = ['+', '-', '×'];
    const op  = ops[Math.floor(Math.random() * ops.length)];
    let a, b, answer;

    switch (op) {
      case '+':
        a = Math.floor(Math.random() * 50) + 1;
        b = Math.floor(Math.random() * 50) + 1;
        answer = a + b;
        break;
      case '-':
        a = Math.floor(Math.random() * 50) + 20;
        b = Math.floor(Math.random() * (a - 1)) + 1;
        answer = a - b;
        break;
      case '×':
        a = Math.floor(Math.random() * 10) + 2;
        b = Math.floor(Math.random() * 10) + 2;
        answer = a * b;
        break;
    }

    return { equation: `${a} ${op} ${b} = ?`, answer };
  },

  _makeOptions(answer) {
    const opts = new Set([answer]);
    while (opts.size < 4) {
      const delta = Math.floor(Math.random() * 15) + 1;
      const fake  = Math.random() < 0.5 ? answer + delta : Math.max(0, answer - delta);
      opts.add(fake);
    }
    return [...opts].sort(() => Math.random() - 0.5);
  },

  _nextQuestion() {
    const s = this._state;
    if (s.round >= this._TOTAL_ROUNDS) { this._finish(); return; }

    if (this._timer)    { clearTimeout(this._timer);    }
    if (this._barTimer) { clearInterval(this._barTimer); }

    s.round++;
    s.answered = false;
    s.timeLeft = this._TIME_PER_Q;

    const q    = this._generateQuestion();
    const opts = this._makeOptions(q.answer);
    s.currentAnswer = q.answer;
    s._startTime    = Date.now();

    // Update display
    const roundEl = this._container.querySelector('#qmRound');
    const scoreEl = this._container.querySelector('#qmScore');
    const timeEl  = this._container.querySelector('#qmTime');
    const eqEl    = this._container.querySelector('#qmEquation');
    const optsEl  = this._container.querySelector('#qmOptions');
    const fbEl    = this._container.querySelector('#qmFeedback');
    const barEl   = this._container.querySelector('#qmBar');

    if (roundEl) roundEl.textContent = `${s.round}/${this._TOTAL_ROUNDS}`;
    if (scoreEl) scoreEl.textContent = s.score;
    if (timeEl)  timeEl.textContent  = `${s.timeLeft}s`;
    if (eqEl)    eqEl.textContent    = q.equation;
    if (fbEl)    fbEl.textContent    = '';
    if (barEl)   { barEl.style.width = '100%'; barEl.style.background = 'var(--clr-success)'; }

    if (optsEl) {
      optsEl.innerHTML = opts.map(o => `
        <button class="math-opt" data-val="${o}">${o}</button>
      `).join('');
      optsEl.querySelectorAll('.math-opt').forEach(btn => {
        btn.addEventListener('click', () => this._handleAnswer(Number(btn.dataset.val), btn));
      });
    }

    // Countdown bar
    const totalMs = this._TIME_PER_Q * 1000;
    this._barTimer = setInterval(() => {
      if (s.answered) { clearInterval(this._barTimer); return; }
      const elapsed = Date.now() - s._startTime;
      const pct     = Math.max(0, 100 - (elapsed / totalMs) * 100);
      s.timeLeft    = Math.max(0, Math.ceil((totalMs - elapsed) / 1000));
      if (barEl)  { barEl.style.width = `${pct}%`;
        barEl.style.background = pct > 50 ? 'var(--clr-success)' : pct > 25 ? 'var(--clr-warning)' : 'var(--clr-error)'; }
      if (timeEl) timeEl.textContent = `${s.timeLeft}s`;
      if (pct <= 0) {
        clearInterval(this._barTimer);
        this._handleTimeout();
      }
    }, 100);
  },

  _handleAnswer(val, btn) {
    const s = this._state;
    if (s.answered) return;
    s.answered = true;
    clearInterval(this._barTimer);

    const elapsed = (Date.now() - s._startTime) / 1000;
    const correct = val === s.currentAnswer;
    const fbEl    = this._container.querySelector('#qmFeedback');

    this._container.querySelectorAll('.math-opt').forEach(b => {
      b.disabled = true;
      if (Number(b.dataset.val) === s.currentAnswer) b.classList.add('correct');
    });

    if (correct) {
      const timeBonus = Math.max(0, Math.round((this._TIME_PER_Q - elapsed) * 1.5));
      const pts = 5 + timeBonus;
      s.score  += pts;
      s.correct++;
      btn.classList.add('correct');
      if (fbEl) fbEl.innerHTML = `<span style="color:var(--clr-success)">✅ Correct! +${pts} pts</span>`;
    } else {
      btn.classList.add('wrong');
      if (fbEl) fbEl.innerHTML = `<span style="color:var(--clr-error)">❌ Answer: ${s.currentAnswer}</span>`;
    }

    const scoreEl = this._container.querySelector('#qmScore');
    if (scoreEl) scoreEl.textContent = s.score;

    this._timer = setTimeout(() => this._nextQuestion(), 1000);
  },

  _handleTimeout() {
    const s = this._state;
    if (s.answered) return;
    s.answered = true;

    const fbEl = this._container.querySelector('#qmFeedback');
    this._container.querySelectorAll('.math-opt').forEach(b => {
      b.disabled = true;
      if (Number(b.dataset.val) === s.currentAnswer) b.classList.add('correct');
    });
    if (fbEl) fbEl.innerHTML = `<span style="color:var(--clr-error)">⏰ Time up! Answer: ${s.currentAnswer}</span>`;

    this._timer = setTimeout(() => this._nextQuestion(), 1000);
  },

  _finish() {
    const s   = this._state;
    const max = this._TOTAL_ROUNDS * (5 + this._TIME_PER_Q * 1.5);
    const score = Math.round((s.score / max) * 100);
    this._onComplete({
      score:  Math.min(100, score),
      detail: `${s.correct} correct out of ${this._TOTAL_ROUNDS} questions.`,
    });
  },
});
