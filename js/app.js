/* ============================================================
   MindFit – Main Application
   Hash-based SPA router: #home | #cat:<id> | #game:<id>
   ============================================================ */
'use strict';

/* ---- Persistent score storage ---- */
const Scores = {
  _key: 'mindfit_scores',
  _data: null,

  _load() {
    if (this._data) return;
    try { this._data = JSON.parse(localStorage.getItem(this._key) || '{}'); }
    catch (e) { this._data = {}; }
  },

  get(gameId) {
    this._load();
    return this._data[gameId] || null;
  },

  save(gameId, score) {
    this._load();
    const prev = this._data[gameId];
    this._data[gameId] = {
      best:     prev ? Math.max(prev.best, score) : score,
      last:     score,
      playCount: prev ? (prev.playCount + 1) : 1,
      ts:       Date.now(),
    };
    try { localStorage.setItem(this._key, JSON.stringify(this._data)); } catch (e) {}
  },

  categoryAvg(categoryId) {
    this._load();
    const cat = GAME_CATEGORIES.find(c => c.id === categoryId);
    if (!cat) return 0;
    const scores = cat.games.map(g => this._data[g.id]?.best || 0);
    const played = scores.filter(s => s > 0);
    if (!played.length) return 0;
    return Math.round(played.reduce((a, b) => a + b, 0) / played.length);
  },

  overallScore() {
    const avgs = GAME_CATEGORIES.map(c => this.categoryAvg(c.id)).filter(s => s > 0);
    if (!avgs.length) return 0;
    return Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length);
  },
};

/* ---- Active game teardown ---- */
let _activeGame = null;
function teardownGame() {
  if (_activeGame && typeof _activeGame.destroy === 'function') {
    try { _activeGame.destroy(); } catch (e) {}
  }
  _activeGame = null;
}

/* ---- DOM helpers ---- */
const main      = document.getElementById('appMain');
const btnBack   = document.getElementById('btnBack');
const btnHome   = document.getElementById('btnHome');
const appLogo   = document.getElementById('appLogo');

