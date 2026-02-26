/* ============================================================
   MindFit – Main Application
   Routes:
     #home          – 3-button landing page
     #daily         – Daily Challenge intro + game sequence
     #games         – All categories (Cognitive Games browser)
     #cat:<id>      – Category game list
     #game:<id>     – Individual game (normal mode)
     #scores        – Score & stats dashboard
   ============================================================ */
'use strict';

/* ============================================================
   SCORE STORAGE
   ============================================================ */
const Scores = {
  _key:  'mindfit_scores',
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
      best:      prev ? Math.max(prev.best, score) : score,
      last:      score,
      playCount: prev ? (prev.playCount + 1) : 1,
      ts:        Date.now(),
    };
    try { localStorage.setItem(this._key, JSON.stringify(this._data)); } catch (e) {}
  },

  categoryAvg(categoryId) {
    this._load();
    const cat = GAME_CATEGORIES.find(c => c.id === categoryId);
    if (!cat) return 0;
    const played = cat.games.map(g => this._data[g.id]?.best || 0).filter(s => s > 0);
    if (!played.length) return 0;
    return Math.round(played.reduce((a, b) => a + b, 0) / played.length);
  },

  overallScore() {
    const avgs = GAME_CATEGORIES.map(c => this.categoryAvg(c.id)).filter(s => s > 0);
    if (!avgs.length) return 0;
    return Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length);
  },

  totalPlays() {
    this._load();
    return Object.values(this._data).reduce((sum, d) => sum + (d.playCount || 0), 0);
  },
};

/* ============================================================
   DAILY CHALLENGE STATE  (module-level, not persisted to hash)
   ============================================================ */
let _challenge = null;   // { games: [...gameMeta], index, scores: [] }

/* ============================================================
   ACTIVE GAME TEARDOWN
   ============================================================ */
let _activeGame = null;
function teardownGame() {
  if (_activeGame && typeof _activeGame.destroy === 'function') {
    try { _activeGame.destroy(); } catch (e) {}
  }
  _activeGame = null;
}

/* ============================================================
   DOM REFS & HELPERS
   ============================================================ */
const main    = document.getElementById('appMain');
const btnBack = document.getElementById('btnBack');
const btnHome = document.getElementById('btnHome');
const appLogo = document.getElementById('appLogo');

function setHeader({ showBack = false, showHome = false }) {
  btnBack.style.visibility = showBack  ? 'visible' : 'hidden';
  btnHome.style.visibility = showHome ? 'visible' : 'hidden';
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function scoreStar(score) {
  if (!score) return '';
  if (score >= 90) return '⭐⭐⭐';
  if (score >= 70) return '⭐⭐';
  return '⭐';
}

function feedbackMsg(score) {
  if (score >= 90) return 'Excellent! Your mind is razor-sharp! 🎉';
  if (score >= 75) return 'Great job! Keep practising! 👏';
  if (score >= 55) return 'Good effort! You\'re improving! 💪';
  return 'Keep going – practice makes perfect! 🌱';
}

function timeAgo(ts) {
  if (!ts) return '—';
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1)    return 'Just now';
  if (mins < 60)   return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)    return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ============================================================
   VIEW: HOME  (3-button landing page)
   ============================================================ */
