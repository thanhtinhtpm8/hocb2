import { el, esc } from "./ui.js";
import { Data } from "./data.js";
import { Store } from "./store.js";
import { renderTheory, attachReadingProgress } from "./render-theory.js";
import { mountVocabPractice } from "./render-vocab.js";
import { mountQuizPractice } from "./render-quiz.js";

const TABS = [
  { id: "theory", label: "📖 Lý thuyết" },
  { id: "vocab", label: "🗂️ Từ vựng" },
  { id: "quiz", label: "📝 Bài tập" },
];

export async function renderWeekHub(root, { course, month, week }, activeTab = "theory") {
  const weekPath = `courses/${course.id}/${month.id}/${week.id}`;
  Store.setLastVisitedWeek(weekPath);

  root.innerHTML = `<div class="card" style="text-align:center;padding:40px;">Đang tải…</div>`;

  const [theory, vocab, quizBank] = await Promise.all([
    Data.getTheory(weekPath).catch(() => null),
    Data.getVocab(weekPath).catch(() => null),
    Data.getQuiz(weekPath).catch(() => null),
  ]);

  root.innerHTML = "";

  const crumb = el("div", { style: "font-size:12.5px;color:var(--text-muted);margin-bottom:6px;" }, [
    el("a", { href: `#/course/${course.id}` }, month.title),
    ` › Tuần ${week.index}`,
  ]);
  root.appendChild(crumb);
  root.appendChild(el("h1", { class: "page-title" }, week.title));

  const tabBar = el("div", { class: "tabs" });
  TABS.forEach((t) => {
    tabBar.appendChild(el("button", {
      class: "tab-btn" + (t.id === activeTab ? " active" : ""),
      onclick: () => { location.hash = `#/course/${course.id}/${month.id}/${week.id}/${t.id}`; },
    }, t.label));
  });
  root.appendChild(tabBar);

  const panel = el("div", { id: "weekPanel" });
  root.appendChild(panel);

  if (activeTab === "theory") {
    if (!theory) return showMissing(panel, "lý thuyết");
    panel.innerHTML = renderTheory(theory);
    attachReadingProgress(root);
  } else if (activeTab === "vocab") {
    if (!vocab) return showMissing(panel, "từ vựng");
    mountVocabPractice(panel, { vocab, weekPath });
  } else if (activeTab === "quiz") {
    mountQuizPractice(panel, { weekPath, quizBank, vocab });
  }
}

function showMissing(panel, label) {
  panel.innerHTML = "";
  panel.appendChild(el("div", { class: "empty-state" }, [
    el("div", { class: "em-icon" }, "🚧"),
    el("div", {}, `Nội dung ${label} đang được cập nhật.`),
  ]));
}

export async function renderWeekPicker(root, manifest, { title, icon, tab }) {
  root.innerHTML = "";
  root.appendChild(el("h1", { class: "page-title" }, `${icon} ${title}`));
  root.appendChild(el("p", { class: "page-sub" }, "Chọn một tuần để bắt đầu."));

  const course = manifest.courses[0];
  course.months.forEach((month) => {
    const readyWeeks = month.weeks.filter((w) => w.status === "ready");
    if (!readyWeeks.length) return;
    const block = el("div", { class: "month-block" });
    block.appendChild(el("div", { class: "month-head" }, [el("h2", {}, month.title)]));
    const grid = el("div", { class: "grid grid-2" });
    readyWeeks.forEach((week) => {
      grid.appendChild(el("a", { class: "week-card", href: `#/course/${course.id}/${month.id}/${week.id}/${tab}` }, [
        el("div", { class: "wk-index" }, `TUẦN ${week.index}`),
        el("h3", {}, week.title),
        el("div", { class: "wk-meta" }, tab === "vocab" ? week.vocabFocus : week.grammarFocus),
      ]));
    });
    block.appendChild(grid);
    root.appendChild(block);
  });
}
