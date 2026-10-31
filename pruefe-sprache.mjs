// Prüft, ob jeder deutsche Text der drei Seiten eine englische Übersetzung hat (sprache-en.js +
// sprache-en-github.js). Von Hand nach Änderungen an den Seiten: `node pruefe-sprache.mjs`.
// Bewusst einfach: Text zwischen Tags, ohne <code>, .cmd, Skripte und translate="no".
import { readFileSync } from "node:fs";
import vm from "node:vm";

const fenster = {};
const kontext = vm.createContext({ window: fenster });
for (const f of ["sprache-en.js", "sprache-en-github.js"]) vm.runInContext(readFileSync(new URL(f, import.meta.url), "utf8"), kontext);
const { texte, muster } = fenster.VENOX_EN;

const fehlt = new Set();
const pruefe = (t) => {
  t = t.replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&[a-z]+;/g, "").replace(/\s+/g, " ").trim();
  if (!t || !/[a-zäöüß]{3}/i.test(t)) return;
  if (Object.hasOwn(texte, t) || muster.some(([m]) => m.test(t))) return;
  if (/^(VenoxBot|VenoX_Bot|VENOX|BOT|Twitch|Discord|Streamer|Start|FAQ|Clips|Emotes|venoxbot@web\.de|[a-z0-9./_-]+)$/.test(t)) return;
  fehlt.add(t);
};
for (const seite of ["index.html", "befehle.html", "nutzungsbedingungen.html"]) {
  const rest = readFileSync(new URL(seite, import.meta.url), "utf8")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<code[\s\S]*?<\/code>/g, "<x>")
    .replace(/<span class="cmd">[\s\S]*?<\/span>/g, "<x>")
    .replace(/<(\w+)[^>]*translate="no"[^>]*>[\s\S]*?<\/\1>/g, "<x>");
  for (const teil of rest.split(/<[^>]+>/)) pruefe(teil);
  for (const [, wert] of rest.matchAll(/\s(?:aria-label|title|alt)="([^"]*)"/g)) pruefe(wert);
}
if (fehlt.size) {
  console.log(`Englisch: ${fehlt.size} Text(e) ohne Übersetzung (in sprache-en-github.js ergänzen):`);
  for (const t of fehlt) console.log("  - " + t.slice(0, 140));
  process.exit(1);
}
console.log("Englisch: alle Texte übersetzt.");
