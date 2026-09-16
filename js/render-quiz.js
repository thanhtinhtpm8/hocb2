import { el, esc, toast, confetti } from "./ui.js";
import { Store } from "./store.js";
import { shuffle, buildVocabQuestions, isCorrectAnswer, prepareQuizQuestions, scoreToVerdict } from "./quiz-engine.js";

const SKILL_LABEL = { grammar: "Ngữ pháp", vocabulary: "Từ vựng", mixed: "Tổng hợp" };
const COUNT_OPTIONS = [10, 20, 40];

function questionText(q) {
  if (q.type === "error-correction") return "Tìm và sửa lỗi sai trong câu sau:";
  return q.prompt || q.question || "";
}

function optionsFor(q) {
  if (q.type === "multiple-choice") return q.options;
  if (q.type === "fill-blank" && q.options) return q.options;
  return null;
}

export function mountQuizPractice(root, { weekPath, quizBank, vocab }) {
  const sets = [];
  if (quizBank?.sets?.length) {
    for (const s of quizBank.sets) sets.push({ id: s.id, title: s.title, questions: s.questions, skill: "mixed" });
  }
  if (vocab?.words?.length) {
    sets.push({ id: "vocab-auto", title: "Từ vựng tuần (tự động)", questions: null, skill: "vocabulary", isVocab: true });
  }

  let screen = "setup";
  let chosenSet = sets[0] || null;
  let chosenCount = 10;
  let mode = "practice"; // practice | test
  let pool = [];
  let qIndex = 0;
  let answers = []; // {question, correct, userAnswer}
  let timer = { total: 0, remaining: 0, handle: null };

  function render() {
    root.innerHTML = "";
    if (!sets.length) {
      root.appendChild(el("div", { class: "empty-state" }, [
        el("div", { class: "em-icon" }, "🚧"),
        el("div", {}, "Tuần này chưa có ngân hàng câu hỏi."),
      ]));
      return;
    }
    if (screen === "setup") renderSetup();
    else if (screen === "running") renderRunning();
    else renderResult();
  }

  function renderSetup() {
    const setupCard = el("div", { class: "card quiz-setup" });
    setupCard.appendChild(el("div", { class: "block-title", style: "color:var(--text-muted);margin-bottom:10px;" }, "📦 Chọn bộ đề"));
    const setGrid = el("div", { class: "grid grid-2" });
    sets.forEach((s) => {
      const count = s.isVocab ? Math.min(40, vocab.words.length) : s.questions.length;
      const card = el("div", {
        class: "set-pick" + (chosenSet?.id === s.id ? " selected" : ""),
        onclick: () => { chosenSet = s; renderSetup2(); },
      }, [
        el("div", { style: "font-weight:700;font-size:14px;" }, s.title),
        el("div", { style: "font-size:12px;color:var(--text-muted);margin-top:4px;" }, `${count} câu · ${SKILL_LABEL[s.skill] || s.skill}`),
      ]);
      setGrid.appendChild(card);
    });
    setupCard.appendChild(setGrid);

    const countRow = el("div", { style: "margin-top:18px;" }, [
      el("div", { class: "block-title", style: "color:var(--text-muted);" }, "🔢 Số câu"),
      buildCountPicker(),
    ]);
    setupCard.appendChild(countRow);

    const modeRow = el("div", { style: "margin-top:18px;" }, [
      el("div", { class: "block-title", style: "color:var(--text-muted);" }, "⏱️ Chế độ"),
      el("div", { class: "count-pick" }, [
        el("button", { class: "btn" + (mode === "practice" ? " selected" : ""), onclick: () => { mode = "practice"; renderSetup(); } }, "Luyện tập (có giải thích ngay)"),
        el("button", { class: "btn" + (mode === "test" ? " selected" : ""), onclick: () => { mode = "test"; renderSetup(); } }, "Thi thử (tính giờ)"),
      ]),
    ]);
    setupCard.appendChild(modeRow);

    setupCard.appendChild(el("button", {
      class: "btn primary bounce", style: "margin-top:20px;width:100%;justify-content:center;",
      onclick: startQuiz,
    }, "🚀 Bắt đầu"));

    root.appendChild(setupCard);

    function renderSetup2() { render(); }
  }

  function buildCountPicker() {
    const maxAvail = chosenSet?.isVocab ? vocab.words.length : (chosenSet?.questions.length || 0);
    const opts = COUNT_OPTIONS.filter((n) => n <= maxAvail);
    if (!opts.includes(maxAvail) && maxAvail > 0) opts.push(maxAvail);
    if (!opts.includes(chosenCount)) chosenCount = opts[0] || maxAvail;
    return el("div", { class: "count-pick" },
      opts.map((n) => el("button", {
        class: "btn" + (chosenCount === n ? " selected" : ""),
        onclick: () => { chosenCount = n; render(); },
      }, String(n)))
    );
  }

  function startQuiz() {
    if (!chosenSet) return;
    pool = chosenSet.isVocab ? buildVocabQuestions(vocab, chosenCount) : prepareQuizQuestions(chosenSet.questions, chosenCount);
    qIndex = 0;
    answers = [];
    screen = "running";
    if (mode === "test") {
      timer.total = pool.length * 40;
      timer.remaining = timer.total;
      clearInterval(timer.handle);
      timer.handle = setInterval(() => {
        timer.remaining -= 1;
        const t = document.getElementById("quizTimer");
        if (t) t.textContent = formatTime(timer.remaining);
        if (timer.remaining <= 0) { clearInterval(timer.handle); finishQuiz(); }
      }, 1000);
    }
    render();
  }

  function formatTime(s) {
    s = Math.max(0, s);
    const m = Math.floor(s / 60), r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  }

  function renderRunning() {
    const q = pool[qIndex];
    const wrap = el("div", {});

    const progressRow = el("div", { class: "quiz-progress" }, [
      el("div", { class: "progress-bar-track" }, [
        el("div", { class: "progress-bar-fill", style: `width:${(qIndex / pool.length) * 100}%` }),
      ]),
      el("div", { style: "font-size:12.5px;color:var(--text-muted);white-space:nowrap;" }, `${qIndex + 1}/${pool.length}`),
    ]);
    if (mode === "test") {
      progressRow.appendChild(el("div", { class: "quiz-timer", id: "quizTimer" }, formatTime(timer.remaining)));
    }
    wrap.appendChild(progressRow);

    const qCard = el("div", { class: "card question-card" });
    qCard.appendChild(el("span", { class: "q-skill-tag" }, SKILL_LABEL[q.skill] || q.skill || ""));
    if (q.type === "error-correction") {
      qCard.appendChild(el("div", { class: "q-text" }, questionText(q)));
      qCard.appendChild(el("div", { class: "block mistakes", style: "font-size:15px;font-weight:600;" }, `❌ ${esc(q.sentence)}`));
    } else {
      qCard.appendChild(el("div", { class: "q-text", html: esc(questionText(q)).replace(/___/g, '<span class="blank">____</span>') }));
    }

    const feedbackHost = el("div", {});
    const opts = optionsFor(q);

    if (opts) {
      const shuffled = shuffle(opts);
      const optList = el("div", { class: "option-list" });
      shuffled.forEach((opt, i) => {
        const btn = el("button", {
          class: "option-btn",
          onclick: () => selectOption(btn, opt, q, optList, feedbackHost),
        }, [
          el("span", { class: "opt-letter" }, String.fromCharCode(65 + i)),
          el("span", {}, opt),
        ]);
        optList.appendChild(btn);
      });
      qCard.appendChild(optList);
    } else {
      const input = el("input", { type: "text", placeholder: "Nhập câu trả lời...", autocomplete: "off" });
      const row = el("div", { class: "text-answer-row" }, [
        input,
        el("button", { class: "btn primary", onclick: () => submitText(input, q, row, feedbackHost) }, "Kiểm tra"),
      ]);
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") submitText(input, q, row, feedbackHost); });
      qCard.appendChild(row);
    }

    qCard.appendChild(feedbackHost);
    wrap.appendChild(qCard);

    const navRow = el("div", { class: "quiz-nav" }, [
      el("button", { class: "btn ghost", onclick: () => { if (confirm("Thoát bài tập và về màn hình chọn bộ đề?")) { clearInterval(timer.handle); screen = "setup"; render(); } } }, "✕ Thoát"),
      el("button", { class: "btn", id: "nextBtn", disabled: mode === "practice" ? "" : null, onclick: nextQuestion }, qIndex === pool.length - 1 ? "Nộp bài →" : "Câu tiếp →"),
    ]);
    wrap.appendChild(navRow);

    root.innerHTML = "";
    root.appendChild(wrap);

    if (mode === "test") document.getElementById("nextBtn").removeAttribute("disabled");
  }

  function recordAnswer(q, userAnswer, correct) {
    answers.push({ question: q, userAnswer, correct });
  }

  function selectOption(btn, opt, q, optList, feedbackHost) {
    if (optList.dataset.answered) return;
    optList.dataset.answered = "1";
    const correct = isCorrectAnswer(opt, q.answer);
    recordAnswer(q, opt, correct);
    [...optList.children].forEach((b) => {
      b.classList.add("disabled");
      const label = b.querySelector("span:last-child").textContent;
      if (isCorrectAnswer(label, q.answer)) b.classList.add("correct");
      else if (b === btn) b.classList.add("incorrect");
    });
    if (mode === "practice") showFeedback(feedbackHost, correct, q);
    document.getElementById("nextBtn")?.removeAttribute("disabled");
  }

  function submitText(input, q, row, feedbackHost) {
    if (row.dataset.answered) return;
    row.dataset.answered = "1";
    input.disabled = true;
    const val = input.value;
    const correct = isCorrectAnswer(val, q.answer);
    recordAnswer(q, val, correct);
    row.classList.add(correct ? "correct" : "incorrect");
    if (mode === "practice") showFeedback(feedbackHost, correct, q, true);
    document.getElementById("nextBtn")?.removeAttribute("disabled");
  }

  function showFeedback(host, correct, q, showAnswer = false) {
    host.innerHTML = "";
    const box = el("div", { class: "feedback-box " + (correct ? "correct" : "incorrect") }, [
      el("div", {}, correct ? "✅ Chính xác!" : `❌ Chưa đúng.${showAnswer ? ` Đáp án: ${esc(q.answer)}` : ""}`),
      q.explanation ? el("div", { class: "expl" }, q.explanation) : null,
    ]);
    host.appendChild(box);
  }

  function nextQuestion() {
    // if practice mode and not answered yet, block (button stays disabled) — for test mode allow skip
    if (mode === "test" && !answers[qIndex]) {
      recordAnswer(pool[qIndex], null, false);
    }
    if (qIndex < pool.length - 1) {
      qIndex += 1;
      render();
    } else {
      finishQuiz();
    }
  }

  function finishQuiz() {
    clearInterval(timer.handle);
    screen = "result";
    const correctCount = answers.filter((a) => a.correct).length;
    const pct = pool.length ? Math.round((correctCount / pool.length) * 100) : 0;
    Store.recordScore(weekPath, chosenSet.id, { percent: pct, correct: correctCount, total: pool.length });
    if (pct >= 80) confetti(70);
    render();
  }

  function renderResult() {
    const correctCount = answers.filter((a) => a.correct).length;
    const pct = pool.length ? Math.round((correctCount / pool.length) * 100) : 0;
    const verdict = scoreToVerdict(pct);
    const wrongOnes = answers.filter((a) => !a.correct).map((a) => a.question);

    const card = el("div", { class: "card result-hero" }, [
      el("div", { class: "result-ring", style: `--pct:${pct}` }, [
        el("div", { class: "result-ring-inner" }, [
          el("div", {}, [el("div", { style: "font-size:22px;" }, pct + "%")]),
        ]),
      ]),
      el("div", { style: "font-size:18px;font-weight:800;" }, `${verdict.emoji} ${verdict.label}`),
      el("div", { class: "result-stats" }, [
        el("div", { class: "result-stat" }, [el("b", {}, String(correctCount)), el("span", {}, "Đúng")]),
        el("div", { class: "result-stat" }, [el("b", {}, String(pool.length - correctCount)), el("span", {}, "Sai")]),
        el("div", { class: "result-stat" }, [el("b", {}, String(pool.length)), el("span", {}, "Tổng")]),
      ]),
      el("div", { style: "display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:14px;" }, [
        wrongOnes.length ? el("button", {
          class: "btn danger-soft",
          onclick: () => { pool = wrongOnes; qIndex = 0; answers = []; screen = "running"; mode = "practice"; render(); },
        }, "🔁 Làm lại câu sai") : null,
        el("button", { class: "btn primary", onclick: () => { screen = "setup"; render(); } }, "📦 Chọn bộ đề khác"),
      ]),
    ]);
    root.innerHTML = "";
    root.appendChild(card);

    if (wrongOnes.length) {
      const reviewCard = el("div", { class: "card", style: "margin-top:16px;" });
      reviewCard.appendChild(el("div", { class: "block-title", style: "color:var(--text-muted);margin-bottom:10px;" }, "📋 Xem lại câu sai"));
      answers.filter((a) => !a.correct).forEach((a) => {
        reviewCard.appendChild(el("div", { style: "padding:10px 0;border-bottom:1px solid var(--border);font-size:13.5px;" }, [
          el("div", { style: "font-weight:600;" }, questionText(a.question).replace(/___/g, "____") || a.question.sentence),
          el("div", { style: "color:var(--red);margin-top:2px;" }, `Bạn trả lời: ${a.userAnswer || "(bỏ trống)"}`),
          el("div", { style: "color:var(--green);" }, `Đáp án đúng: ${a.question.answer}`),
        ]));
      });
      root.appendChild(reviewCard);
    }
  }

  render();
}
