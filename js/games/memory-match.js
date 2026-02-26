/* ============================================================
   Memory Match – Card Flip Pair Game
   Flip two cards at a time; find all matching pairs.
   Score based on moves taken (fewer = higher score).
   ============================================================ */
'use strict';

GameRegistry.register({
  id: 'memory-match',

  _timer: null,
  _state: null,

  init(container, onComplete) {
    this._onComplete = onComplete;
    this._container  = container;
    this._startGame();
  },

  destroy() {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
  },

  /* ---- Game Setup ---- */
  _emojis: [
    '🌸','🌞','🍎','🐶','🏆','🎵','🌈','🦋',
    '🍕','🚀','🎨','🌺','🐱','⚽','🎭','🍀',
  ],

  _startGame() {
    const PAIRS = 8; // 16 cards total
    const symbols = this._emojis.slice(0, PAIRS);
    const deck = [...symbols, ...symbols]
      .map((s, i) => ({ id: i, symbol: s, matched: false }))
      .sort(() => Math.random() - 0.5);

    this._state = {
      deck,
      flipped:  [],   // indices of currently face-up unmatched cards
      matched:  0,
      moves:    0,
      locked:   false,
    };

    this._render();
  },

  _render() {
    const s = this._state;
    this._container.innerHTML = `
      <div class="game-instructions">
        🧠 <strong>How to play:</strong> Click two cards to flip them.
        If they match, they stay face up. Find all ${s.deck.length / 2} pairs!
      </div>
      <div class="d-flex justify-center mb-md" style="gap:24px">
        <div class="stat-chip">Moves: <span class="stat-val" id="mmMoves">0</span></div>
        <div class="stat-chip">Pairs: <span class="stat-val" id="mmPairs">0/${s.deck.length / 2}</span></div>
      </div>
      <div class="memory-grid" id="mmGrid"
           style="grid-template-columns:repeat(4,90px)">
      </div>`;

    this._buildGrid();
  },

  _buildGrid() {
    const grid = this._container.querySelector('#mmGrid');
    this._state.deck.forEach((card, idx) => {
      const el = document.createElement('div');
      el.className = 'mem-card' + (card.matched ? ' matched' : '');
      el.innerHTML = `
        <div class="mem-card-inner">
          <div class="mem-card-front">❓</div>
          <div class="mem-card-back">${card.symbol}</div>
        </div>`;
      el.addEventListener('click', () => this._flipCard(idx, el));
      grid.appendChild(el);
      card._el = el;
    });
  },

  _flipCard(idx, el) {
    const s = this._state;
    const card = s.deck[idx];

    if (s.locked || card.matched || s.flipped.includes(idx)) return;

    el.classList.add('flipped');
    s.flipped.push(idx);

    if (s.flipped.length === 2) {
      s.locked = true;
      s.moves++;
      this._updateStats();

      const [a, b] = s.flipped;
      if (s.deck[a].symbol === s.deck[b].symbol) {
        // Match!
        s.deck[a].matched = true;
        s.deck[b].matched = true;
        s.deck[a]._el.classList.add('matched');
        s.deck[b]._el.classList.add('matched');
        s.matched++;
        s.flipped  = [];
        s.locked   = false;
        this._updateStats();

        if (s.matched === s.deck.length / 2) {
          this._timer = setTimeout(() => this._finish(), 600);
        }
      } else {
        // No match – flip back after delay
        this._timer = setTimeout(() => {
          s.deck[a]._el.classList.remove('flipped');
          s.deck[b]._el.classList.remove('flipped');
          s.flipped = [];
          s.locked  = false;
        }, 1000);
      }
    } else {
      this._updateStats();
    }
  },

  _updateStats() {
    const s = this._state;
    const movesEl = this._container.querySelector('#mmMoves');
    const pairsEl = this._container.querySelector('#mmPairs');
    if (movesEl) movesEl.textContent = s.moves;
    if (pairsEl) pairsEl.textContent = `${s.matched}/${s.deck.length / 2}`;
  },

  _finish() {
    const s  = this._state;
    const total = s.deck.length / 2;
    // Perfect = total pairs found in ≤ total moves; each extra move costs points
    const perfect = total;           // minimum possible moves
    const score = Math.max(0, Math.round(100 - ((s.moves - perfect) / perfect) * 50));
    this._onComplete({ score, detail: `Found all pairs in ${s.moves} moves.` });
  },
});
