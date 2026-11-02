// Effekte der Startseite (Neon-Vorlage vom 02.11.2026):
// 1. 3D-Bühne hinter der ganzen Startseite (three.js, selbst gehostet unter /vendor/three, damit keine
//    Daten an fremde Server gehen): leuchtender Gitter-Kern mit Ringen, Funken, Gitterboden und kreisenden
//    Chat-Blasen ("!ask", "GG" …). Beim Scrollen wandert der Kern mit und die Kamera fliegt über den Boden;
//    ein Klick in den Kopfbereich löst eine Druckwelle aus.
// 2. Karten (Funktionen, Schritte) kippen in 3D zur Maus und haben einen Leuchtfleck.
// Läuft auf der Befehle-Website (Startseite #uebersicht, anfangs versteckt) und auf der GitHub-Seite (ohne
// #uebersicht, dort immer sichtbar). Pfade sind relativ zu dieser Datei, weil die GitHub-Seite unter /venoxbot/ liegt.
// three.js wird erst geladen, wenn die Startseite sichtbar ist, WebGL geht und der Browser keine
// reduzierte Bewegung wünscht. Ohne WebGL bleibt die Seite wie vorher (Leuchten aus CSS).

const ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
const feineMaus = matchMedia("(hover: hover) and (pointer: fine)").matches;

// Karten: 3D-Kippen zur Maus plus Leuchtfleck (Mausposition als CSS-Variablen, style.css malt den Verlauf).
// Nur mit echter Maus, auf dem Handy würde ein Tippen die Karte schief stehen lassen.
if (feineMaus && !ruhig) {
  document.querySelectorAll(".funktionen li, .schritte li").forEach((karte) => {
    karte.classList.add("kippt");
    karte.addEventListener("pointermove", (e) => {
      const r = karte.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      karte.style.setProperty("--mx", `${e.clientX - r.left}px`);
      karte.style.setProperty("--my", `${e.clientY - r.top}px`);
      karte.style.transform = `perspective(700px) rotateX(${(-y * 10).toFixed(2)}deg) rotateY(${(x * 12).toFixed(2)}deg) translateY(-4px)`;
    });
    karte.addEventListener("pointerleave", () => { karte.style.transform = ""; });
  });
}

const uebersicht = document.getElementById("uebersicht");
const held = document.querySelector(".held");
const webgl = (() => {
  try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; }
})();

// Startseite gerade zu sehen? Ohne #uebersicht (GitHub-Seite) immer
const startseiteSichtbar = () => !uebersicht || !uebersicht.hidden;

if (held && webgl && !ruhig) {
  // Erst laden, wenn der Kopfbereich wirklich zu sehen ist (die Übersicht ist anfangs versteckt)
  const warten = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    warten.disconnect();
    import(new URL("vendor/three/three.module.min.js", import.meta.url).href).then(starte3D).catch(() => { /* ohne 3D weiter */ });
  });
  warten.observe(held);
}

// Weicher runder Farbverlauf als Bild (für Schein, Funken und Druckwelle)
function verlaufBild(THREE) {
  const lw = document.createElement("canvas");
  lw.width = lw.height = 128;
  const g = lw.getContext("2d");
  const v = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  v.addColorStop(0, "rgba(255,45,61,.55)");
  v.addColorStop(1, "rgba(255,45,61,0)");
  g.fillStyle = v;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(lw);
}

// Chat-Blase als Bild: abgerundetes Kästchen mit Text, rot umrandet
function blasenBild(THREE, text) {
  const c = document.createElement("canvas");
  const g = c.getContext("2d");
  const schrift = "700 44px system-ui, 'Segoe UI', Roboto, Ubuntu, sans-serif";
  g.font = schrift;
  const b = Math.ceil(g.measureText(text).width) + 56;
  c.width = b; c.height = 96;
  g.font = schrift;
  g.fillStyle = "rgba(20,12,13,.9)";
  g.strokeStyle = "#ff3b4a";
  g.lineWidth = 4;
  g.beginPath();
  g.roundRect(2, 2, b - 4, 76, 22);
  g.moveTo(30, 78); g.lineTo(40, 94); g.lineTo(52, 78);
  g.fill(); g.stroke();
  g.fillStyle = "#f4efea";
  g.textBaseline = "middle";
  g.fillText(text, 28, 41);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return { t, seitenverhaeltnis: b / 96 };
}

