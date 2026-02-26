/* ============================================================
   MindFit – Game Registry Configuration

   To ADD a new game:
   1. Create the game file in js/games/<your-game-id>.js
   2. In that file, call: GameRegistry.register({ id, name, ... })
   3. Add a script tag in index.html pointing to your file
   4. Add an entry in GAME_CATEGORIES below (inside the right category)
   ============================================================ */

'use strict';

/* ---------- Game Registry ---------- */
window.GameRegistry = (function () {
  const _games = {};

  return {
    register(gameObj) {
      if (!gameObj.id) { console.error('GameRegistry: game must have an id'); return; }
      _games[gameObj.id] = gameObj;
    },
    get(id) { return _games[id] || null; },
    all()   { return Object.values(_games); },
  };
})();

/* ---------- Category & Game Definitions ---------- */
window.GAME_CATEGORIES = [
  {
    id:          'memory',
    name:        'Memory',
    icon:        '🧠',
    color:       '#6A1B9A',
    description: 'Train your short and long-term memory skills',
    games: [
      {
        id:          'memory-match',
        name:        'Card Match',
        description: 'Flip cards and find matching pairs. Tests visual memory.',
        difficulty:  'Easy',
        thumbnail:   '🃏',
      },
      {
        id:          'sequence-recall',
        name:        'Sequence Recall',
        description: 'Watch the light-up pattern and repeat it. Trains working memory.',
        difficulty:  'Medium',
        thumbnail:   '💡',
      },
      {
        id:          'word-memory',
        name:        'Word Memory',
        description: 'Memorise a list of words, then pick them from a larger set.',
        difficulty:  'Medium',
        thumbnail:   '📋',
      },
      // ── Add more memory games here ──
    ],
  },

  {
    id:          'attention',
    name:        'Attention & Focus',
    icon:        '👁️',
    color:       '#1565C0',
    description: 'Sharpen concentration and visual discrimination',
    games: [
      {
        id:          'odd-one-out',
        name:        'Odd One Out',
        description: 'Find the item that does not belong to the group.',
        difficulty:  'Easy',
        thumbnail:   '🔍',
      },
      {
        id:          'color-match',
        name:        'Color Match',
        description: 'Classic Stroop test – tap the ink colour, not the word.',
        difficulty:  'Hard',
        thumbnail:   '🎨',
      },
      {
        id:          'number-hunt',
        name:        'Number Hunt',
        description: 'Tap numbers 1→25 in order as fast as you can (Schulte table).',
        difficulty:  'Medium',
        thumbnail:   '🔢',
      },
      // ── Add more attention games here ──
    ],
  },

  {
    id:          'language',
    name:        'Language & Words',
    icon:        '📝',
    color:       '#2E7D32',
    description: 'Boost verbal fluency and word processing',
    games: [
      {
        id:          'anagram',
        name:        'Anagram',
        description: 'Rearrange scrambled letters to spell a hidden word.',
        difficulty:  'Medium',
        thumbnail:   '🔤',
      },
      {
        id:          'word-search',
        name:        'Word Search',
        description: 'Find hidden words in a grid of letters.',
        difficulty:  'Easy',
        thumbnail:   '🔎',
      },
      // ── Add more language games here ──
    ],
  },

  {
    id:          'speed',
    name:        'Speed & Reaction',
    icon:        '⚡',
    color:       '#E65100',
    description: 'Improve mental processing speed and reaction time',
    games: [
      {
        id:          'quick-math',
        name:        'Quick Math',
        description: 'Solve simple arithmetic as fast as possible. Beat the timer!',
        difficulty:  'Medium',
        thumbnail:   '➕',
      },
      {
        id:          'reaction-time',
        name:        'Reaction Time',
        description: 'Tap the circle the instant it turns green. How fast are you?',
        difficulty:  'Easy',
        thumbnail:   '⏱️',
      },
      // ── Add more speed games here ──
    ],
  },

  {
    id:          'problem',
    name:        'Problem Solving',
    icon:        '🔢',
    color:       '#4E342E',
    description: 'Exercise logical thinking and reasoning',
    games: [
      {
        id:          'number-sequence',
        name:        'Number Sequence',
        description: 'Identify the rule in a number series and pick what comes next.',
        difficulty:  'Medium',
        thumbnail:   '📈',
      },
      {
        id:          'pattern-match',
        name:        'Pattern Match',
        description: 'Choose the emoji that correctly completes the visual pattern.',
        difficulty:  'Hard',
        thumbnail:   '🔷',
      },
      // ── Add more problem-solving games here ──
    ],
  },
];
