/* ============================================================
   Anagram – Unscramble the Word
   Scrambled letters shown as clickable tiles.
   Click letters in the correct order to spell the word.
   Hint (category) shown. 8 rounds.
   ============================================================ */
'use strict';

GameRegistry.register({
  id: 'anagram',

  _timer: null,

  init(container, onComplete) {
    this._onComplete = onComplete;
    this._container  = container;
    this._startGame();
  },

  destroy() {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
  },

  _WORDS: [
    { word: 'APPLE',    hint: 'A fruit' },
    { word: 'BRIDGE',   hint: 'Connects two sides' },
    { word: 'CANDLE',   hint: 'Gives light when lit' },
    { word: 'GARDEN',   hint: 'Where flowers grow' },
    { word: 'WINDOW',   hint: 'You see through it' },
    { word: 'CLOUDS',   hint: 'In the sky' },
    { word: 'BUTTER',   hint: 'Goes on bread' },
    { word: 'FOREST',   hint: 'Many trees together' },
    { word: 'CASTLE',   hint: 'A grand old building' },
    { word: 'LEMON',    hint: 'A sour yellow fruit' },
    { word: 'MIRROR',   hint: 'Shows your reflection' },
    { word: 'MARKET',   hint: 'A place to buy things' },
    { word: 'GUITAR',   hint: 'A stringed instrument' },
    { word: 'PILLOW',   hint: 'Rest your head on it' },
    { word: 'TURKEY',   hint: 'A large bird' },
    { word: 'PLANET',   hint: 'Orbits a star' },
    { word: 'FLOWER',   hint: 'Blooms in spring' },
    { word: 'BASKET',   hint: 'Holds things' },
    { word: 'SILVER',   hint: 'A precious metal' },
    { word: 'KITTEN',   hint: 'A young cat' },
  ],

  _TOTAL_ROUNDS: 8,

  _startGame() {
    const pool = [...this._WORDS].sort(() => Math.random() - 0.5);
    this._state = {
      pool,
      round:      0,
      score:      0,
      correct:    0,
      wordData:   null,
      letters:    [],   // { char, idx, used }
      answer:     [],   // { char, tileIdx }
      done:       false,
    };
    this._render();
    this._nextRound();
  },

  _render() {
    this._container.innerHTML = `
      <div class="game-instructions">
        🔤 <strong>How to play:</strong> Tap the letter tiles in the correct order
        to spell the hidden word. Tap a placed letter to remove it.
      </div>
      <div class="d-flex justify-center mb-sm" style="gap:24px">
        <div class="stat-chip">Round: <span class="stat-val" id="agRound">0/${this._TOTAL_ROUNDS}</span></div>
        <div class="stat-chip">Score: <span class="stat-val" id="agScore">0</span></div>
      </div>
      <div class="anagram-hint" id="agHint"></div>
      <div class="anagram-answer" id="agAnswer"></div>
      <div class="anagram-letters" id="agLetters"></div>
      <div class="d-flex justify-center gap-sm mt-md" style="flex-wrap:wrap">
        <button class="btn btn-outline" id="agClear">Clear</button>
        <button class="btn btn-success" id="agSubmit" disabled>Check ✓</button>
        <button class="btn btn-primary" id="agSkip">Skip →</button>
      </div>
      <div class="text-center mt-sm" id="agFeedback"
           style="font-size:var(--fs-md);font-weight:700;min-height:32px;"></div>`;

    this._container.querySelector('#agClear').addEventListener('click',  () => this._clearAnswer());
    this._container.querySelector('#agSubmit').addEventListener('click', () => this._checkAnswer());
    this._container.querySelector('#agSkip').addEventListener('click',   () => {
      this._showFeedback(`⏭ Skipped. The word was: ${this._state.wordData.word}`, false);
      this._timer = setTimeout(() => this._nextRound(), 1500);
    });
  },

  _nextRound() {
    const s = this._state;
    if (s.round >= this._TOTAL_ROUNDS) { this._finish(); return; }
    s.round++;
    s.done = false;

    s.wordData = s.pool[(s.round - 1) % s.pool.length];

    // Scramble letters (ensure it's actually scrambled)
    let letters = s.wordData.word.split('').sort(() => Math.random() - 0.5);
    let attempts = 0;
    while (letters.join('') === s.wordData.word && attempts < 20) {
      letters = s.wordData.word.split('').sort(() => Math.random() - 0.5);
      attempts++;
    }

    s.letters = letters.map((ch, i) => ({ char: ch, idx: i, used: false }));
    s.answer  = [];
    s._startTime = Date.now();

    this._updateDisplay();
  },

  _updateDisplay() {
    const s       = this._state;
    const roundEl = this._container.querySelector('#agRound');
    const scoreEl = this._container.querySelector('#agScore');
    const hintEl  = this._container.querySelector('#agHint');
    const ansEl   = this._container.querySelector('#agAnswer');
    const letEl   = this._container.querySelector('#agLetters');
    const fbEl    = this._container.querySelector('#agFeedback');
    const subBtn  = this._container.querySelector('#agSubmit');

    if (roundEl) roundEl.textContent = `${s.round}/${this._TOTAL_ROUNDS}`;
    if (scoreEl) scoreEl.textContent = s.score;
    if (hintEl)  hintEl.textContent  = `💡 Hint: ${s.wordData.hint} (${s.wordData.word.length} letters)`;
    if (fbEl)    fbEl.textContent    = '';

    // Answer slots
    if (ansEl) {
      ansEl.innerHTML = '';
      const wordLen = s.wordData.word.length;
      for (let i = 0; i < wordLen; i++) {
        const slot = document.createElement('div');
        slot.className   = 'anagram-slot';
        slot.dataset.pos = i;
        if (s.answer[i]) {
          slot.textContent = s.answer[i].char;
          slot.addEventListener('click', () => this._removeLetter(i));
        }
        ansEl.appendChild(slot);
      }
    }

    // Letter tiles
    if (letEl) {
      letEl.innerHTML = '';
      s.letters.forEach((tile, i) => {
        const el = document.createElement('div');
        el.className  = 'anagram-letter' + (tile.used ? ' used' : '');
        el.textContent = tile.char;
        el.dataset.tileIdx = i;
        if (!tile.used) {
          el.addEventListener('click', () => this._addLetter(i));
        }
        letEl.appendChild(el);
      });
    }

    // Enable submit when all slots filled
    if (subBtn) subBtn.disabled = s.answer.filter(Boolean).length < s.wordData.word.length;
  },

  _addLetter(tileIdx) {
    const s = this._state;
    if (s.done) return;
    const tile = s.letters[tileIdx];
    if (tile.used) return;

    // Find first empty slot
    const pos = s.answer.findIndex(a => !a);
    const target = pos === -1 ? s.answer.length : pos;
    if (target >= s.wordData.word.length) return;

    tile.used = true;
    s.answer[target] = { char: tile.char, tileIdx };
    this._updateDisplay();
  },

  _removeLetter(pos) {
    const s = this._state;
    if (s.done) return;
    const placed = s.answer[pos];
    if (!placed) return;

    s.letters[placed.tileIdx].used = false;
    s.answer[pos] = null;
    this._updateDisplay();
  },

  _clearAnswer() {
    const s = this._state;
    s.answer.forEach(a => { if (a) s.letters[a.tileIdx].used = false; });
    s.answer = [];
    this._updateDisplay();
  },

  _checkAnswer() {
    const s = this._state;
    const typed = s.answer.filter(Boolean).map(a => a.char).join('');
    if (typed === s.wordData.word) {
      const elapsed = (Date.now() - s._startTime) / 1000;
      const bonus   = Math.max(0, Math.round(15 - elapsed));
      const pts     = 15 + bonus;
      s.score += pts;
      s.correct++;
      s.done = true;
      this._showFeedback(`✅ Correct! +${pts} points`, true);
      this._container.querySelector('#agSubmit').disabled = true;
      this._timer = setTimeout(() => this._nextRound(), 1400);
    } else {
      this._showFeedback('❌ Not quite – try again!', false);
    }
  },

  _showFeedback(msg, good) {
    const fbEl = this._container.querySelector('#agFeedback');
    if (fbEl) {
      fbEl.textContent = msg;
      fbEl.style.color = good ? 'var(--clr-success)' : 'var(--clr-error)';
    }
  },

  _finish() {
    const s   = this._state;
    const max = this._TOTAL_ROUNDS * 30;
    const score = Math.round((s.score / max) * 100);
    this._onComplete({
      score:  Math.min(100, score),
      detail: `Solved ${s.correct} of ${this._TOTAL_ROUNDS} anagrams.`,
    });
  },
});
