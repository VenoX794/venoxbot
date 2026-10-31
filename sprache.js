// Kopie aus venoxbot-web/public/sprache.js (dort pflegen und hierher kopieren, damit beide Seiten gleich übersetzen).
// Sprachumschalter Deutsch/Englisch (Knopf „DE | EN“ neben dem Hell/Dunkel-Schalter, id="sprach-knopf").
// Die Seite ist auf Deutsch geschrieben. Ist Englisch gewählt, tauscht dieses Skript jeden Text und die
// Attribute aria-label, title, placeholder, alt und content (Beschreibung) gegen die Übersetzung aus
// sprache-en.js (window.VENOX_EN: feste Texte und Muster für Texte mit Zahlen oder Namen). Ein
// MutationObserver übersetzt auch alles, was app.js später einfügt, deshalb läuft das Skript im <head>
// ohne defer, schon während die Seite aufgebaut wird. Zurück auf Deutsch werden die Originale wieder
// eingesetzt. Nicht übersetzt werden Befehle (<code>, .cmd) und Bereiche mit translate="no" (Inhalte von
// Nutzern wie Befehlstexte, Streamtitel und der Beispiel-Chat, denn der Bot spricht im Chat Deutsch).
// Die Wahl merkt sich der Browser (localStorage "sprache"); ohne Wahl gilt die Browsersprache
// (Deutsch bei „de…“, sonst Englisch).
(() => {
  const root = document.documentElement;
  const EN = window.VENOX_EN ?? { texte: {}, muster: [] };
  const ATTRIBUTE = ["aria-label", "title", "placeholder", "alt", "content"];
  const SPERRE = "script,style,code,.cmd,[translate=no]";

  const browserDeutsch = () => String(navigator.language || "").toLowerCase().startsWith("de");
  let sprache;
  try {
    const gemerkt = localStorage.getItem("sprache");
    sprache = gemerkt === "de" || gemerkt === "en" ? gemerkt : browserDeutsch() ? "de" : "en";
  } catch {
    sprache = browserDeutsch() ? "de" : "en";
  }
  root.lang = sprache;
  // Bis zum ersten Durchlauf unsichtbar, damit auf Englisch nicht kurz Deutsch aufblitzt (style.css)
  if (sprache === "en") root.classList.add("sprache-laedt");

  // Übersetzung eines deutschen Textes (ohne Leerraum am Rand) oder null, wenn es keine gibt.
  function englisch(de) {
    const t = de.replace(/\s+/g, " ").trim();
    if (!t) return null;
    if (Object.hasOwn(EN.texte, t)) return EN.texte[t];
    for (const [muster, ersatz] of EN.muster) {
      const m = muster.exec(t);
      if (m) return typeof ersatz === "function" ? ersatz(m, (x) => englisch(x) ?? x) : t.replace(muster, ersatz);
    }
    return null;
  }

  // Merkt pro Textknoten bzw. Attribut den deutschen Text und die zuletzt gesetzte Übersetzung.
  // Steht dort etwas anderes, hat app.js den Text geändert: dann gilt das als neues Original.
  const merker = new WeakMap(); // Knoten -> { de, en } bzw. Element -> { attr: { de, en } }

  function setzeText(node) {
    const el = node.parentElement;
    if (!el || el.closest(SPERRE)) return;
    let m = merker.get(node);
    if (!m || (node.nodeValue !== m.de && node.nodeValue !== m.en)) {
      const de = node.nodeValue;
      const kern = englisch(de);
      // Leerraum am Rand bleibt, außer vor einem Satzzeichen („ nutzen.“ -> „.“, sonst stünde „!ask .“ da)
      m = { de, en: kern === null ? null : de.replace(/^(\s*)[\s\S]*?(\s*)$/, (_, a, b) => (/^[.,;:!?)]/.test(kern) ? "" : a) + kern + b) };
      merker.set(node, m);
    }
    const soll = sprache === "en" && m.en !== null ? m.en : m.de;
    if (node.nodeValue !== soll) node.nodeValue = soll;
  }

  function setzeAttribute(el) {
    if (el.closest(SPERRE)) return;
    if (el.tagName === "META" && !["description", "og:title", "og:description"].includes(el.getAttribute("name") || el.getAttribute("property"))) return;
    let alle = merker.get(el);
    for (const a of ATTRIBUTE) {
      const wert = el.getAttribute(a);
      if (wert === null) continue;
      alle ??= {};
      let m = alle[a];
      if (!m || (wert !== m.de && wert !== m.en)) m = alle[a] = { de: wert, en: englisch(wert) };
      const soll = sprache === "en" && m.en !== null ? m.en : m.de;
      if (wert !== soll) el.setAttribute(a, soll);
    }
    if (alle) merker.set(el, alle);
  }

  // Einen Teilbaum (oder die ganze Seite) in die aktuelle Sprache bringen.
  function durchlaufe(start) {
    if (start.nodeType === Node.TEXT_NODE) return setzeText(start);
    if (start.nodeType !== Node.ELEMENT_NODE) return;
    setzeAttribute(start);
    const w = document.createTreeWalker(start, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (n.nodeType === Node.TEXT_NODE) setzeText(n);
      else setzeAttribute(n);
    }
  }

  // Alles, was später dazukommt oder sich ändert (app.js, thema.js), gleich mit übersetzen.
  new MutationObserver((liste) => {
    for (const r of liste) {
      if (r.type === "childList") r.addedNodes.forEach(durchlaufe);
      else if (r.type === "characterData") setzeText(r.target);
      else setzeAttribute(r.target);
    }
  }).observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRIBUTE });

  // Knopf: aria-pressed true = Englisch (der rote Punkt liegt dann unter „EN“)
  function zeigeKnopf() {
    const knopf = document.getElementById("sprach-knopf");
    if (!knopf) return;
    knopf.setAttribute("aria-pressed", String(sprache === "en"));
    const text = sprache === "en" ? "Language: English. Switch to German" : "Sprache: Deutsch. Auf Englisch umschalten";
    knopf.setAttribute("aria-label", text);
    knopf.title = text;
  }

  function umschalten() {
    sprache = sprache === "en" ? "de" : "en";
    try { localStorage.setItem("sprache", sprache); } catch { /* egal */ }
    root.lang = sprache;
    durchlaufe(root);
    zeigeKnopf();
    // app.js formatiert Zahlen danach in der passenden Schreibweise
    document.dispatchEvent(new CustomEvent("sprachwechsel", { detail: sprache }));
  }

  // Für app.js: aktuelle Sprache (z. B. für Zahlen „1.234“ bzw. „1,234“)
  window.VENOX_SPRACHE = () => sprache;

  document.addEventListener("DOMContentLoaded", () => {
    durchlaufe(root);
    root.classList.remove("sprache-laedt");
    zeigeKnopf();
    document.getElementById("sprach-knopf")?.addEventListener("click", umschalten);
  });
})();