function renderHome() {
  teardownGame();
  _challenge = null;
  setHeader({ showBack: false, showHome: false });

  const overall    = Scores.overallScore();
  const totalPlays = Scores.totalPlays();

  main.innerHTML = `
    <div class="home-landing animate-fade-in">

      <!-- Hero -->
      <div class="landing-hero">
        <div class="landing-brain">🧠</div>
        <h2 class="landing-title">Welcome to MindFit</h2>
        <p class="landing-subtitle">Daily brain exercises to keep your mind sharp, focused, and healthy.</p>
        <div class="landing-stats-row">
          <div class="landing-stat">
            <span class="landing-stat-val">${overall || '—'}</span>
            <span class="landing-stat-lbl">Brain Score</span>
          </div>
          <div class="landing-stat-divider"></div>
          <div class="landing-stat">
            <span class="landing-stat-val">${totalPlays}</span>
            <span class="landing-stat-lbl">Games Played</span>
          </div>
          <div class="landing-stat-divider"></div>
          <div class="landing-stat">
            <span class="landing-stat-val">${GAME_CATEGORIES.flatMap(c=>c.games).length}</span>
            <span class="landing-stat-lbl">Games Available</span>
          </div>
        </div>
      </div>

      <!-- 3 Main Buttons -->
      <div class="main-menu">

        <button class="menu-btn menu-btn--daily" id="btnDaily" aria-label="Start Daily Challenge">
          <div class="menu-btn-icon">📅</div>
          <div class="menu-btn-body">
            <div class="menu-btn-title">Daily Challenge</div>
            <div class="menu-btn-desc">Play 5 random games picked for today. Track your daily progress!</div>
          </div>
          <div class="menu-btn-arrow">›</div>
        </button>

        <button class="menu-btn menu-btn--games" id="btnGames" aria-label="Browse all cognitive games">
          <div class="menu-btn-icon">🎮</div>
          <div class="menu-btn-body">
            <div class="menu-btn-title">Cognitive Games</div>
            <div class="menu-btn-desc">Browse all ${GAME_CATEGORIES.flatMap(c=>c.games).length} games across ${GAME_CATEGORIES.length} categories.</div>
          </div>
          <div class="menu-btn-arrow">›</div>
        </button>

        <button class="menu-btn menu-btn--scores" id="btnScores" aria-label="View your scores">
          <div class="menu-btn-icon">🏆</div>
          <div class="menu-btn-body">
            <div class="menu-btn-title">My Scores</div>
            <div class="menu-btn-desc">See your best scores, history, and performance by category.</div>
          </div>
          <div class="menu-btn-arrow">›</div>
        </button>

      </div>

    </div>`;

  document.getElementById('btnDaily').addEventListener('click',  () => navigate('#daily'));
  document.getElementById('btnGames').addEventListener('click',  () => navigate('#games'));
  document.getElementById('btnScores').addEventListener('click', () => navigate('#scores'));
}

/* ============================================================
   VIEW: DAILY CHALLENGE
   ============================================================ */
function _buildDailyGames() {
  // Pick one game per category (5 categories → 5 games), randomised by day seed
  const today     = new Date();
  const daySeed   = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  let   rngState  = daySeed;
  const rng = () => { rngState = (rngState * 1664525 + 1013904223) & 0xffffffff; return Math.abs(rngState) / 0x7fffffff; };

  return GAME_CATEGORIES.map(cat => {
    const idx = Math.floor(rng() * cat.games.length);
    return { ...cat.games[idx], catColor: cat.color, catIcon: cat.icon, catName: cat.name };
  });
}

function renderDailyIntro() {
  teardownGame();
  setHeader({ showBack: true, showHome: true });

  const games   = _buildDailyGames();
  _challenge    = { games, index: 0, scores: [] };

  const today   = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const gameList = games.map((g, i) => {
    const sc = Scores.get(g.id);
    return `
      <div class="dc-game-row">
        <div class="dc-game-num">${i + 1}</div>
        <div class="dc-game-icon" style="color:${esc(g.catColor)}">${g.catIcon}</div>
        <div class="dc-game-info">
          <div class="dc-game-name">${esc(g.name)}</div>
          <div class="dc-game-cat" style="color:${esc(g.catColor)}">${esc(g.catName)}</div>
        </div>
        <div class="dc-game-best">${sc ? `Best: ${sc.best}%` : 'New!'}</div>
      </div>`;
  }).join('');

  main.innerHTML = `
    <div class="daily-intro animate-fade-in">
      <div class="daily-header">
        <div class="daily-icon">📅</div>
        <h2>Daily Challenge</h2>
        <p class="daily-date">${today}</p>
        <p class="daily-sub">Complete all 5 games to earn your daily brain score!</p>
      </div>

      <div class="dc-game-list">
        ${gameList}
      </div>

      <div class="text-center mt-lg">
        <button class="btn btn-accent btn-lg" id="btnStartChallenge">
          🚀 Start Challenge
        </button>
      </div>
    </div>`;

  document.getElementById('btnStartChallenge').addEventListener('click', () => {
    navigate('#daily-play');
  });
}