function setHeader({ showBack = false, showHome = false }) {
  btnBack.style.visibility = showBack ? 'visible' : 'hidden';
  btnHome.style.visibility = showHome ? 'visible' : 'hidden';
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ---- Score badge helpers ---- */
function scoreStar(score) {
  if (score === 0) return '';
  if (score >= 90) return '⭐⭐⭐';
  if (score >= 70) return '⭐⭐';
  return '⭐';
}

function feedbackMsg(score) {
  if (score >= 90) return 'Excellent! Your mind is sharp! 🎉';
  if (score >= 75) return 'Great job! Keep practising! 👏';
  if (score >= 55) return 'Good effort! You\'re improving! 💪';
  return 'Keep going – practice makes perfect! 🌱';
}

/* ============================================================
   VIEWS
   ============================================================ */

/* ---- HOME VIEW ---- */
function renderHome() {
  teardownGame();
  setHeader({ showBack: false, showHome: false });
  const overall = Scores.overallScore();

  const catCards = GAME_CATEGORIES.map(cat => {
    const avg  = Scores.categoryAvg(cat.id);
    const pct  = avg;
    return `
      <div class="category-card animate-fade-in"
           style="--cat-color:${esc(cat.color)}"
           tabindex="0"
           role="button"
           aria-label="Open ${esc(cat.name)} games"
           data-cat="${esc(cat.id)}">
        <div class="cat-icon">${cat.icon}</div>
        <div class="cat-name">${esc(cat.name)}</div>
        <div class="cat-desc">${esc(cat.description)}</div>
        <div class="cat-game-count"
             style="background:${esc(cat.color)}">
          ${cat.games.length} game${cat.games.length !== 1 ? 's' : ''}
        </div>
        <div class="cat-score-bar-wrap">
          <div class="cat-score-bar"
               style="width:${pct}%;background:${esc(cat.color)}"></div>
        </div>
        ${avg > 0 ? `<small style="color:var(--clr-text-muted);font-size:15px;">Best avg: ${avg}% ${scoreStar(avg)}</small>` : '<small style="color:var(--clr-text-muted);font-size:15px;">Not played yet</small>'}
      </div>`;
  }).join('');

  main.innerHTML = `
    <div class="home-hero">
      <h2>Welcome to MindFit!</h2>
      <p>Daily brain exercises to keep your mind sharp, focused, and healthy.</p>
      <div class="brain-score-ring animate-bounce">
        <div class="score-number">${overall || '—'}</div>
        <div class="score-label">${overall ? 'Overall Brain Score' : 'Play games to get your score'}</div>
      </div>
    </div>

    <h2 class="section-title">Choose a Category</h2>
    <div class="category-grid">
      ${catCards}
    </div>`;

  /* category card click / keyboard */
  main.querySelectorAll('.category-card').forEach(card => {
    const open = () => navigate(`#cat:${card.dataset.cat}`);
    card.addEventListener('click', open);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') open(); });
  });
}

/* ---- CATEGORY VIEW ---- */
function renderCategory(catId) {
  teardownGame();
  const cat = GAME_CATEGORIES.find(c => c.id === catId);
  if (!cat) { navigate('#home'); return; }
  setHeader({ showBack: true, showHome: true });

  const gameCards = cat.games.map(game => {
    const sc = Scores.get(game.id);
    const badgeClass = { Easy: 'badge-easy', Medium: 'badge-medium', Hard: 'badge-hard' }[game.difficulty] || 'badge-easy';
    return `
      <div class="game-card" style="--cat-color:${esc(cat.color)}"
           data-game="${esc(game.id)}">
        <div class="game-card-header">
          <div class="game-card-name">${esc(game.name)}</div>
          <span class="game-badge ${badgeClass}">${esc(game.difficulty)}</span>
        </div>
        <div class="game-card-desc">${esc(game.description)}</div>
        <div class="game-card-score">
          ${sc
            ? `Best: <span>${sc.best}%</span> ${scoreStar(sc.best)} &nbsp;|&nbsp; Played: <span>${sc.playCount}×</span>`
            : '<span style="color:var(--clr-text-muted)">Not played yet</span>'}
        </div>
        <button class="play-btn" style="background:${esc(cat.color)}"
                data-game="${esc(game.id)}" aria-label="Play ${esc(game.name)}">
          ▶ Play
        </button>
      </div>`;
  }).join('');

  main.innerHTML = `
    <div class="category-header animate-fade-in">
      <div class="cat-icon-lg">${cat.icon}</div>
      <div class="cat-info">
        <h2>${esc(cat.name)}</h2>
        <p>${esc(cat.description)}</p>
      </div>
    </div>
    <div class="games-list">${gameCards}</div>`;

  main.querySelectorAll('.play-btn').forEach(btn => {
    btn.addEventListener('click', () => navigate(`#game:${btn.dataset.game}`));
  });
}

/* ---- GAME VIEW ---- */
function renderGame(gameId) {
  teardownGame();
  setHeader({ showBack: true, showHome: true });

  /* Find category for colour */
  let catColor = 'var(--clr-primary)';
  let catId    = null;
  for (const cat of GAME_CATEGORIES) {
    if (cat.games.some(g => g.id === gameId)) {
      catColor = cat.color;
      catId    = cat.id;
      break;
    }
  }

  /* Find game meta */
  const gameMeta = GAME_CATEGORIES
    .flatMap(c => c.games)
    .find(g => g.id === gameId);

  if (!gameMeta) { navigate('#home'); return; }

  const impl = GameRegistry.get(gameId);
  if (!impl) {
    main.innerHTML = `
      <div class="game-container text-center">
        <p style="font-size:var(--fs-xl);margin:var(--sp-xl) 0;">🚧</p>
        <h2>Coming Soon!</h2>
        <p style="margin:var(--sp-md) 0;color:var(--clr-text-muted)">
          "${esc(gameMeta.name)}" is not available yet. Check back later!
        </p>
        <button class="btn btn-primary mt-md" id="btnBackCat">← Back to Category</button>
      </div>`;
    document.getElementById('btnBackCat').addEventListener('click', () => navigate(`#cat:${catId}`));
    return;
  }

  const sc = Scores.get(gameId);

  main.innerHTML = `
    <div class="game-view-header animate-fade-in">
      <div class="game-view-title">${gameMeta.icon || ''} ${esc(gameMeta.name)}</div>
      <div class="game-stats">
        <div class="stat-chip">Best: <span class="stat-val">${sc ? sc.best + '%' : '—'}</span></div>
        <div class="stat-chip">Played: <span class="stat-val">${sc ? sc.playCount + '×' : '0×'}</span></div>
      </div>
    </div>
    <div class="game-container" id="gameContainer"></div>`;

  const container = document.getElementById('gameContainer');

  /* onComplete callback passed to each game */
  function onComplete(result) {
    const score = Math.min(100, Math.max(0, Math.round(result.score || 0)));
    Scores.save(gameId, score);

    container.innerHTML = `
      <div class="result-screen animate-bounce">
        <div class="result-icon">${score >= 75 ? '🏆' : score >= 50 ? '👏' : '💪'}</div>
        <h2>Round Complete!</h2>
        <div class="result-score-display">${score}<small style="font-size:0.5em">%</small></div>
        <p>${feedbackMsg(score)}</p>
        ${result.detail ? `<p style="font-size:var(--fs-xs);color:var(--clr-text-muted)">${esc(result.detail)}</p>` : ''}
        <div class="result-actions">
          <button class="btn btn-success" id="btnPlayAgain">▶ Play Again</button>
          <button class="btn btn-outline"  id="btnBackToCategory">← Back to Category</button>
        </div>
      </div>`;

    document.getElementById('btnPlayAgain').addEventListener('click', () => {
      container.innerHTML = '';
      _activeGame = impl;
      impl.init(container, onComplete);
    });
    document.getElementById('btnBackToCategory').addEventListener('click', () => {
      navigate(`#cat:${catId}`);
    });
  }

  _activeGame = impl;
  impl.init(container, onComplete);
}

/* ============================================================
   ROUTER
   ============================================================ */
function navigate(hash) {
  location.hash = hash || '#home';
}

function handleRoute() {
  const hash = location.hash || '#home';

  if (hash === '#home' || hash === '') {
    renderHome();
  } else if (hash.startsWith('#cat:')) {
    renderCategory(hash.slice(5));
  } else if (hash.startsWith('#game:')) {
    renderGame(hash.slice(6));
  } else {
    navigate('#home');
  }
}

/* ---- Back / Home buttons ---- */
btnBack.addEventListener('click', () => { history.back(); });
btnHome.addEventListener('click', () => { navigate('#home'); });

/* ---- Logo click → home ---- */
appLogo.style.cursor = 'pointer';
appLogo.addEventListener('click', () => navigate('#home'));

/* ---- Hash change ---- */
window.addEventListener('hashchange', handleRoute);

/* ---- Initial render ---- */
handleRoute();
