import { el, esc } from "./ui.js";
import { Store } from "./store.js";

export function renderHome(root, manifest) {
  root.innerHTML = "";
  const courses = manifest.courses;
  const course = courses[0];

  root.appendChild(el("h1", { class: "page-title" }, course.title));
  root.appendChild(el("p", { class: "page-sub" }, course.description));

  if (courses.length > 1) {
    const picker = el("div", { class: "chip-row", style: "margin-bottom:18px;" });
    courses.forEach((c) => picker.appendChild(el("span", { class: "chip" }, c.title)));
    root.appendChild(picker);
  }

  const scores = Store.getAllScores();
  const totalWeeks = course.months.reduce((a, m) => a + m.weeks.length, 0);
  const readyWeeks = course.months.reduce((a, m) => a + m.weeks.filter((w) => w.status === "ready").length, 0);
  const doneCount = new Set(Object.keys(scores).map((k) => k.split("/").slice(0, 4).join("/"))).size;

  const overview = el("div", { class: "card", style: "margin-bottom:24px;display:flex;gap:16px;align-items:center;flex-wrap:wrap;" }, [
    el("div", { style: "flex:1;min-width:180px;" }, [
      el("div", { style: "font-size:13px;color:var(--text-muted);margin-bottom:6px;" }, `Sẵn sàng ${readyWeeks}/${totalWeeks} tuần`),
      el("div", { class: "progress-bar-track" }, [el("div", { class: "progress-bar-fill", style: `width:${(readyWeeks / totalWeeks) * 100}%` })]),
    ]),
    el("a", { href: "#/progress", class: "btn primary" }, "📈 Xem tiến độ"),
  ]);
  root.appendChild(overview);

  course.months.forEach((month) => {
    const block = el("div", { class: "month-block" });
    const headRight = [el("span", { class: "month-goal" }, `Mục tiêu: ${month.goalScore}`)];
    if (month.hasTest) {
      headRight.push(el("a", { href: `#/course/${course.id}/${month.id}/test`, class: "btn ghost", style: "padding:4px 12px;font-size:12px;" }, "📝 Test cuối tháng"));
    }
    block.appendChild(el("div", { class: "month-head" }, [
      el("h2", {}, month.title),
      el("div", { style: "display:flex;align-items:center;gap:8px;" }, headRight),
    ]));
    block.appendChild(el("p", { style: "font-size:13px;color:var(--text-muted);margin-top:-4px;margin-bottom:12px;" }, month.summary));

    const grid = el("div", { class: "grid grid-2" });
    month.weeks.forEach((week) => {
      const ready = week.status === "ready";
      const inner = [
        el("div", { class: "wk-index" }, `TUẦN ${week.index}`),
        el("h3", {}, week.title),
        el("div", { class: "wk-meta" }, `📖 ${week.grammarFocus}`),
        el("div", { class: "wk-meta" }, `🗂️ ${week.vocabFocus}`),
        el("span", { class: "badge " + (ready ? "ready" : "soon") }, ready ? "Sẵn sàng" : "Sắp có"),
      ];
      if (ready) {
        grid.appendChild(el("a", { class: "week-card", href: `#/course/${course.id}/${month.id}/${week.id}` }, inner));
      } else {
        grid.appendChild(el("div", { class: "week-card locked" }, inner));
      }
    });
    block.appendChild(grid);
    root.appendChild(block);
  });
}
