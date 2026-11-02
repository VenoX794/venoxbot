// Befehlsliste im Neon-Look (02.11.2026), gleiche Datei auf der Befehle-Website (.befehlsliste) und auf der
// GitHub-Seite (befehle.html, <main data-befehlsliste>). Die Liste selbst bleibt unverändert (Quelle ist
// befehle.html, tools/befehlsliste.mjs kopiert sie); dieses Skript ergänzt nur:
//   - Suchfeld, das Befehle und Erklärungen filtert (ohne KI, rein im Browser; auf der Befehle-Website
//     filtert das vorhandene Feld aus app.js, es bekommt nur das neue Aussehen)
//   - Sprung-Chips zu den Abschnitten, der Chip des sichtbaren Abschnitts leuchtet
//   - Anzahl der Befehle neben jeder Abschnitts-Überschrift
// Englische Texte kommen über sprache.js (MutationObserver übersetzt auch eingefügte Elemente).
(() => {
  const bereich = document.querySelector(".befehlsliste, [data-befehlsliste]");
  if (!bereich) return;
  const abschnitte = [...bereich.querySelectorAll("section")].filter((s) => s.querySelector(":scope > h2"));
  if (!abschnitte.length) return;
  bereich.classList.add("liste-bereich");

  const el = (tag, klasse, text) => {
    const e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (text) e.textContent = text;
    return e;
  };
  // Kennung aus der Überschrift (für die Sprung-Links), z. B. "Für alle" → "liste-fuer-alle"
  const kennung = (t) => "liste-" + t.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // Werkzeugleiste: Suchfeld und Chips, vor dem ersten Abschnitt. Die Befehle-Website hat schon ein
  // Suchfeld (.liste-suche, gefiltert von app.js): das wird übernommen statt ein zweites anzulegen.
  const leiste = el("div", "liste-werkzeug");
  const lupe = '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
  const vorhanden = bereich.querySelector(".liste-suche");
  let suche, feld, leer = null;
  if (vorhanden) {
    suche = vorhanden;
    feld = suche.querySelector("input");
  } else {
    suche = el("label", "liste-suche");
    feld = el("input");
    feld.type = "search";
    feld.id = "liste-suchfeld";
    feld.placeholder = "Befehl suchen, z. B. quiz";
    feld.setAttribute("aria-label", "Befehle durchsuchen");
    feld.autocomplete = "off";
    suche.append(feld);
    leer = el("p", "liste-leer", "Keine Befehle gefunden.");
    leer.hidden = true;
  }
  suche.insertAdjacentHTML("afterbegin", lupe);
  const chips = el("nav", "liste-chips");
  chips.setAttribute("aria-label", "Abschnitte");
  abschnitte[0].before(leiste);
  leiste.append(suche, chips);
  if (leer) leiste.after(leer);

  const chipFuer = new Map();
  for (const s of abschnitte) {
    const h2 = s.querySelector(":scope > h2");
    const titel = h2.textContent.trim();
    if (!s.id) s.id = kennung(titel);
    const zeilen = s.querySelectorAll(".row").length;
    if (zeilen) h2.append(el("span", "liste-anzahl", zeilen === 1 ? "1 Befehl" : `${zeilen} Befehle`));
    const chip = el("a", "liste-chip", titel);
    chip.href = "#" + s.id;
    chip.addEventListener("click", (e) => {
      // Ohne Hash-Wechsel springen: die Befehle-Website steuert ihre Ansichten über den Hash
      e.preventDefault();
      s.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    });
    chips.append(chip);
    chipFuer.set(s, chip);
  }

  // Chip des Abschnitts hervorheben, der gerade in der Mitte des Fensters ist
  const beob = new IntersectionObserver((eintraege) => {
    for (const e of eintraege) if (e.isIntersecting) chipFuer.forEach((c, s) => c.classList.toggle("aktiv", s === e.target));
  }, { rootMargin: "-40% 0px -55% 0px" });
  abschnitte.forEach((s) => beob.observe(s));

  // Befehle-Website: app.js filtert selbst; danach nur die Chips an die ausgeblendeten Abschnitte anpassen
  if (vorhanden) {
    feld.addEventListener("input", () => setTimeout(() => chipFuer.forEach((c, s) => { c.hidden = s.hidden; })));
    return;
  }

  // GitHub-Seite: Zeilen (Befehl + Erklärung) und Listenpunkte filtern, leere Abschnitte ausblenden
  const text = (e) => [...e.querySelectorAll("code, p, .cmd")].map((x) => x.textContent).join(" ") || e.textContent;
  feld.addEventListener("input", () => {
    const q = feld.value.trim().toLowerCase().replace(/^!/, "");
    let treffer = 0;
    for (const s of abschnitte) {
      const teile = s.querySelectorAll(".row, li");
      let sichtbar = 0;
      teile.forEach((z) => {
        const passt = !q || text(z).toLowerCase().includes(q);
        z.hidden = !passt;
        if (passt) sichtbar++;
      });
      const titelPasst = q && s.querySelector(":scope > h2").textContent.toLowerCase().includes(q);
      if (titelPasst) teile.forEach((z) => { z.hidden = false; });
      const zeigen = !q || sichtbar > 0 || titelPasst;
      s.hidden = !zeigen;
      s.querySelectorAll(":scope > .note").forEach((n) => { n.hidden = !!q; });
      chipFuer.get(s).hidden = !zeigen;
      if (zeigen) treffer++;
    }
    leer.hidden = treffer > 0;
  });
})();
