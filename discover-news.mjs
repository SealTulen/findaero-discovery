import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { isAviationChangeCandidate, normalizeAexItem, parseRss } from "./lib/rss.mjs";

const feedUrl = "https://www.aex.ru/rss/";
const feedName = "AEX.RU — RSS новостей Aviation EXplorer";
const articleHost = "www.aex.ru";
const maxBytes = 2_000_000;
const maxIssuesPerRun = 8;
const maxAgeDays = 14;
const maxAttempts = 3;
const repository = process.env.GITHUB_REPOSITORY;
const dryRun = process.argv.includes("--dry-run");

function gh(args) {
  return execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

async function fetchFeed() {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(feedUrl, {
        signal: controller.signal,
        headers: { accept: "application/rss+xml, application/xml, text/xml;q=0.9", "user-agent": "FINDaero-discovery/1.0 (metadata-only; source-linked editorial review)" },
      });
      if (!response.ok) {
        await response.body?.cancel();
        const error = new Error(`RSS request failed: HTTP ${response.status}`);
        if (response.status < 500 && response.status !== 429) throw Object.assign(error, { retryable: false });
        throw error;
      }
      const declaredLength = Number(response.headers.get("content-length") ?? 0);
      if (declaredLength > maxBytes) throw new Error(`RSS response exceeds ${maxBytes} bytes.`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error("RSS response body is empty.");
      const chunks = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) {
          await reader.cancel();
          throw new Error(`RSS response exceeds ${maxBytes} bytes.`);
        }
        chunks.push(Buffer.from(value));
      }
      return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
    } catch (error) {
      if (error?.retryable === false || attempt === maxAttempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error("RSS request failed after retries.");
}

function issueExists(key) {
  const result = gh(["issue", "list", "--repo", repository, "--state", "all", "--search", `in:title ${key}`, "--json", "number", "--limit", "1"]);
  return JSON.parse(result).length > 0;
}

function ensureReviewLabel() {
  const requiredLabels = [
    ["needs-review", "1d76db", "Ожидает ручной проверки источников"],
    ["publish-approved", "0e8a16", "Проверено редактором; передать в публикацию"],
    ["needs-more-information", "fbca04", "Нужны дополнительные подтверждения"],
    ["rejected", "d93f0b", "Отклонено модератором"],
  ];
  const readLabels = () => gh(["label", "list", "--repo", repository, "--json", "name", "--jq", ".[] | .name"])
    .split(/\r?\n/).filter(Boolean);
  let existing = new Set(readLabels());
  for (const [name, color, description] of requiredLabels) {
    if (existing.has(name)) continue;
    try {
      gh(["label", "create", name, "--repo", repository, "--color", color, "--description", description]);
    } catch {
      existing = new Set(readLabels());
      if (!existing.has(name)) throw new Error(`Could not ensure ${name} label exists.`);
    }
    existing.add(name);
  }
}

function issueBody(item, key) {
  const published = new Date(item.publishedAt).toLocaleString("ru-RU", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Moscow" });
  return [
    "<!-- findaero-rss-candidate:v1 -->",
    "## Кандидат для редакционной проверки",
    "",
    "Это автоматическая находка из открытой RSS-подписки, а не подтверждённое событие. В публичную ленту она не попадёт без ручной проверки и двух источников.",
    "",
    `- Заголовок RSS: ${item.title}`,
    `- Дата публикации в RSS: ${published} (МСК)`,
    `- Материал: ${item.url}`,
    `- Источник обнаружения: ${feedName} (${feedUrl})`,
    `- Идентификатор находки: ${key}`,
    "",
    "Откройте оригинал, проверьте дату и суть события. Найдите независимое подтверждение; не переносите текст или изображения. Если факт подтверждён, создайте отдельную заявку через форму «Предложить авиационное событие» с двумя ссылками.",
    `Форма события: https://github.com/${repository}/issues/new?template=event-submission.yml`,
  ].join("\n");
}

if (!dryRun && !repository) throw new Error("GITHUB_REPOSITORY is required outside --dry-run mode.");
if (!dryRun) {
  const visibility = gh(["api", `repos/${repository}`, "--jq", ".visibility"]);
  if (visibility !== "private") throw new Error("RSS headline candidates are kept in a private GitHub moderation queue. Disable this workflow for public repositories.");
}
const events = JSON.parse(await readFile(new URL("../data/events.json", import.meta.url), "utf8"));
const knownUrls = new Set(events.flatMap((event) => (event.sources ?? []).map((source) => source.url)));
const xml = await fetchFeed();
const latestAllowed = Date.now() - maxAgeDays * 86_400_000;
const items = parseRss(xml)
  .map(normalizeAexItem)
  .filter(Boolean)
  .filter((item) => new URL(item.url).hostname === articleHost)
  .filter((item) => Date.parse(item.publishedAt) >= latestAllowed && Date.parse(item.publishedAt) <= Date.now() + 60_000)
  .filter((item) => isAviationChangeCandidate(item.title))
  .filter((item) => !knownUrls.has(item.url))
  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

if (dryRun) {
  console.log(JSON.stringify({ feed: feedUrl, scanned: parseRss(xml).length, candidates: items.slice(0, maxIssuesPerRun) }, null, 2));
  process.exit(0);
}

ensureReviewLabel();
let created = 0;
let duplicates = 0;
for (const item of items) {
  if (created >= maxIssuesPerRun) break;
  const key = `aex-${createHash("sha256").update(item.url).digest("hex").slice(0, 12)}`;
  if (issueExists(key)) { duplicates += 1; continue; }
  const title = `Кандидат новости ${key}: ${item.title}`.slice(0, 250);
  gh(["issue", "create", "--repo", repository, "--title", title, "--body", issueBody(item, key), "--label", "needs-review"]);
  created += 1;
}
console.log(`RSS discovery complete: ${parseRss(xml).length} feed items, ${items.length} relevant candidates, ${created} new review issues, ${duplicates} duplicates skipped.`);
