// Hell/Dunkel-Umschalter (Knopf mit Mond und Sonne, id="thema-knopf"). Standard ist dunkel; die Wahl
// merkt sich der Browser (localStorage, nur auf diesem Gerät). Läuft im <head> ohne defer, damit die
// Seite gleich in der gewählten Farbe erscheint und nicht erst dunkel aufblitzt.
(() => {
  const root = document.documentElement;
  try {
    if (localStorage.getItem("thema") === "hell") root.dataset.thema = "hell";
  } catch { /* Speicher gesperrt: dann bleibt es dunkel */ }

  // Knopf-Zustand und Beschriftung (für Screenreader und Tooltip) zur aktuellen Farbe passend setzen
  const anzeigen = (knopf) => {
    const hell = root.dataset.thema === "hell";
    const text = hell ? "Dunklen Modus einschalten" : "Hellen Modus einschalten";
    knopf.setAttribute("aria-pressed", String(hell));
    knopf.setAttribute("aria-label", text);
    knopf.title = text;
  };

  document.addEventListener("DOMContentLoaded", () => {
    const knopf = document.getElementById("thema-knopf");
    if (!knopf) return;
    anzeigen(knopf);
    knopf.addEventListener("click", () => {
      if (root.dataset.thema === "hell") delete root.dataset.thema;
      else root.dataset.thema = "hell";
      try { localStorage.setItem("thema", root.dataset.thema === "hell" ? "hell" : "dunkel"); } catch { /* egal */ }
      anzeigen(knopf);
    });
  });
})();
