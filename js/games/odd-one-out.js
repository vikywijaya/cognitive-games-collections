/* ============================================================
   Odd One Out
   Show a 3×3 grid of items. 8 share a category; 1 doesn't.
   Find the odd one. 10 rounds. Score based on accuracy + speed.
   ============================================================ */
'use strict';

GameRegistry.register({
  id: 'odd-one-out',

  _timer: null,

  init(container, onComplete) {
    this._onComplete = onComplete;
    this._container  = container;
    this._startGame();
  },

  destroy() {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
  },

  _GROUPS: [
    { cat: 'Fruits',      items: ['🍎','🍊','🍋','🍇','🍓','🍑','🍍','🥭','🍈','🍐','🍒','🫐'] },
    { cat: 'Animals',     items: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🦁','🐯','🦒'] },
    { cat: 'Vehicles',    items: ['🚗','🚕','🚙','🚌','🚎','🏎','🚓','🚑','🚒','🚐','🚚','🛻'] },
    { cat: 'Sports',      items: ['⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🏒','🥏','🎯','🏓'] },
    { cat: 'Musical Instruments', items: ['🎸','🎺','🎻','🥁','🎷','🪗','🎹','🪘','🎵','🎶','🪕','🎤'] },
    { cat: 'Weather',     items: ['☀️','🌤','⛅','🌦','🌧','⛈','🌩','🌨','❄️','🌬','🌪','🌈'] },
    { cat: 'Food',        items: ['🍕','🍔','🌮','🌯','🥗','🍜','🍣','🍱','🥘','🍲','🍛','🫕'] },
    { cat: 'Flowers',     items: ['🌸','🌺','🌻','🌹','🌷','💐','🌼','🪷','🌾','🍀','🌿','☘️'] },
    { cat: 'Buildings',   items: ['🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫','🏭'] },
    { cat: 'Ocean Life',  items: ['🐟','🐠','🐡','🦈','🐙','🦑','🦐','🦞','🦀','🐚','🪸','🐬'] },
  ],

  _TOTAL_ROUNDS: 10,

  _startGame() {
    this._state = {
      round:     0,
      score:     0,
      correct:   0,
      answered:  false,
    };
    this._render();
    this._nextRound();
  },

  _render() {
    this._container.innerHTML = `
      <div class="game-instructions">
        👁️ <strong>How to play:</strong> Tap the item that does <em>not</em> belong
        to the same category as the others.
      </div>
      <div class="d-flex justify-center mb-md" style="gap:24px">
        <div class="stat-chip">Round: <span class="stat-val" id="ooRound">0/${this._TOTAL_ROUNDS}</span></div>
        <div class="stat-chip">Score: <span class="stat-val" id="ooScore">0</span></div>
      </div>
      <div class="text-center mb-md" id="ooQuestion" style="font-size:var(--fs-md);color:var(--clr-text-muted);">
        Which one is different?
      </div>
      <div class="odd-grid" id="ooGrid"></div>
      <div class="text-center mt-md" id="ooFeedback"
           style="font-size:var(--fs-lg);font-weight:700;min-height:36px;"></div>`;
  },

  _nextRound() {
    const s = this._state;
    if (s.round >= this._TOTAL_ROUNDS) { this._finish(); return; }
    s.round++;
    s.answered = false;

    // Pick two different groups
    const shuffledGroups = [...this._GROUPS].sort(() => Math.random() - 0.5);
    const mainGroup = shuffledGroups[0];
    const oddGroup  = shuffledGroups[1];

    // Pick 8 items from main group, 1 from odd group
    const mainItems = [...mainGroup.items].sort(() => Math.random() - 0.5).slice(0, 8);
    const oddItem   = oddGroup.items[Math.floor(Math.random() * oddGroup.items.length)];

    const allItems = [...mainItems, oddItem].sort(() => Math.random() - 0.5);
    s.oddItem   = oddItem;
    s.mainCat   = mainGroup.cat;
    s.oddCat    = oddGroup.cat;
    s._startTime = Date.now();

    // Update display
    const roundEl = this._container.querySelector('#ooRound');
    const scoreEl = this._container.querySelector('#ooScore');
    const fbEl    = this._container.querySelector('#ooFeedback');
    if (roundEl) roundEl.textContent = `${s.round}/${this._TOTAL_ROUNDS}`;
    if (scoreEl) scoreEl.textContent = s.score;
    if (fbEl)    fbEl.textContent = '';

    const grid = this._container.querySelector('#ooGrid');
    grid.innerHTML = '';
    allItems.forEach(item => {
      const el = document.createElement('div');
      el.className = 'odd-item';
      el.textContent = item;
      el.addEventListener('click', () => this._handleAnswer(item, el));
      grid.appendChild(el);
    });
  },

  _handleAnswer(item, el) {
    const s = this._state;
    if (s.answered) return;
    s.answered = true;

    const elapsed = (Date.now() - s._startTime) / 1000; // seconds
    const fbEl    = this._container.querySelector('#ooFeedback');

    if (item === s.oddItem) {
      // Correct — faster = more bonus
      const timeBonus = Math.max(0, Math.round(10 - elapsed));
      const pts = 10 + timeBonus;
      s.score += pts;
      s.correct++;
      el.classList.add('correct');
      if (fbEl) fbEl.innerHTML = `<span style="color:var(--clr-success)">✅ Correct! +${pts} points</span>`;
    } else {
      el.classList.add('wrong');
      // Reveal the correct one
      this._container.querySelectorAll('.odd-item').forEach(e => {
        if (e.textContent === s.oddItem) e.classList.add('correct');
      });
      if (fbEl) fbEl.innerHTML = `<span style="color:var(--clr-error)">❌ The odd one was: ${s.oddItem} (${s.oddCat})</span>`;
    }

    const scoreEl = this._container.querySelector('#ooScore');
    if (scoreEl) scoreEl.textContent = s.score;

    this._timer = setTimeout(() => this._nextRound(), 1500);
  },

  _finish() {
    const s     = this._state;
    const max   = this._TOTAL_ROUNDS * 20; // ~max per round
    const score = Math.round((s.score / max) * 100);
    this._onComplete({
      score: Math.min(100, score),
      detail: `Found ${s.correct} of ${this._TOTAL_ROUNDS} odd items correctly.`,
    });
  },
});
