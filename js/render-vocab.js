import { el, esc, speak } from "./ui.js";
import { Store } from "./store.js";
import { shuffle } from "./quiz-engine.js";

export function mountVocabPractice(root, { vocab, weekPath }) {
  let deck = vocab.words.slice();
  let dueOnly = false;
  let idx = 0;
  let flipped = false;

  root.innerHTML = "";

  const toolbar = el("div", { class: "flash-toolbar" }, [
    el("div", { class: "flash-count", id: "flashCount" }, ""),
    el("div", { style: "display:flex;gap:8px;" }, [
      el("button", {
        class: "btn ghost", id: "dueToggle",
        onclick: () => {
          dueOnly = !dueOnly;
          rebuildDeck();
        },
      }, "⏰ Chỉ từ đến hạn"),
      el("button", {
        class: "btn ghost",
        onclick: () => { deck = shuffle(deck); idx = 0; flipped = false; renderCard(); },
      }, "🔀 Xáo bài"),
    ]),
  ]);

  const stage = el("div", { class: "flash-stage" });
  const controls = el("div", { class: "flash-controls" });
  const listSection = el("div", { style: "margin-top:28px;" });

  root.append(toolbar, stage, controls, listSection);

  function rebuildDeck() {
    const due = new Set(Store.getDueWords(weekPath, vocab.words.map((w) => w.id)));
    deck = dueOnly ? vocab.words.filter((w) => due.has(w.id)) : vocab.words.slice();
    idx = 0; flipped = false;
    document.getElementById("dueToggle").classList.toggle("selected", dueOnly);
    renderCard();
  }

  function renderCard() {
    stage.innerHTML = "";
    controls.innerHTML = "";
    const countEl = document.getElementById("flashCount");
    if (!deck.length) {
      stage.appendChild(el("div", { class: "empty-state" }, [
        el("div", { class: "em-icon" }, "🎉"),
        el("div", {}, dueOnly ? "Không có từ nào đến hạn ôn hôm nay!" : "Chưa có từ vựng."),
      ]));
      if (countEl) countEl.textContent = "";
      return;
    }
    if (idx >= deck.length) idx = 0;
    const w = deck[idx];
    if (countEl) countEl.textContent = `Thẻ ${idx + 1}/${deck.length}`;

    const card = el("div", { class: "flashcard", onclick: (e) => { if (e.target.closest(".speak-btn")) return; flipped = !flipped; card.classList.toggle("flipped", flipped); } }, [
      el("div", { class: "flashcard-inner" }, [
        el("div", { class: "flashcard-face front" }, [
          el("button", { class: "speak-btn", title: "Nghe phát âm", onclick: () => speak(w.word) }, "🔊"),
          el("div", { class: "flashcard-word" }, w.word),
          el("div", { class: "flashcard-ipa" }, w.ipa || ""),
          el("div", { class: "flashcard-type" }, w.type || ""),
        ]),
        el("div", { class: "flashcard-face back" }, [
          el("div", { class: "flashcard-meaning" }, w.meaning),
          el("div", { class: "flashcard-example" }, w.example || ""),
        ]),
      ]),
    ]);
    stage.appendChild(card);

    const nav = el("div", { style: "display:flex;gap:10px;" }, [
      el("button", { class: "btn ghost", onclick: () => { idx = (idx - 1 + deck.length) % deck.length; flipped = false; renderCard(); } }, "◀"),
      el("button", { class: "btn ghost", onclick: () => { idx = (idx + 1) % deck.length; flipped = false; renderCard(); } }, "▶"),
    ]);
    const remember = el("div", { style: "display:flex;gap:10px;" }, [
      el("button", {
        class: "btn danger-soft",
        onclick: () => { Store.markWord(weekPath, w.id, false); bump(); advance(); },
      }, "😵 Chưa nhớ"),
      el("button", {
        class: "btn success-soft",
        onclick: () => { Store.markWord(weekPath, w.id, true); bump(); advance(); },
      }, "✅ Đã nhớ"),
    ]);
    controls.append(nav, remember);

    function advance() { idx = (idx + 1) % deck.length; flipped = false; renderCard(); }
    function bump() { card.classList.add("bounce"); }
  }

  rebuildDeck();
  renderList();

  function renderList() {
    listSection.innerHTML = "";
    listSection.appendChild(el("div", { class: "section-heading" }, `Toàn bộ ${vocab.words.length} từ — ${esc(vocab.topic)}`));
    const listCard = el("div", { class: "card", style: "padding:0;" });
    vocab.words.forEach((w) => {
      listCard.appendChild(el("div", { class: "vocab-list-row" }, [
        el("span", { class: "vw" }, w.word),
        el("span", { class: "vt" }, w.type || ""),
        el("span", { class: "vm" }, `${w.meaning}`),
        el("button", { class: "icon-btn", title: "Nghe", onclick: () => speak(w.word) }, "🔊"),
      ]));
    });
    listSection.appendChild(listCard);
  }
}