function starte3D(THREE) {
  // Ein fest stehendes Canvas hinter der ganzen Seite; nur sichtbar, solange die Startseite gezeigt wird
  const canvas = document.createElement("canvas");
  canvas.className = "buehne-3d";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);
  held.classList.add("mit-3d");
  const zeigen = () => canvas.classList.toggle("da", startseiteSichtbar());
  if (uebersicht) new MutationObserver(zeigen).observe(uebersicht, { attributes: true, attributeFilter: ["hidden"] });
  requestAnimationFrame(zeigen);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 860 ? 1.5 : 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 9);
  const verlauf = verlaufBild(THREE);

  const rot = new THREE.Color(0xff2d3d);
  const gruppe = new THREE.Group();
  scene.add(gruppe);

  // Kern: dunkler Körper innen, damit die hinteren Gitterkanten verdeckt sind, darüber die roten Kanten;
  // dazu ein zweites, langsameres Gitter außen herum für mehr Tiefe
  const kernGeo = new THREE.IcosahedronGeometry(1.6, 1);
  const innen = new THREE.Mesh(kernGeo, new THREE.MeshBasicMaterial({ color: 0x0d0808 }));
  const kanten = new THREE.LineSegments(new THREE.EdgesGeometry(kernGeo),
    new THREE.LineBasicMaterial({ color: rot, transparent: true, opacity: 0.95 }));
  kanten.scale.setScalar(1.002);
  const huelle = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2.05, 0)),
    new THREE.LineBasicMaterial({ color: 0xffb3ba, transparent: true, opacity: 0.25 }));
  gruppe.add(innen, kanten, huelle);

  // Weicher Schein hinter dem Kern: Sprite mit Farbverlauf statt Nachbearbeitung (spart Leistung)
  const schein = new THREE.Sprite(new THREE.SpriteMaterial({ map: verlauf, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  schein.scale.setScalar(9);
  gruppe.add(schein);

  // Zwei Ringe um den Kern (wie Umlaufbahnen)
  const ringe = [2.5, 3.1].map((r, i) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 8, 160),
      new THREE.MeshBasicMaterial({ color: i ? 0xffb3ba : rot, transparent: true, opacity: i ? 0.35 : 0.7 }));
    ring.rotation.x = Math.PI / 2 + (i ? 0.5 : -0.3);
    gruppe.add(ring);
    return ring;
  });

  // Chat-Blasen, die auf schrägen Bahnen um den Kern kreisen (Befehle und typische Bot-Antworten)
  const blasen = ["!ask", "GG", "🎲 17", "!join", "+25 Punkte", "Quiz!", "!clip", "⚔️ Duell"].map((text, i, alle) => {
    const { t, seitenverhaeltnis } = blasenBild(THREE, text);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
    const h = 0.42;
    s.scale.set(h * seitenverhaeltnis, h, 1);
    s.userData = { winkel: (i / alle.length) * Math.PI * 2, radius: 2.9 + (i % 3) * 0.35, hoehe: ((i % 4) - 1.5) * 0.7, tempo: 0.18 + (i % 3) * 0.05 };
    gruppe.add(s);
    return s;
  });

  // Funken: runde, weiche Punkte, die langsam um den Kern kreisen
  const anzahl = innerWidth < 860 ? 450 : 900;
  const pos = new Float32Array(anzahl * 3);
  for (let i = 0; i < anzahl; i++) {
    const r = 2.4 + Math.random() * 8, w = Math.random() * Math.PI * 2, h = (Math.random() - 0.3) * 14;
    pos.set([Math.cos(w) * r, h, Math.sin(w) * r], i * 3);
  }
  const funkenGeo = new THREE.BufferGeometry();
  funkenGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const funkenMat = new THREE.PointsMaterial({ color: 0xff4a58, size: 0.12, map: verlauf, transparent: true, opacity: 0.9, depthWrite: false });
  const funken = new THREE.Points(funkenGeo, funkenMat);
  scene.add(funken);

  // Gitterboden wie im Erklärvideo
  const boden = new THREE.GridHelper(80, 80, 0x5a1018, 0x2a0b0f);
  boden.position.y = -3.2;
  scene.add(boden);

  // Druckwelle: flacher Ring, der sich nach einem Klick vom Kern aus ausbreitet und verblasst
  const welle = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 96),
    new THREE.MeshBasicMaterial({ color: 0xff3b4a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  gruppe.add(welle);
  let welleStart = -10, schub = 0;
  held.addEventListener("click", (e) => {
    if (e.target.closest("a, button, code, .chat")) return; // Klicks auf Knöpfe und Chat nicht abfangen
    welleStart = performance.now() / 1000;
    schub = 1;
  });

  // Hell/Dunkel: im hellen Modus heller Kern statt schwarzem Loch und normales statt leuchtendes Mischen
  const farbenAnpassen = () => {
    const hell = document.documentElement.dataset.thema === "hell";
    innen.material.color.set(hell ? 0xfff5f5 : 0x0d0808);
    funkenMat.blending = hell ? THREE.NormalBlending : THREE.AdditiveBlending;
    funkenMat.needsUpdate = true;
    schein.material.opacity = hell ? 0.5 : 1;
    boden.material.transparent = true;
    boden.material.opacity = hell ? 0.12 : 0.7;
  };
  farbenAnpassen();
  new MutationObserver(farbenAnpassen).observe(document.documentElement, { attributes: true, attributeFilter: ["data-thema"] });

  // Größe des Fensters; "breit" = PC-Ansicht mit Kern rechts, sonst Handy mit Kern weit hinten
  let breit = true;
  const groesse = () => {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    breit = w > 860;
  };
  addEventListener("resize", groesse);
  groesse();

  // Maus: Szene neigt sich leicht mit, weich nachgezogen
  const maus = { x: 0, y: 0, zx: 0, zy: 0 };
  addEventListener("pointermove", (e) => { maus.zx = e.clientX / innerWidth - 0.5; maus.zy = e.clientY / innerHeight - 0.5; }, { passive: true });

  // Scrollen: 0 oben, 1 am Seitenende; weich nachgezogen, damit die Kamera nicht ruckelt
  let scroll = 0;
  const lerp = (a, b, t) => a + (b - a) * t;

  const start = performance.now() / 1000;
  renderer.setAnimationLoop(() => {
    if (!startseiteSichtbar() || document.hidden) return;
    const jetzt = performance.now() / 1000, t = jetzt - start;
    const ziel = Math.min(1, scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight));
    scroll = lerp(scroll, ziel, 0.08);
    maus.x = lerp(maus.x, maus.zx, 0.05);
    maus.y = lerp(maus.y, maus.zy, 0.05);
    schub = lerp(schub, 0, 0.04);

    // Kern: oben rechts neben dem Text, wandert beim Scrollen nach links unten und weiter nach hinten
    if (breit) gruppe.position.set(lerp(2.4, -3.2, scroll), lerp(0.2, -0.6, scroll), lerp(-2.5, -6, scroll));
    else gruppe.position.set(0, lerp(-1.5, 0.5, scroll), lerp(-14, -10, scroll));

    const dreh = 1 + schub * 6; // nach einem Klick dreht sich alles kurz schneller
    kanten.rotation.set(t * 0.12 * dreh, t * 0.25 * dreh + scroll * 4, 0);
    innen.rotation.copy(kanten.rotation);
    huelle.rotation.set(-t * 0.08, -t * 0.1 - scroll * 2, 0);
    kanten.scale.setScalar(1.002 + Math.sin(t * 2.2) * 0.02 + schub * 0.15);
    ringe[0].rotation.z = t * 0.3 * dreh;
    ringe[1].rotation.z = -t * 0.2 * dreh;
    blasen.forEach((s) => {
      const d = s.userData, w = d.winkel + t * d.tempo;
      s.position.set(Math.cos(w) * d.radius, d.hoehe + Math.sin(t * 0.9 + d.winkel) * 0.2, Math.sin(w) * d.radius);
      s.material.opacity = 0.35 + 0.65 * Math.max(0, Math.sin(w) * 0.5 + 0.5); // hinten blasser
    });
    funken.rotation.y = t * 0.03 + scroll * 1.5;
    funken.position.y = scroll * -6;
    schein.material.opacity = (document.documentElement.dataset.thema === "hell" ? 0.5 : 0.85) + Math.sin(t * 2) * 0.15 + schub * 0.6;

    // Druckwelle: 1,2 Sekunden lang wachsen und verblassen
    const dw = jetzt - welleStart;
    if (dw < 1.2) {
      welle.scale.setScalar(1 + dw * 7);
      welle.material.opacity = 0.8 * (1 - dw / 1.2);
      welle.lookAt(camera.position);
    } else welle.material.opacity = 0;

    // Kamera: Maus-Neigung plus Flug über den Boden beim Scrollen
    gruppe.rotation.set(maus.y * 0.3, maus.x * 0.5, 0);
    camera.position.set(maus.x * 0.6, lerp(0, 1.6, scroll), lerp(9, 7, scroll));
    camera.lookAt(0, lerp(0, -1, scroll), -3);
    boden.position.z = (t * 0.6) % 1; // Boden zieht langsam vorbei (Gitter wiederholt sich alle 1 Einheit)
    renderer.render(scene, camera);
  });
}
