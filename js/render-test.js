import { el, esc, toast, confetti } from "./ui.js";
import { Store } from "./store.js";
import { shuffle, isCorrectAnswer } from "./quiz-engine.js";

export function mountMonthTest(root, { test, monthPath }) {
  const answers1 = {}; // questionId -> selected option text
  const answers2 = {}; // questionId -> { userText, selfMarked: true|false|null }
  let submitted = false;
  let timerHandle = null;
  let remaining = test.timeLimitMinutes * 60;

  root.innerHTML = "";

  const header = el("div", { class: "card", style: "margin-bottom:18px;" }, [
    el("h1", { class: "page-title", style: "margin-bottom:4px;" }, `📝 ${test.title}`),
    el("div", { style: "font-size:13px;color:var(--text-muted);margin-bottom:10px;" }, test.subtitle),
    el("div", { style: "font-size:13.5px;" }, test.instructions),
  ]);
  const timerBar = el("div", { class: "card", style: "margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;" }, [
    el("div", { style: "font-weight:700;font-size:13.5px;" }, "⏱️ Thời gian làm bài"),
    el("div", { id: "monthTestTimer", class: "quiz-timer", style: "font-size:16px;" }, formatTime(remaining)),
  ]);
  root.append(header, timerBar);

  timerHandle = setInterval(() => {
    remaining -= 1;
    const t = document.getElementById("monthTestTimer");
    if (t) {
      t.textContent = formatTime(remaining);
      if (remaining <= 300) t.style.color = "var(--red)";
    }
    if (remaining <= 0) clearInterval(timerHandle);
  }, 1000);

  // ---- Part 1: multiple choice ----
  const part1 = test.sections.find((s) => s.type === "multiple-choice");
  const part1Card = el("div", { class: "card", style: "margin-bottom:18px;" });
  part1Card.appendChild(el("h2", { style: "font-size:16px;" }, part1.title));
  part1Card.appendChild(el("div", { style: "font-size:13px;color:var(--text-muted);margin-bottom:14px;" }, part1.instructions));
  part1.questions.forEach((q, i) => {
    const shuffledOpts = shuffle(q.options);
    const qBlock = el("div", { style: "margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid var(--border);" });
    qBlock.appendChild(el("div", { style: "font-weight:600;font-size:14.5px;margin-bottom:8px;" }, `${i + 1}. ${q.question}`));
    const optList = el("div", { class: "option-list", id: `p1opts-${q.id}` });
    shuffledOpts.forEach((opt, oi) => {
      const btn = el("button", {
        class: "option-btn",
        onclick: () => {
          if (submitted) return;
          answers1[q.id] = opt;
          [...optList.children].forEach((b) => b.classList.remove("selected-choice"));
          btn.classList.add("selected-choice");
        },
      }, [
        el("span", { class: "opt-letter" }, String.fromCharCode(65 + oi)),
        el("span", {}, opt),
      ]);
      optList.appendChild(btn);
    });
    qBlock.appendChild(optList);
    part1Card.appendChild(qBlock);
  });
  root.appendChild(part1Card);

  // ---- Part 2: reading ----
  const part2 = test.sections.find((s) => s.type === "reading");
  const part2Card = el("div", { class: "card", style: "margin-bottom:18px;" });
  part2Card.appendChild(el("h2", { style: "font-size:16px;" }, part2.title));
  part2Card.appendChild(el("div", { class: "block usage", style: "font-style:italic;" }, part2.passage));
  part2.questions.forEach((q, i) => {
    const row = el("div", { style: "margin:14px 0;" });
    row.appendChild(el("div", { style: "font-weight:600;font-size:14px;margin-bottom:6px;" }, `${i + 1}. ${q.question}`));
    const input = el("input", { type: "text", placeholder: "Câu trả lời của bạn...", style: "width:100%;padding:10px 12px;border-radius:8px;border:1.5px solid var(--border);background:var(--bg-elevated);color:var(--text);" });
    input.addEventListener("input", () => { answers2[q.id] = { ...(answers2[q.id] || {}), userText: input.value }; });
    row.appendChild(input);
    row.appendChild(el("div", { class: "reveal-answer", id: `p2reveal-${q.id}`, style: "margin-top:8px;" }));
    part2Card.appendChild(row);
  });
  root.appendChild(part2Card);

  // ---- Part 3: writing ----
  const part3 = test.sections.find((s) => s.type === "writing");
  const part3Card = el("div", { class: "card", style: "margin-bottom:18px;" });
  part3Card.appendChild(el("h2", { style: "font-size:16px;" }, part3.title));
  part3.tasks.forEach((t) => {
    const draftKey = `${monthPath}#writing#${t.id}`;
    const box = el("div", { style: "margin-bottom:16px;" });
    box.appendChild(el("div", { style: "font-weight:700;font-size:13.5px;margin-bottom:4px;" }, `${t.label} (${t.wordCount})`));
    box.appendChild(el("div", { style: "font-size:13.5px;margin-bottom:8px;" }, t.prompt));
    const wordCountEl = el("span", { style: "font-size:11.5px;color:var(--text-muted);" }, "0 từ");
    const textarea = el("textarea", {
      rows: "6",
      placeholder: "Viết bài của bạn ở đây... (tự động lưu nháp)",
      style: "width:100%;padding:10px 12px;border-radius:8px;border:1.5px solid var(--border);background:var(--bg-elevated);color:var(--text);font:inherit;resize:vertical;",
    }, Store.getDraft(draftKey));
    updateWordCount();
    textarea.addEventListener("input", () => {
      Store.saveDraft(draftKey, textarea.value);
      updateWordCount();
    });
    function updateWordCount() {
      const n = textarea.value.trim() ? textarea.value.trim().split(/\s+/).length : 0;
      wordCountEl.textContent = `${n} từ`;
    }
    box.append(textarea, el("div", { style: "margin-top:4px;text-align:right;" }, wordCountEl));
    part3Card.appendChild(box);
  });
  root.appendChild(part3Card);

  // ---- Part 4: speaking ----
  const part4 = test.sections.find((s) => s.type === "speaking");
  const part4Card = el("div", { class: "card", style: "margin-bottom:18px;" });
  part4Card.appendChild(el("h2", { style: "font-size:16px;" }, part4.title));
  part4Card.appendChild(el("div", { style: "font-size:13px;color:var(--text-muted);margin-bottom:10px;" }, `🎙️ ${part4.durationNote} — tự ghi âm bằng điện thoại`));
  part4.parts.forEach((p) => {
    part4Card.appendChild(el("div", { class: "pattern-item" }, [
      el("div", { class: "cat" }, `Part ${p.part}`),
      p.prompt,
    ]));
  });
  root.appendChild(part4Card);

  // ---- Submit ----
  const submitBar = el("div", { class: "card", style: "text-align:center;" }, [
    el("button", { class: "btn primary bounce", style: "width:100%;justify-content:center;padding:14px;", onclick: submitTest }, "✅ Nộp bài & Chấm điểm Phần 1-2"),
  ]);
  root.appendChild(submitBar);

  function submitTest() {
    if (submitted) return;
    submitted = true;
    clearInterval(timerHandle);

    let correct1 = 0;
    part1.questions.forEach((q) => {
      const optList = document.getElementById(`p1opts-${q.id}`);
      const chosen = answers1[q.id];
      [...optList.children].forEach((b) => {
        const label = b.querySelector("span:last-child").textContent;
        b.classList.add("disabled");
        if (isCorrectAnswer(label, q.answer)) b.classList.add("correct");
        else if (label === chosen) b.classList.add("incorrect");
      });
      if (chosen && isCorrectAnswer(chosen, q.answer)) correct1 += 1;
    });

    part2.questions.forEach((q) => {
      const host = document.getElementById(`p2reveal-${q.id}`);
      host.innerHTML = "";
      host.appendChild(el("div", { class: "feedback-box correct", style: "margin-top:0;" }, [
        el("div", {}, `💡 Gợi ý đáp án: ${q.suggestedAnswer}`),
      ]));
    });

    const score1 = Math.round((correct1 / 2) * 10) / 10;
    const pct1 = Math.round((correct1 / part1.questions.length) * 100);

    const resultCard = el("div", { class: "card result-hero", style: "margin-top:18px;" }, [
      el("div", { style: "font-size:18px;font-weight:800;" }, "📊 Kết quả Phần 1 — Ngữ pháp & Từ vựng"),
      el("div", { class: "result-stats" }, [
        el("div", { class: "result-stat" }, [el("b", {}, `${correct1}/${part1.questions.length}`), el("span", {}, "Câu đúng")]),
        el("div", { class: "result-stat" }, [el("b", {}, `${score1}/10`), el("span", {}, "Quy đổi điểm")]),
        el("div", { class: "result-stat" }, [el("b", {}, pct1 + "%"), el("span", {}, "Tỉ lệ đúng")]),
      ]),
      el("div", { class: "block usage", style: "text-align:left;margin-top:14px;" }, [
        el("div", {}, "📖 Phần 2 đã hiện gợi ý đáp án ở từng câu — tự đối chiếu và cho điểm (đúng × 2, tối đa 10)."),
        el("div", { style: "margin-top:6px;" }, "✍️ 🎙️ Phần Viết & Nói: nhờ AI hoặc giáo viên chấm theo tiêu chí VSTEP, bài viết của bạn đã được tự lưu nháp ở trên."),
        el("div", { style: "margin-top:6px;font-weight:600;" }, test.goalNote),
      ]),
    ]);
    part1Card.parentNode.insertBefore(resultCard, part1Card);
    submitBar.querySelector("button").textContent = "✅ Đã nộp bài";
    submitBar.querySelector("button").setAttribute("disabled", "");

    if (pct1 >= 70) confetti(60);

    Store.recordScore(monthPath, "month-test", { percent: pct1, correct: correct1, total: part1.questions.length });
    toast("Đã chấm Phần 1. Xem gợi ý đáp án Phần 2 ở trên.");
    resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const style = document.createElement("style");
  style.textContent = `.option-btn.selected-choice { border-color: var(--brand); background: var(--brand-soft); }`;
  root.appendChild(style);
}

function formatTime(s) {
  s = Math.max(0, s);
  const m = Math.floor(s / 60), r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
