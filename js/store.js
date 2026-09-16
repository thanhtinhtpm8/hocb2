const KEY = "b2vstep:v1";

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed };
  } catch {
    return defaultState();
  }
}

function defaultState() {
  return {
    streak: { count: 0, lastDate: null },
    scores: {},      // key: `${weekPath}/${setId}` -> {percent, correct, total, date}
    srs: {},         // key: `${weekPath}#${wordId}` -> {box, due, remembered}
    settings: { theme: "system" },
    lastVisitedWeek: null,
  };
}

let state = load();

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export const Store = {
  get: () => state,

  getSettings() { return state.settings; },
  setTheme(theme) {
    state.settings.theme = theme;
    persist();
  },

  touchStreak() {
    const today = todayStr();
    if (state.streak.lastDate === today) return state.streak;
    const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (state.streak.lastDate === yest) {
      state.streak.count += 1;
    } else {
      state.streak.count = 1;
    }
    state.streak.lastDate = today;
    persist();
    return state.streak;
  },
  getStreak() { return state.streak; },

  recordScore(weekPath, setId, result) {
    const key = `${weekPath}/${setId}`;
    state.scores[key] = { ...result, date: todayStr() };
    this.touchStreak();
    persist();
  },
  getScore(weekPath, setId) {
    return state.scores[`${weekPath}/${setId}`] || null;
  },
  getAllScores() { return state.scores; },

  // ---- SRS (leitner-ish spaced repetition) ----
  // box 0..4 -> interval days [0,1,3,7,14]
  INTERVALS: [0, 1, 3, 7, 14],
  srsKey(weekPath, wordId) { return `${weekPath}#${wordId}`; },
  getSrs(weekPath, wordId) {
    return state.srs[this.srsKey(weekPath, wordId)] || { box: 0, due: todayStr(), remembered: false };
  },
  markWord(weekPath, wordId, remembered) {
    const k = this.srsKey(weekPath, wordId);
    const cur = state.srs[k] || { box: 0, due: todayStr(), remembered: false };
    let box = remembered ? Math.min(cur.box + 1, this.INTERVALS.length - 1) : 0;
    const days = this.INTERVALS[box];
    const due = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
    state.srs[k] = { box, due, remembered };
    persist();
    return state.srs[k];
  },
  getDueWords(weekPath, wordIds) {
    const today = todayStr();
    return wordIds.filter((id) => {
      const s = state.srs[this.srsKey(weekPath, id)];
      return !s || s.due <= today;
    });
  },
  getLeeches(weekPath, limit = 20) {
    // words marked "not remembered" the most recently and still in box 0
    return Object.entries(state.srs)
      .filter(([k, v]) => k.startsWith(weekPath + "#") && v.box === 0 && v.remembered === false)
      .slice(0, limit)
      .map(([k]) => k.split("#")[1]);
  },

  setLastVisitedWeek(weekPath) {
    state.lastVisitedWeek = weekPath;
    persist();
  },
  getLastVisitedWeek() { return state.lastVisitedWeek; },

  exportJSON() { return JSON.stringify(state, null, 2); },
  importJSON(json) {
    try {
      const parsed = JSON.parse(json);
      state = { ...defaultState(), ...parsed };
      persist();
      return true;
    } catch { return false; }
  },
};
