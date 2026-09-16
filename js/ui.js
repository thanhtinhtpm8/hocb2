let toastTimer = null;
export function toast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

export function speak(text, lang = "en-US") {
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch { /* speech unavailable */ }
}

const CONFETTI_COLORS = ["#2f6fed", "#17a673", "#e5484d", "#b8860b", "#8457f0"];

export function confetti(count = 60) {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.className = "confetti-piece";
    const size = 6 + Math.random() * 6;
    el.style.left = Math.random() * 100 + "vw";
    el.style.width = size + "px";
    el.style.height = size * 0.4 + "px";
    el.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    const duration = 1.8 + Math.random() * 1.4;
    const delay = Math.random() * 0.3;
    el.style.animation = `confettiFall ${duration}s ease-in ${delay}s forwards`;
    el.style.transform = `rotate(${Math.random() * 360}deg)`;
    frag.appendChild(el);
    setTimeout(() => el.remove(), (duration + delay) * 1000 + 200);
  }
  document.body.appendChild(frag);
}

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c === null || c === undefined) continue;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

export function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
