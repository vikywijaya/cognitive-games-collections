/* ============================================================
   Word Memory
   Phase 1 (Study): Show 10 words for 30 seconds.
   Phase 2 (Recall): Show 20 words (10 original + 10 distractors).
   Player selects all words they saw.
   ============================================================ */
'use strict';

GameRegistry.register({
  id: 'word-memory',

  _timer: null,

  init(container, onComplete) {
    this._onComplete = onComplete;
    this._container  = container;
    this._startGame();
  },

  destroy() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  },

  _WORD_POOL: [
    'Apple','River','Table','Candle','Garden','Music','Bridge','Cloud','Letter','Flower',
    'Window','Castle','Pencil','Ocean','Market','Butter','Lantern','Forest','Button','Pillow',
    'Anchor','Barrel','Carpet','Diamond','Feather','Goblet','Hammer','Island','Jacket','Kitten',
    'Lemon','Mirror','Needle','Orange','Puzzle','Quilt','Ribbon','Silver','Temple','Umbrella',
  ],

  _STUDY_SECS: 30,
  _WORD_COUNT: 10,

  _startGame() {
    // Pick 10 study words + 10 distractor words
    const shuffled = [...this._WORD_POOL].sort(() => Math.random() - 0.5);
    const studyWords      = shuffled.slice(0, this._WORD_COUNT);
    const distractorWords = shuffled.slice(this._WORD_COUNT, this._WORD_COUNT * 2);

    this._state = {
      studyWords,
      distractorWords,
      allWords: [...studyWords, ...distractorWords].sort(() => Math.random() - 0.5),
      selected: new Set(),
      phase:    'study',
      timeLeft: this._STUDY_SECS,
    };

    this._renderStudy();
  },

  _renderStudy() {
    const s = this._state;
    this._container.innerHTML = `
      <div class="game-instructions">
        📖 <strong>Study Phase:</strong> Memorise these ${s.studyWords.length} words.
        You have <span id="wmCountdown">${this._STUDY_SECS}</span> seconds.
      </div>
      <div class="word-memory-list" id="wmStudyList">
        ${s.studyWords.map(w => `<div class="wm-word">${w}</div>`).join('')}
      </div>
      <div class="text-center mt-md">
        <button class="btn btn-primary" id="wmReady">I'm Ready →</button>
      </div>`;

    // Countdown
    this._timer = setInterval(() => {
      s.timeLeft--;
      const el = this._container.querySelector('#wmCountdown');
      if (el) el.textContent = s.timeLeft;
      if (s.timeLeft <= 0) {
        clearInterval(this._timer);
        this._renderRecall();
      }
    }, 1000);

    this._container.querySelector('#wmReady').addEventListener('click', () => {
      clearInterval(this._timer);
      this._renderRecall();
    });
  },

  _renderRecall() {
    const s = this._state;
    s.phase  = 'recall';
    s.selected.clear();

    this._container.innerHTML = `
      <div class="game-instructions">
        🔍 <strong>Recall Phase:</strong> Tap all the words you saw.
        ${s.allWords.length} words shown – ${s.studyWords.length} are from the study list.
      </div>
      <div class="d-flex flex-wrap gap-sm justify-center" id="wmOptions">
        ${s.allWords.map(w => `
          <button class="wm-option" data-word="${w}">${w}</button>
        `).join('')}
      </div>
      <div class="text-center mt-lg">
        <button class="btn btn-success" id="wmSubmit">Submit Answers</button>
      </div>`;

    this._container.querySelectorAll('.wm-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const w = btn.dataset.word;
        if (s.selected.has(w)) {
          s.selected.delete(w);
          btn.classList.remove('selected');
        } else {
          s.selected.add(w);
          btn.classList.add('selected');
        }
      });
    });

    this._container.querySelector('#wmSubmit').addEventListener('click', () => {
      this._evaluate();
    });
  },

  _evaluate() {
    const s = this._state;
    const studySet  = new Set(s.studyWords);
    let correct = 0;
    let wrong   = 0;

    this._container.querySelectorAll('.wm-option').forEach(btn => {
      const w      = btn.dataset.word;
      const isStudy = studySet.has(w);
      const picked  = s.selected.has(w);
      btn.disabled = true;

      if (isStudy && picked)  { btn.classList.add('correct'); correct++; }
      else if (!isStudy && picked) { btn.classList.add('wrong');   wrong++;   }
      else if (isStudy && !picked) { btn.classList.add('missed'); }
    });

    const score = Math.max(0, Math.round(((correct - wrong) / s.studyWords.length) * 100));

    setTimeout(() => {
      this._onComplete({
        score,
        detail: `Recalled ${correct} of ${s.studyWords.length} words. ${wrong} false alarm${wrong !== 1 ? 's' : ''}.`,
      });
    }, 1800);
  },
});
