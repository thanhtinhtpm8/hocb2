import { esc } from "./ui.js";

const TASK_META = {
  writing: { icon: "✍️", label: "Viết (Writing)" },
  speaking: { icon: "🎙️", label: "Nói (Speaking)" },
  listening: { icon: "🎧", label: "Nghe (Listening)" },
  reading: { icon: "📖", label: "Đọc (Reading)" },
};

function formulaTableHTML(ft) {
  if (!ft || !ft.rows?.length) return "";
  const showHead = ft.headers && ft.headers.length > 1;
  return `<table class="formula-table">
    ${showHead ? `<thead><tr>${ft.headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>` : ""}
    <tbody>${ft.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody>
  </table>`;
}

function grammarPointHTML(g) {
  const mistakes = (g.commonMistakes || [])
    .map((m) => `<div class="mistake-row"><span>❌</span><span class="wrong">${esc(m.wrong)}</span><span>→</span><span>✅</span><span class="right">${esc(m.right)}</span></div>`)
    .join("");
  return `
  <div class="grammar-point" id="g-${esc(g.id)}">
    <h3>${esc(g.title)}</h3>
    ${g.formulaTable ? `<div class="block formula"><div class="block-title">📐 Công thức</div>${formulaTableHTML(g.formulaTable)}</div>` : ""}
    ${g.usage?.length ? `<div class="block usage"><div class="block-title">💡 Cách dùng</div><ul class="usage-list">${g.usage.map((u) => `<li>${esc(u)}</li>`).join("")}</ul></div>` : ""}
    ${g.signals?.length ? `<div class="block usage"><div class="block-title">🔎 Dấu hiệu nhận biết</div><div class="chip-row">${g.signals.map((s) => `<span class="chip">${esc(s)}</span>`).join("")}</div></div>` : ""}
    ${g.notes?.length ? `<div class="block notes"><div class="block-title">⚠️ Lưu ý</div><ul class="notes-list">${g.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul></div>` : ""}
    ${mistakes ? `<div class="block mistakes"><div class="block-title">🚫 Lỗi thường gặp</div>${mistakes}</div>` : ""}
  </div>`;
}

export function renderTheory(theory) {
  const tocItems = theory.grammar.map((g) => `<li><a href="#g-${esc(g.id)}">${esc(g.title)}</a></li>`).join("");

  const goals = theory.goals?.length
    ? `<div class="card" style="margin-bottom:18px;"><ul class="goal-list">${theory.goals.map((g) => `<li>${esc(g)}</li>`).join("")}</ul></div>`
    : "";

  const grammarHTML = theory.grammar.map(grammarPointHTML).join("");

  const colloHTML = theory.collocations?.length
    ? `<details class="section" open>
        <summary>🧩 Cụm từ &amp; collocation</summary>
        <div class="section-body"><div class="collo-grid">
          ${theory.collocations.map((c) => `<div class="collo-item"><b>${esc(c.phrase)}</b> — ${esc(c.meaning)}${c.example ? `<br><span style="opacity:.8">${esc(c.example)}</span>` : ""}</div>`).join("")}
        </div></div>
      </details>`
    : "";

  const patternHTML = theory.sentencePatterns?.length
    ? `<details class="section" open>
        <summary>💬 Mẫu câu giao tiếp / viết</summary>
        <div class="section-body">
          ${theory.sentencePatterns.map((p) => `<div class="pattern-item"><div class="cat">${esc(p.category)}</div>${esc(p.pattern)}</div>`).join("")}
        </div>
      </details>`
    : "";

  const taskHTML = theory.practiceTasks?.length
    ? `<details class="section" open>
        <summary>🏋️ Bài tập thực hành (4 kỹ năng)</summary>
        <div class="section-body">
          <div class="grid" style="gap:12px;">
          ${theory.practiceTasks.map((t) => {
            const meta = TASK_META[t.skill] || { icon: "📌", label: t.skill };
            return `<div class="card task-card">
              <div class="task-icon">${meta.icon}</div>
              <div>
                <div style="font-weight:700;font-size:13.5px;margin-bottom:4px;">${meta.label}</div>
                <div style="font-size:13.5px;">${esc(t.prompt)}</div>
                ${t.checklist?.length ? `<ul class="checklist">${t.checklist.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>` : ""}
              </div>
            </div>`;
          }).join("")}
          </div>
        </div>
      </details>`
    : "";

  return `
    <div class="read-progress"><div class="read-progress-fill" id="readProgressFill"></div></div>
    <h1 class="page-title">${esc(theory.title)}</h1>
    <div class="card toc-card">
      <div class="block-title" style="color:var(--text-muted);">🎯 Mục tiêu tuần</div>
      ${goals}
      ${tocItems ? `<div class="block-title" style="color:var(--text-muted);margin-top:12px;">📑 Mục lục ngữ pháp</div><ul>${tocItems}</ul>` : ""}
    </div>
    <div class="section-heading">B. Lý thuyết ngữ pháp</div>
    ${grammarHTML}
    ${colloHTML}
    ${patternHTML}
    ${taskHTML}
  `;
}

export function attachReadingProgress(container) {
  const fill = document.getElementById("readProgressFill");
  if (!fill) return () => {};
  const handler = () => {
    const scrollable = container.scrollHeight - container.clientHeight;
    const pct = scrollable > 0 ? Math.min(100, (container.scrollTop / scrollable) * 100) : 0;
    fill.style.width = pct + "%";
  };
  container.addEventListener("scroll", handler, { passive: true });
  handler();
  return () => container.removeEventListener("scroll", handler);
}
