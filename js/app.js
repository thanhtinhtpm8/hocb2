import { Data } from "./data.js";
import { Store } from "./store.js";
import { el, esc } from "./ui.js";
import { renderHome } from "./render-home.js";
import { renderWeekHub, renderWeekPicker } from "./render-week.js";
import { renderProgress } from "./render-progress.js";

const appEl = document.getElementById("app");
const sidebarEl = document.getElementById("sidebar");
const sidebarContentEl = document.getElementById("sidebarContent");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");
const sidebarToggle = document.getElementById("sidebarToggle");
const themeToggle = document.getElementById("themeToggle");
const streakCountEl = document.getElementById("streakCount");

let manifest = null;

function applyTheme() {
  const theme = Store.getSettings().theme;
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

function currentEffectiveTheme() {
  const theme = Store.getSettings().theme;
  if (theme !== "system") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

themeToggle.addEventListener("click", () => {
  const next = currentEffectiveTheme() === "dark" ? "light" : "dark";
  Store.setTheme(next);
  applyTheme();
});

sidebarToggle.addEventListener("click", () => {
  sidebarEl.classList.toggle("open");
  sidebarBackdrop.classList.toggle("open");
});
sidebarBackdrop.addEventListener("click", closeSidebar);
function closeSidebar() {
  sidebarEl.classList.remove("open");
  sidebarBackdrop.classList.remove("open");
}

function updateStreakBadge() {
  streakCountEl.textContent = Store.getStreak().count;
}

function buildSidebar(activeWeekId) {
  sidebarContentEl.innerHTML = "";
  const course = manifest.courses[0];
  sidebarContentEl.appendChild(el("div", { class: "side-course" }, course.title));
  course.months.forEach((month) => {
    const hasActive = month.weeks.some((w) => w.id === activeWeekId);
    const details = el("details", { class: "side-month", open: hasActive ? "" : null });
    details.appendChild(el("summary", {}, month.title.replace(/^Tháng \d+ — /, "")));
    month.weeks.forEach((week) => {
      const ready = week.status === "ready";
      const link = el("a", {
        class: "side-week" + (week.id === activeWeekId ? " active" : ""),
        href: ready ? `#/course/${course.id}/${month.id}/${week.id}` : "#/",
        onclick: closeSidebar,
      }, [`Tuần ${week.index} — ${week.title}`, !ready ? el("span", { class: "lock" }, "🔒") : null]);
      details.appendChild(link);
    });
    sidebarContentEl.appendChild(details);
  });
}

function setBottomNavActive(name) {
  document.querySelectorAll(".bottom-nav a").forEach((a) => {
    a.classList.toggle("active", a.dataset.nav === name);
  });
}

function parseHash() {
  const hash = location.hash.replace(/^#\/?/, "");
  return hash.split("/").filter(Boolean);
}

async function router() {
  const parts = parseHash();
  appEl.scrollTo?.(0, 0);

  try {
    if (parts[0] === "course" && parts[1] && parts[2] && parts[3]) {
      const [, courseId, monthId, weekId, tab] = parts;
      const found = await Data.findWeek(courseId, monthId, weekId);
      if (!found) return renderNotFound();
      buildSidebar(weekId);
      setBottomNavActive("home");
      await renderWeekHub(appEl, found, tab || "theory");
      return;
    }

    if (parts[0] === "vocab") {
      buildSidebar(null);
      setBottomNavActive("vocab");
      await renderWeekPicker(appEl, manifest, { title: "Từ vựng", icon: "🗂️", tab: "vocab" });
      return;
    }

    if (parts[0] === "quiz") {
      buildSidebar(null);
      setBottomNavActive("quiz");
      await renderWeekPicker(appEl, manifest, { title: "Bài tập", icon: "📝", tab: "quiz" });
      return;
    }

    if (parts[0] === "progress") {
      buildSidebar(null);
      setBottomNavActive("progress");
      await renderProgress(appEl);
      return;
    }

    // home
    buildSidebar(null);
    setBottomNavActive("home");
    renderHome(appEl, manifest);
  } catch (err) {
    console.error(err);
    appEl.innerHTML = `<div class="empty-state"><div class="em-icon">⚠️</div><div>Có lỗi khi tải nội dung.<br>${esc(err.message)}</div></div>`;
  }
}

function renderNotFound() {
  appEl.innerHTML = `<div class="empty-state"><div class="em-icon">🔍</div><div>Không tìm thấy nội dung.</div></div>`;
}

async function init() {
  applyTheme();
  updateStreakBadge();
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);

  manifest = await Data.getManifest();
  window.addEventListener("hashchange", () => { router(); updateStreakBadge(); });
  await router();

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

init();
