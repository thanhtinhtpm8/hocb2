export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sample(arr, n) {
  return shuffle(arr).slice(0, n);
}

// Build a synthetic multiple-choice vocab quiz straight from vocab.json —
// no hand-authored questions needed; the engine derives them from the word list.
export function buildVocabQuestions(vocab, count) {
  const words = vocab.words;
  const picked = sample(words, Math.min(count, words.length));
  return picked.map((w, i) => {
    const askMeaning = i % 2 === 0; // alternate EN->VI and VI->EN
    const correct = askMeaning ? w.meaning : w.word;
    const pool = words.filter((x) => x.id !== w.id);
    const distractors = sample(pool, 3).map((x) => (askMeaning ? x.meaning : x.word));
    const options = shuffle([correct, ...distractors]);
    return {
      id: `vocab-${w.id}-${askMeaning ? "en2vi" : "vi2en"}`,
      type: "multiple-choice",
      skill: "vocabulary",
      question: askMeaning
        ? `"${w.word}" nghĩa là gì?`
        : `Từ nào có nghĩa là "${w.meaning}"?`,
      options,
      answer: correct,
      explanation: `${w.word} ${w.ipa} — ${w.meaning}. Ví dụ: ${w.example}`,
    };
  });
}

export function normalizeAnswer(text) {
  return String(text).trim().toLowerCase().replace(/\s+/g, " ").replace(/[.,!?]$/, "");
}

// Some answer keys pack multiple acceptable forms into one string, e.g.
// "an / a" or "many (a lot of)" — accept a match against any alternative.
export function isCorrectAnswer(userText, correct) {
  const user = normalizeAnswer(userText);
  if (!user) return false;
  const raw = String(correct);
  const alternatives = new Set([raw]);
  raw.split("/").forEach((p) => alternatives.add(p));
  const parenMatch = raw.match(/^(.*?)\s*\((.*?)\)\s*$/);
  if (parenMatch) { alternatives.add(parenMatch[1]); alternatives.add(parenMatch[2]); }
  for (const alt of alternatives) {
    if (user === normalizeAnswer(alt)) return true;
  }
  return false;
}

export function prepareQuizQuestions(bank, count) {
  return sample(bank, Math.min(count, bank.length));
}

export function scoreToVerdict(pct) {
  if (pct >= 90) return { label: "Xuất sắc!", emoji: "🏆" };
  if (pct >= 80) return { label: "Rất tốt!", emoji: "🎉" };
  if (pct >= 60) return { label: "Khá ổn, cố thêm chút nữa!", emoji: "💪" };
  return { label: "Cần ôn lại phần này.", emoji: "📚" };
}