function renderDailyGame() {
  if (!_challenge) { navigate('#daily'); return; }

  const { games, index } = _challenge;
  if (index >= games.length) { renderDailyResult(); return; }

  const gameMeta = games[index];
  const impl     = GameRegistry.get(gameMeta.id);
  teardownGame();
  setHeader({ showBack: false, showHome: false }); // lock nav during challenge

  main.innerHTML = `
    <!-- Progress bar -->
    <div class="dc-progress-bar-wrap">
      ${games.map((g, i) => `
        <div class="dc-progress-step ${i < index ? 'done' : i === index ? 'active' : ''}"
             style="--cat-c:${esc(g.catColor)}">
          <div class="dc-progress-dot">${i < index ? '✓' : i + 1}</div>
          <div class="dc-progress-lbl">${esc(g.name)}</div>
        </div>
      `).join('')}
    </div>

    <div class="game-view-header animate-fade-in">
      <div class="game-view-title">${gameMeta.catIcon} ${esc(gameMeta.name)}</div>
      <div class="stat-chip">Game <span class="stat-val">${index + 1}</span> of ${games.length}</div>
    </div>
    <div class="game-container" id="gameContainer"></div>`;

  const container = document.getElementById('gameContainer');

  if (!impl) {
    container.innerHTML = `<div class="text-center" style="padding:var(--sp-xl)">
      <p style="font-size:60px">🚧</p>
      <h3>Game coming soon!</h3>
      <button class="btn btn-primary mt-md" id="btnSkipGame">Skip →</button>
    </div>`;
    document.getElementById('btnSkipGame').addEventListener('click', () => {
      _challenge.scores.push(0);
      _challenge.index++;
      navigate('#daily-play');
    });
    return;
  }

  function onComplete(result) {
    const score = Math.min(100, Math.max(0, Math.round(result.score || 0)));
    Scores.save(gameMeta.id, score);
    _challenge.scores.push(score);

    container.innerHTML = `
      <div class="result-screen animate-bounce">
        <div class="result-icon">${score >= 75 ? '🏆' : score >= 50 ? '👏' : '💪'}</div>
        <h2>${score >= 75 ? 'Excellent!' : score >= 50 ? 'Well done!' : 'Keep going!'}</h2>
        <div class="result-score-display">${score}<small style="font-size:0.5em">%</small></div>
        <p>${feedbackMsg(score)}</p>
        ${result.detail ? `<p style="font-size:var(--fs-xs);color:var(--clr-text-muted)">${esc(result.detail)}</p>` : ''}
        <div class="result-actions mt-sm">
          ${_challenge.index + 1 < games.length
            ? `<button class="btn btn-accent btn-lg" id="btnNextGame">Next Game → (${_challenge.index + 2}/${games.length})</button>`
            : `<button class="btn btn-success btn-lg" id="btnNextGame">See Final Results 🏁</button>`
          }
        </div>
      </div>`;

    _challenge.index++;
    document.getElementById('btnNextGame').addEventListener('click', () => {
      navigate('#daily-play');
    });
  }

  _activeGame = impl;
  impl.init(container, onComplete);
}

