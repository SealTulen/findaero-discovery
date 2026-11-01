import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = new URL("../", import.meta.url);
const sources = JSON.parse(await readFile(new URL("data/sources.json", root), "utf8"));
const outputPath = resolve(process.argv[2] ?? "reports/source-health.json");
const publicOutputPath = resolve("public/source-health.json");
const timeoutMs = 12_000;
const retries = 2;
const delay = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));

if (!Array.isArray(sources)) throw new Error("data/sources.json must contain an array.");
for (const source of sources) {
  const url = new URL(source.url);
  if (url.protocol !== "https:") throw new Error(`${source.id}: source URL must use HTTPS.`);
}
if (process.argv.includes("--validate-only")) {
  console.log(`Source registry valid: ${sources.length} HTTPS URLs. No requests made.`);
  process.exit(0);
}

let previousResults = new Map();
try {
  const previousReport = JSON.parse(await readFile(publicOutputPath, "utf8"));
  if (previousReport.checkType === "http_availability_only" && Array.isArray(previousReport.results)) {
    previousResults = new Map(previousReport.results.map((result) => [result.sourceId, result]));
  }
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

async function request(source, method) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(source.url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "FINDaero-Source-Health/1.0 (+https://github.com/; metadata-only check)",
        ...(method === "GET" ? { range: "bytes=0-0" } : {}),
      },
    });
    if (method === "GET") await response.body?.cancel();
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function checkSource(source) {
  const checkedAt = new Date().toISOString();
  const previous = previousResults.get(source.id);
  const lastSuccessfulAt = previous?.availability === "reachable" ? previous.checkedAt : previous?.lastSuccessfulAt ?? null;
  let lastError = "Не удалось проверить доступность";
  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    try {
      let response = await request(source, "HEAD");
      if (response.status === 405 || response.status === 501) response = await request(source, "GET");
      const reachable = response.status >= 200 && response.status < 400;
      if (reachable) {
        return {
          sourceId: source.id,
          name: source.name,
          url: source.url,
          availability: "reachable",
          httpStatus: response.status,
          checkedAt,
          lastSuccessfulAt: checkedAt,
          attempts: attempt,
          note: "Проверен только HTTP-ответ. Это не подтверждает наличие RSS/API и не разрешает повторное использование материалов.",
        };
      }
      lastError = `HTTP ${response.status}`;
      if (response.status < 500 && response.status !== 429) {
        return {
          sourceId: source.id,
          name: source.name,
          url: source.url,
          availability: response.status === 401 || response.status === 403 ? "restricted" : "unavailable",
          httpStatus: response.status,
          checkedAt,
          lastSuccessfulAt,
          attempts: attempt,
          note: lastError,
        };
      }
    } catch (error) {
      lastError = error?.name === "AbortError" ? `Тайм-аут после ${timeoutMs} мс` : String(error?.message ?? error).slice(0, 240);
    }
    if (attempt <= retries) await delay(1500 * attempt);
  }
  return {
    sourceId: source.id,
    name: source.name,
    url: source.url,
    availability: "unavailable",
    httpStatus: null,
    checkedAt,
    lastSuccessfulAt,
    attempts: retries + 1,
    note: lastError,
  };
}

const results = [];
for (let index = 0; index < sources.length; index += 3) {
  const batch = sources.slice(index, index + 3);
  results.push(...await Promise.all(batch.map(checkSource)));
}

const counts = Object.fromEntries(["reachable", "restricted", "unavailable"].map((status) => [status, results.filter((entry) => entry.availability === status).length]));
const report = {
  checkedAt: new Date().toISOString(),
  checkType: "http_availability_only",
  sourceCount: results.length,
  counts,
  disclaimer: "Проверка доступности URL не означает, что источник разрешает автоматический сбор или повторное использование. Содержание страниц не сохраняется.",
  results,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(publicOutputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Source availability check complete: ${counts.reachable} reachable, ${counts.restricted} restricted, ${counts.unavailable} unavailable.`);
console.log(`Metadata-only report written to ${outputPath} and ${publicOutputPath}`);
