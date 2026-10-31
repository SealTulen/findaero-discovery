import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  }));
  return nested.flat();
}

const exportDir = "out";
assert.equal((await stat(exportDir)).isDirectory(), true, "Next static export folder is missing");
const files = await collectFiles(exportDir);
const htmlPath = join(exportDir, "index.html");
const html = await readFile(htmlPath, "utf8");
const cssPath = files.find((file) => file.endsWith(".css"));
assert.ok(cssPath, "Exported stylesheet is missing");
const css = await readFile(cssPath, "utf8");
const jsFiles = files.filter((file) => file.endsWith(".js"));
const appBundle = await Promise.all(jsFiles.map((file) => readFile(file, "utf8"))).then((chunks) => chunks.join("\n"));
const events = JSON.parse(await readFile("data/events.json", "utf8"));

assert.ok(html.includes("Последние события"), "News feed heading is missing from rendered HTML");
for (const event of events.filter((item) => item.status === "verified")) {
  assert.ok(appBundle.includes(event.id), `Verified event is missing from the client application bundle: ${event.id}`);
}
assert.ok(css.includes(".hero.hero-sources>.hero-copy-block"), "Scoped Sources hero correction is missing from exported CSS");
assert.ok(css.includes(".aircraft-model-viewer"), "Aircraft model sizing rules are missing from exported CSS");
assert.ok(files.some((file) => relative(exportDir, file).replaceAll("\\", "/").endsWith("models/A320_nologo.glb")), "Aircraft GLB is missing from export");
assert.ok(files.some((file) => relative(exportDir, file).replaceAll("\\", "/").endsWith("maps/russia.svg")), "Russia map is missing from export");
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
if (basePath) {
  assert.ok(html.includes(`${basePath}/_next/static/`), "GitHub Pages base path is missing from exported HTML");
  assert.ok(appBundle.includes(`${basePath}/models/A320_nologo.glb`), "GitHub Pages base path is missing from the aircraft model URL");
  assert.ok(appBundle.includes(`${basePath}/maps/russia.svg`), "GitHub Pages base path is missing from the Russia map URL");
}

console.log(`Static export valid: ${events.length} verified records, page, styles, aircraft model and Russia map.`);
