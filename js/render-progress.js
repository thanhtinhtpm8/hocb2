import { el, esc, toast } from "./ui.js";
import { Store } from "./store.js";
import { Data } from "./data.js";

export async function renderProgress(root) {
  root.innerHTML = `<div class="card" style="text-align:center;padding:40px;">Đang tải tiến độ…</div>`;

  const readyWeeks = await Data.getAllReadyWeeks();
  const scores = Store.getAllScores();
  const streak = Store.getStreak();

  const scoreValues = Object.values(scores).map((s) => s.percent);
  const avg = scoreValues.length ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length) : 0;
  const testsCompleted = scoreValues.length;

  let wordsReviewed = 0;
  const leechEntries = [];
  for (const w of readyWeeks) {
    const weekPath = `courses/${w.courseId}/${w.monthId}/${w.id}`;
    const vocab = await Data.getVocab(weekPath).catch(() => null);
    if (!vocab) continue;
    const state = Store.get();
    vocab.words.forEach((word) => {
      const key = `${weekPath}#${word.id}`;
      if (state.srs[key]) wordsReviewed += 1;
    });
    const leechIds = Store.getLeeches(weekPath, 5);
    leechIds.forEach((id) => {
      const word = vocab.words.find((x) => String(x.id) === String(id));
      if (word) leechEntries.push({ week: w.title, word });
    });
  }

  root.innerHTML = "";
  root.appendChild(el("h1", { class: "page-title" }, "📈 Tiến độ học tập"));
  root.appendChild(el("p", { class: "page-sub" }, "Theo dõi chuỗi ngày học, điểm số và những từ hay quên."));

  const statGrid = el("div", { class: "stat-grid" }, [
    statCard("🔥", streak.count, "Ngày liên tiếp"),
    statCard("📝", testsCompleted, "Bài đã làm"),
    statCard("🎯", avg + "%", "Điểm TB"),
    statCard("🗂️", wordsReviewed, "Từ đã ôn"),
  ]);
  root.appendChild(statGrid);

  root.appendChild(el("div", { class: "section-heading" }, "Điểm theo tuần"));
  const weekCard = el("div", { class: "card", style: "padding: 6px 16px;" });
  if (!readyWeeks.length) {
    weekCard.appendChild(el("div", { class: "empty-state" }, "Chưa có tuần nào sẵn sàng."));
  } else {
    readyWeeks.forEach((w) => {
      const weekPath = `courses/${w.courseId}/${w.monthId}/${w.id}`;
      const weekScores = Object.entries(scores).filter(([k]) => k.startsWith(weekPath + "/")).map(([, v]) => v.percent);
      const best = weekScores.length ? Math.max(...weekScores) : null;
      weekCard.appendChild(el("div", { style: "padding:12px 0;border-bottom:1px solid var(--border);" }, [
        el("div", { style: "display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:6px;" }, [
          el("a", { href: `#/course/${w.courseId}/${w.monthId}/${w.id}` }, `Tuần ${w.index} — ${w.title}`),
          el("b", {}, best === null ? "Chưa làm" : best + "%"),
        ]),
        el("div", { class: "progress-bar-track" }, [
          el("div", { class: "progress-bar-fill", style: `width:${best || 0}%` }),
        ]),
      ]));
    });
  }
  root.appendChild(weekCard);

  if (leechEntries.length) {
    root.appendChild(el("div", { class: "section-heading" }, "🩹 Từ hay quên (leech) — nên ôn lại"));
    const leechCard = el("div", { class: "card" });
    leechEntries.forEach((e) => {
      leechCard.appendChild(el("div", { class: "leech-row" }, [
        el("span", {}, [el("b", {}, e.word.word), ` — ${e.word.meaning}`]),
        el("span", { style: "color:var(--text-muted);font-size:12px;" }, e.week),
      ]));
    });
    root.appendChild(leechCard);
  }

  root.appendChild(el("div", { class: "section-heading" }, "Dữ liệu của bạn"));
  const dataCard = el("div", { class: "card", style: "display:flex;gap:10px;flex-wrap:wrap;" }, [
    el("button", { class: "btn", onclick: exportData }, "⬇️ Xuất tiến độ (JSON)"),
    el("button", { class: "btn", onclick: () => document.getElementById("importFile").click() }, "⬆️ Nhập tiến độ"),
    el("input", { type: "file", id: "importFile", accept: "application/json", style: "display:none;", onchange: importData }),
  ]);
  root.appendChild(dataCard);
}

function statCard(icon, num, lbl) {
  return el("div", { class: "card stat-card" }, [
    el("div", { class: "num" }, `${icon} ${num}`),
    el("div", { class: "lbl" }, lbl),
  ]);
}

function exportData() {
  const blob = new Blob([Store.exportJSON()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `b2vstep-tien-do-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast("Đã xuất file tiến độ");
}

function importData(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const ok = Store.importJSON(reader.result);
    toast(ok ? "Đã nhập tiến độ thành công — tải lại trang" : "File không hợp lệ");
    if (ok) setTimeout(() => location.reload(), 800);
  };
  reader.readAsText(file);
}