function renderDailyResult() {
  teardownGame();
  setHeader({ showBack: false, showHome: true });

  const { games, scores } = _challenge;
  const avg = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  const rows = games.map((g, i) => {
    const sc = scores[i] ?? '—';
    return `
      <div class="dc-result-row">
        <div class="dc-result-icon" style="color:${esc(g.catColor)}">${g.catIcon}</div>
        <div class="dc-result-name">${esc(g.name)}</div>
        <div class="dc-result-score" style="color:${sc >= 75 ? 'var(--clr-success)' : sc >= 50 ? 'var(--clr-warning)' : 'var(--clr-error)'}">
          ${sc}${typeof sc === 'number' ? '%' : ''}
        </div>
        <div class="dc-result-stars">${typeof sc === 'number' ? scoreStar(sc) : ''}</div>
      </div>`;
  }).join('');

  main.innerHTML = `
    <div class="daily-result animate-bounce text-center">
      <div style="font-size:80px">${avg >= 75 ? '🏆' : avg >= 50 ? '🌟' : '💪'}</div>
      <h2>Challenge Complete!</h2>
      <div class="dc-final-score">${avg}<small style="font-size:0.45em">%</small></div>
      <p style="font-size:var(--fs-md);color:var(--clr-text-muted)">${feedbackMsg(avg)}</p>

      <div class="dc-result-list mt-lg">
        ${rows}
      </div>

      <div class="result-actions mt-lg">
        <button class="btn btn-accent btn-lg" id="btnDailyAgain">🔄 Redo Challenge</button>
        <button class="btn btn-outline"        id="btnGoHome">🏠 Home</button>
      </div>
    </div>`;

  document.getElementById('btnDailyAgain').addEventListener('click', () => {
    _challenge = { games: _challenge.games, index: 0, scores: [] };
    navigate('#daily-play');
  });
  document.getElementById('btnGoHome').addEventListener('click', () => navigate('#home'));
}

/* ============================================================
   VIEW: COGNITIVE GAMES  (all categories browser)
   ============================================================ */
