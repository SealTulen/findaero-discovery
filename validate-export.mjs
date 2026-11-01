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
const airlines = JSON.parse(await readFile("data/airlines.json", "utf8"));
const registrations = [...new Set(events.filter((event) => event.status === "verified").map((event) => event.aircraft?.registration?.trim().toUpperCase()).filter(Boolean))];

assert.ok(html.includes("Последние события"), "News feed heading is missing from rendered HTML");
for (const event of events.filter((item) => item.status === "verified")) {
  assert.ok(appBundle.includes(event.id), `Verified event is missing from the client application bundle: ${event.id}`);
}
assert.ok(css.includes(".hero.hero-sources>.hero-copy-block"), "Scoped Sources hero correction is missing from exported CSS");
assert.ok(css.includes(".source-filters") && css.includes(".source-health-summary"), "Source registry filter and health summary styles are missing from exported CSS");
assert.ok(appBundle.includes("HTTP-доступность") && appBundle.includes("Название, сайт или ограничение"), "Search and availability filters are missing from the Sources interface");
assert.ok(css.includes(".aircraft-model-viewer"), "Aircraft model sizing rules are missing from exported CSS");
assert.ok(files.some((file) => relative(exportDir, file).replaceAll("\\", "/").endsWith("models/A320_nologo.glb")), "Aircraft GLB is missing from export");
assert.ok(files.some((file) => relative(exportDir, file).replaceAll("\\", "/").endsWith("maps/russia.svg")), "Russia map is missing from export");
for (const airline of airlines) {
  const profilePath = join(exportDir, "airlines", airline.slug, "index.html");
  assert.ok(files.includes(profilePath), `Static profile page is missing for ${airline.name}: ${profilePath}`);
  const profileHtml = await readFile(profilePath, "utf8");
  assert.ok(profileHtml.includes(airline.name), `Airline name is missing from profile page: ${airline.name}`);
  assert.ok(profileHtml.includes("Самолёт, регистрация, маршрут или событие"), `Search control is missing from profile page: ${airline.name}`);
  assert.ok(profileHtml.includes("По дате обнаружения") && profileHtml.includes("Все категории"), `Profile filters are missing from profile page: ${airline.name}`);
  const names = new Set([airline.name, ...(airline.eventAliases ?? [])].map((name) => name.toLocaleLowerCase("ru")));
  for (const event of events.filter((item) => item.status === "verified" && names.has(item.airline.toLocaleLowerCase("ru")))) {
    assert.ok(profileHtml.includes(event.title), `Profile page for ${airline.name} is missing event: ${event.id}`);
  }
  if (process.env.NEXT_PUBLIC_BASE_PATH) {
    assert.ok(profileHtml.includes(`href="${process.env.NEXT_PUBLIC_BASE_PATH}/"`), `GitHub Pages base path is missing from the ${airline.name} profile backlink`);
  }
}
for (const registration of registrations) {
  const profilePath = join(exportDir, "aircraft", registration, "index.html");
  assert.ok(files.includes(profilePath), `Static aircraft history page is missing for ${registration}: ${profilePath}`);
  const profileHtml = await readFile(profilePath, "utf8");
  assert.ok(profileHtml.includes(registration), `Aircraft registration is missing from its profile: ${registration}`);
  const history = events.filter((event) => event.status === "verified" && event.aircraft?.registration?.toUpperCase() === registration);
  for (const event of history) assert.ok(profileHtml.includes(event.title), `Aircraft profile ${registration} is missing event ${event.id}`);
  if (process.env.NEXT_PUBLIC_BASE_PATH) assert.ok(profileHtml.includes(`href="${process.env.NEXT_PUBLIC_BASE_PATH}/"`), `GitHub Pages base path is missing from aircraft profile ${registration}`);
}
assert.ok(appBundle.includes("/aircraft/"), "Fleet view is missing links to individual aircraft histories");
const healthPath = join(exportDir, "source-health.json");
if (files.some((file) => relative(exportDir, file).replaceAll("\\", "/").endsWith("source-health.json"))) {
  const report = JSON.parse(await readFile(healthPath, "utf8"));
  const sources = JSON.parse(await readFile("data/sources.json", "utf8"));
  assert.equal(report.checkType, "http_availability_only", "Source health report must only claim HTTP availability");
  assert.equal(report.sourceCount, sources.length, "Source health report must cover every registered source");
  assert.equal(report.results.length, sources.length, "Source health report is missing source results");
  assert.equal(new Set(report.results.map((result) => result.sourceId)).size, sources.length, "Source health report has duplicate results");
  const sourceIds = new Set(sources.map((source) => source.id));
  for (const result of report.results) {
    assert.ok(sourceIds.has(result.sourceId), `Unknown source in health report: ${result.sourceId}`);
    assert.ok(["reachable", "restricted", "unavailable"].includes(result.availability), `Invalid availability for ${result.sourceId}`);
    assert.ok(Number.isFinite(Date.parse(result.checkedAt)), `Invalid check date for ${result.sourceId}`);
    assert.ok(result.lastSuccessfulAt == null || Number.isFinite(Date.parse(result.lastSuccessfulAt)), `Invalid last successful check date for ${result.sourceId}`);
  }
}

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
if (basePath) {
  assert.ok(html.includes(`${basePath}/_next/static/`), "GitHub Pages base path is missing from exported HTML");
  assert.ok(appBundle.includes(`${basePath}/models/A320_nologo.glb`), "GitHub Pages base path is missing from the aircraft model URL");
  assert.ok(appBundle.includes(`${basePath}/maps/russia.svg`), "GitHub Pages base path is missing from the Russia map URL");
}

console.log(`Static export valid: ${events.length} verified events, ${airlines.length} airline profiles, ${registrations.length} aircraft history pages, styles, aircraft model and Russia map.`);
