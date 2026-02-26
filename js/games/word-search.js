/* ============================================================
   Word Search
   10×10 letter grid with 8 hidden words (horizontal, vertical,
   diagonal – both directions). Click the first and last letter
   of a word to highlight it.
   ============================================================ */
'use strict';

GameRegistry.register({
  id: 'word-search',

  init(container, onComplete) {
    this._onComplete = onComplete;
    this._container  = container;
    this._startGame();
  },

  destroy() {},

  _WORD_SETS: [
    ['APPLE', 'PEAR', 'MANGO', 'GRAPE', 'PLUM', 'LEMON', 'BERRY', 'LIME'],
    ['CAT', 'DOG', 'BIRD', 'FISH', 'LION', 'BEAR', 'WOLF', 'DEER'],
    ['RAIN', 'SNOW', 'WIND', 'HAIL', 'MIST', 'FROST', 'STORM', 'CLOUD'],
    ['BOOK', 'DESK', 'PEN', 'MAP', 'LAMP', 'CHAIR', 'CLOCK', 'DOOR'],
  ],

  _GRID_SIZE: 10,
  _DIRECTIONS: [
    [0, 1], [1, 0], [1, 1], [1, -1],     // right, down, diag-right, diag-left
    [0, -1], [-1, 0], [-1, -1], [-1, 1], // and reverses
  ],

  _startGame() {
    const words = this._WORD_SETS[Math.floor(Math.random() * this._WORD_SETS.length)];
    const size  = this._GRID_SIZE;
    const grid  = this._buildGrid(words, size);

    this._state = {
      grid,
      words,
      found:      new Set(),
      wordCells:  {}, // word → Set of 'r,c' strings
      selecting:  null, // { r, c }
    };

    this._render();
  },

  /* ---- Grid builder ---- */
  _buildGrid(words, size) {
    const grid = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => ({ letter: '', partOf: null }))
    );

    // Track which cells belong to which word
    const wordCells = {};

    for (const word of words) {
      let placed = false;
      let tries  = 0;

      while (!placed && tries < 200) {
        tries++;
        const dir = this._DIRECTIONS[Math.floor(Math.random() * this._DIRECTIONS.length)];
        const [dr, dc] = dir;
        const r = Math.floor(Math.random() * size);
        const c = Math.floor(Math.random() * size);

        // Check if word fits
        const endR = r + dr * (word.length - 1);
        const endC = c + dc * (word.length - 1);
        if (endR < 0 || endR >= size || endC < 0 || endC >= size) continue;

        // Check no conflicts
        let ok = true;
        for (let i = 0; i < word.length; i++) {
          const cell = grid[r + dr * i][c + dc * i];
          if (cell.letter && cell.letter !== word[i]) { ok = false; break; }
        }
        if (!ok) continue;

        // Place word
        wordCells[word] = new Set();
        for (let i = 0; i < word.length; i++) {
          const cr = r + dr * i;
          const cc = c + dc * i;
          grid[cr][cc].letter = word[i];
          wordCells[word].add(`${cr},${cc}`);
        }
        placed = true;
      }
    }

    // Fill empty cells with random uppercase letters
    const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!grid[r][c].letter) {
          grid[r][c].letter = alpha[Math.floor(Math.random() * alpha.length)];
        }
      }
    }

    this._state = this._state || {};
    this._state.wordCells = wordCells;
    return grid;
  },

  _render() {
    const s    = this._state;
    const size = this._GRID_SIZE;

    this._container.innerHTML = `
      <div class="game-instructions">
        🔍 <strong>How to play:</strong> Click the <em>first</em> letter of a word,
        then click the <em>last</em> letter to select it. Find all ${s.words.length} words!
      </div>
      <div class="d-flex justify-center mb-sm">
        <div class="stat-chip">Found: <span class="stat-val" id="wsFond">0/${s.words.length}</span></div>
      </div>
      <div class="word-search-wrap">
        <div class="word-search-grid" id="wsGrid"
             style="grid-template-columns:repeat(${size},38px)"></div>
        <div class="word-list" id="wsWordList">
          <h3>Find these words:</h3>
          ${s.words.map(w => `<div class="word-item" id="wi_${w}">${w}</div>`).join('')}
        </div>
      </div>`;

    this._buildGridDOM();
  },

  _buildGridDOM() {
    const s    = this._state;
    const grid = this._container.querySelector('#wsGrid');
    const size = this._GRID_SIZE;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = document.createElement('div');
        cell.className   = 'ws-cell';
        cell.textContent = s.grid[r][c].letter;
        cell.dataset.r   = r;
        cell.dataset.c   = c;
        cell.addEventListener('click', () => this._handleCellClick(r, c, cell));
        s.grid[r][c]._el = cell;
        grid.appendChild(cell);
      }
    }
  },

  _handleCellClick(r, c, cellEl) {
    const s = this._state;

    if (!s.selecting) {
      // First click – start selection
      if (cellEl.classList.contains('found')) return; // already found, reset
      s.selecting = { r, c };
      // Deselect any previously selected
      this._container.querySelectorAll('.ws-cell.selected').forEach(el => el.classList.remove('selected'));
      cellEl.classList.add('selected');
    } else {
      // Second click – try to match
      const { r: r1, c: c1 } = s.selecting;

      if (r1 === r && c1 === c) {
        // Clicked same cell – cancel
        s.selecting = null;
        cellEl.classList.remove('selected');
        return;
      }

      // Build the set of cells between (r1,c1) and (r,c)
      const lineCells = this._getLineCells(r1, c1, r, c);

      if (!lineCells) {
        // Not on a valid line – restart from this cell
        this._container.querySelectorAll('.ws-cell.selected').forEach(el => el.classList.remove('selected'));
        s.selecting = { r, c };
        cellEl.classList.add('selected');
        return;
      }

      const cellKey = (cr, cc) => `${cr},${cc}`;
      const selSet  = new Set(lineCells.map(([cr, cc]) => cellKey(cr, cc)));

      // Check against all word cell sets
      let matched = null;
      for (const word of s.words) {
        if (s.found.has(word)) continue;
        const wSet = s.wordCells[word];
        if (!wSet) continue;
        // Line must match exactly the word's cells
        if (wSet.size === selSet.size && [...wSet].every(k => selSet.has(k))) {
          matched = word;
          break;
        }
      }

      this._container.querySelectorAll('.ws-cell.selected').forEach(el => el.classList.remove('selected'));
      s.selecting = null;

      if (matched) {
        s.found.add(matched);
        // Mark cells as found
        lineCells.forEach(([cr, cc]) => {
          s.grid[cr][cc]._el.classList.add('found');
        });
        // Strike word in list
        const wordItem = this._container.querySelector(`#wi_${matched}`);
        if (wordItem) wordItem.classList.add('found');

        // Update counter
        const fondEl = this._container.querySelector('#wsFond');
        if (fondEl) fondEl.textContent = `${s.found.size}/${s.words.length}`;

        if (s.found.size === s.words.length) {
          setTimeout(() => this._finish(), 600);
        }
      }
    }
  },

  _getLineCells(r1, c1, r2, c2) {
    const dr = r2 - r1;
    const dc = c2 - c1;
    const len = Math.max(Math.abs(dr), Math.abs(dc));
    if (len === 0) return null;

    // Must be straight or diagonal
    const normDr = Math.round(dr / len);
    const normDc = Math.round(dc / len);
    if (normDr * len !== dr || normDc * len !== dc) return null;

    const cells = [];
    for (let i = 0; i <= len; i++) {
      cells.push([r1 + normDr * i, c1 + normDc * i]);
    }
    return cells;
  },

  _finish() {
    const s = this._state;
    const score = Math.round((s.found.size / s.words.length) * 100);
    this._onComplete({
      score,
      detail: `Found ${s.found.size} of ${s.words.length} words.`,
    });
  },
});