function renderGames() {
  teardownGame();
  setHeader({ showBack: true, showHome: true });

  const catSections = GAME_CATEGORIES.map(cat => {
    const avg      = Scores.categoryAvg(cat.id);
    const gameRows = cat.games.map(game => {
      const sc         = Scores.get(game.id);
      const badgeClass = { Easy: 'badge-easy', Medium: 'badge-medium', Hard: 'badge-hard' }[game.difficulty] || 'badge-easy';
      return `
        <div class="game-card" style="--cat-color:${esc(cat.color)}">
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

    return `
      <section class="cat-section animate-fade-in" id="cat-${esc(cat.id)}">
        <div class="cat-section-header" style="border-left:6px solid ${esc(cat.color)}">
          <span class="cat-section-icon">${cat.icon}</span>
          <div>
            <h3 class="cat-section-name">${esc(cat.name)}</h3>
            <p class="cat-section-desc">${esc(cat.description)}</p>
          </div>
          ${avg > 0
            ? `<div class="cat-section-avg" style="background:${esc(cat.color)}">Avg ${avg}%</div>`
            : ''}
        </div>
        <div class="games-list">${gameRows}</div>
      </section>`;
  }).join('');

  main.innerHTML = `
    <div class="games-view-header animate-fade-in">
      <h2>🎮 Cognitive Games</h2>
      <p>Choose any game across all categories.</p>
      <!-- Category jump links -->
      <div class="cat-jump-links">
        ${GAME_CATEGORIES.map(c => `
          <a class="cat-jump-link" href="#cat-anchor-${esc(c.id)}"
             style="background:${esc(c.color)}"
             data-anchor="cat-${esc(c.id)}">
            ${c.icon} ${esc(c.name)}
          </a>`).join('')}
      </div>
    </div>
    ${catSections}`;

  // Smooth scroll anchors
  main.querySelectorAll('.cat-jump-link').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const target = document.getElementById(a.dataset.anchor);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Play buttons
  main.querySelectorAll('.play-btn').forEach(btn => {
    btn.addEventListener('click', () => navigate(`#game:${btn.dataset.game}`));
  });
}

/* ============================================================
   VIEW: CATEGORY  (drilled from Games view or elsewhere)
   ============================================================ */
function renderCategory(catId) {
  teardownGame();
  const cat = GAME_CATEGORIES.find(c => c.id === catId);
  if (!cat) { navigate('#games'); return; }
  setHeader({ showBack: true, showHome: true });

  const gameCards = cat.games.map(game => {
    const sc         = Scores.get(game.id);
    const badgeClass = { Easy: 'badge-easy', Medium: 'badge-medium', Hard: 'badge-hard' }[game.difficulty] || 'badge-easy';
    return `
      <div class="game-card" style="--cat-color:${esc(cat.color)}">
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

/* ============================================================
   VIEW: INDIVIDUAL GAME
   ============================================================ */
function renderGame(gameId) {
  teardownGame();
  setHeader({ showBack: true, showHome: true });

  let catColor = 'var(--clr-primary)';
  let catId    = null;
  for (const cat of GAME_CATEGORIES) {
    if (cat.games.some(g => g.id === gameId)) {
      catColor = cat.color;
      catId    = cat.id;
      break;
    }
  }

  const gameMeta = GAME_CATEGORIES.flatMap(c => c.games).find(g => g.id === gameId);
  if (!gameMeta) { navigate('#games'); return; }

  const impl = GameRegistry.get(gameId);
  if (!impl) {
    main.innerHTML = `
      <div class="game-container text-center">
        <p style="font-size:var(--fs-xl);margin:var(--sp-xl) 0;">🚧</p>
        <h2>Coming Soon!</h2>
        <p style="margin:var(--sp-md) 0;color:var(--clr-text-muted)">
          "${esc(gameMeta.name)}" is not available yet. Check back later!
        </p>
        <button class="btn btn-primary mt-md" id="btnBackCat">← Back</button>
      </div>`;
    document.getElementById('btnBackCat').addEventListener('click', () => history.back());
    return;
  }

  const sc = Scores.get(gameId);
  main.innerHTML = `
    <div class="game-view-header animate-fade-in">
      <div class="game-view-title">${esc(gameMeta.name)}</div>
      <div class="game-stats">
        <div class="stat-chip">Best: <span class="stat-val">${sc ? sc.best + '%' : '—'}</span></div>
        <div class="stat-chip">Played: <span class="stat-val">${sc ? sc.playCount + '×' : '0×'}</span></div>
      </div>
    </div>
    <div class="game-container" id="gameContainer"></div>`;

  const container = document.getElementById('gameContainer');

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
          <button class="btn btn-outline"  id="btnBackTo">← Back</button>
        </div>
      </div>`;

    document.getElementById('btnPlayAgain').addEventListener('click', () => {
      container.innerHTML = '';
      _activeGame = impl;
      impl.init(container, onComplete);
    });
    document.getElementById('btnBackTo').addEventListener('click', () => history.back());
  }

  _activeGame = impl;
  impl.init(container, onComplete);
}

/* ============================================================
   VIEW: SCORES DASHBOARD
   ============================================================ */
function renderScores() {
  teardownGame();
  setHeader({ showBack: true, showHome: true });

  const overall    = Scores.overallScore();
  const totalPlays = Scores.totalPlays();

  /* Category summary cards */
  const catCards = GAME_CATEGORIES.map(cat => {
    const avg       = Scores.categoryAvg(cat.id);
    const gamesPlayed = cat.games.filter(g => Scores.get(g.id)).length;
    return `
      <div class="score-cat-card" style="border-top:4px solid ${esc(cat.color)}">
        <div class="score-cat-top">
          <span class="score-cat-icon">${cat.icon}</span>
          <div>
            <div class="score-cat-name">${esc(cat.name)}</div>
            <div class="score-cat-meta">${gamesPlayed} / ${cat.games.length} games played</div>
          </div>
          <div class="score-cat-avg" style="color:${esc(cat.color)}">
            ${avg > 0 ? avg + '%' : '—'}
          </div>
        </div>
        <div class="cat-score-bar-wrap mt-sm">
          <div class="cat-score-bar" style="width:${avg}%;background:${esc(cat.color)}"></div>
        </div>
      </div>`;
  }).join('');

  /* Per-game detail rows */
  const allGames = GAME_CATEGORIES.flatMap(cat =>
    cat.games.map(g => ({ ...g, catColor: cat.color, catIcon: cat.icon, catName: cat.name }))
  );

  const gameRows = allGames.map(g => {
    const sc = Scores.get(g.id);
    if (!sc) {
      return `
        <tr class="score-row score-row--unplayed">
          <td class="score-row-icon">${g.catIcon}</td>
          <td class="score-row-name">${esc(g.name)}<br><small style="color:${esc(g.catColor)}">${esc(g.catName)}</small></td>
          <td colspan="3" style="color:var(--clr-text-muted);font-size:var(--fs-xs)">Not played yet</td>
          <td>
            <button class="play-btn-sm" style="background:${esc(g.catColor)}"
                    data-game="${esc(g.id)}">▶ Play</button>
          </td>
        </tr>`;
    }
    const barColor = sc.best >= 75 ? 'var(--clr-success)' : sc.best >= 50 ? 'var(--clr-warning)' : 'var(--clr-error)';
    return `
      <tr class="score-row">
        <td class="score-row-icon">${g.catIcon}</td>
        <td class="score-row-name">${esc(g.name)}<br><small style="color:${esc(g.catColor)}">${esc(g.catName)}</small></td>
        <td class="score-row-best" style="color:${barColor};font-weight:700">${sc.best}% ${scoreStar(sc.best)}</td>
        <td class="score-row-last">${sc.last}%</td>
        <td class="score-row-plays">${sc.playCount}× <small style="color:var(--clr-text-muted)">${timeAgo(sc.ts)}</small></td>
        <td>
          <button class="play-btn-sm" style="background:${esc(g.catColor)}"
                  data-game="${esc(g.id)}">▶ Play</button>
        </td>
      </tr>`;
  }).join('');

  main.innerHTML = `
    <div class="scores-view animate-fade-in">

      <!-- Overall Score Banner -->
      <div class="scores-banner">
        <div class="scores-banner-left">
          <div class="scores-overall-num">${overall || '—'}</div>
          <div class="scores-overall-lbl">Overall Brain Score</div>
          <div class="scores-overall-sub">${feedbackMsg(overall)}</div>
        </div>
        <div class="scores-banner-right">
          <div class="scores-summary-item">
            <span class="scores-summary-val">${totalPlays}</span>
            <span class="scores-summary-lbl">Total Plays</span>
          </div>
          <div class="scores-summary-item">
            <span class="scores-summary-val">${allGames.filter(g => Scores.get(g.id)).length}</span>
            <span class="scores-summary-lbl">Games Tried</span>
          </div>
          <div class="scores-summary-item">
            <span class="scores-summary-val">${allGames.length}</span>
            <span class="scores-summary-lbl">Total Games</span>
          </div>
        </div>
      </div>

      <!-- Category Averages -->
      <h3 class="section-title" style="text-align:left;margin-bottom:var(--sp-sm)">Performance by Category</h3>
      <div class="score-cat-grid">${catCards}</div>

      <!-- Per-game table -->
      <h3 class="section-title" style="text-align:left;margin:var(--sp-lg) 0 var(--sp-sm)">Game Details</h3>
      <div class="score-table-wrap">
        <table class="score-table">
          <thead>
            <tr>
              <th></th>
              <th>Game</th>
              <th>Best Score</th>
              <th>Last Score</th>
              <th>Plays</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${gameRows}</tbody>
        </table>
      </div>

      <div class="text-center mt-lg">
        <button class="btn btn-accent" id="btnPlayNow">🎮 Play a Game</button>
      </div>

    </div>`;

  main.querySelectorAll('.play-btn-sm').forEach(btn => {
    btn.addEventListener('click', () => navigate(`#game:${btn.dataset.game}`));
  });
  document.getElementById('btnPlayNow').addEventListener('click', () => navigate('#games'));
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
  } else if (hash === '#daily') {
    renderDailyIntro();
  } else if (hash === '#daily-play') {
    renderDailyGame();
  } else if (hash === '#games') {
    renderGames();
  } else if (hash === '#scores') {
    renderScores();
  } else if (hash.startsWith('#cat:')) {
    renderCategory(hash.slice(5));
  } else if (hash.startsWith('#game:')) {
    renderGame(hash.slice(6));
  } else {
    navigate('#home');
  }
}

/* ---- Header nav buttons ---- */
btnBack.addEventListener('click', () => { history.back(); });
btnHome.addEventListener('click', () => { navigate('#home'); });
appLogo.style.cursor = 'pointer';
appLogo.addEventListener('click', () => navigate('#home'));

/* ---- Hash change ---- */
window.addEventListener('hashchange', handleRoute);

/* ---- Boot ---- */
handleRoute();
