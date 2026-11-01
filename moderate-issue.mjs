import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { classifyModerationIssue } from "./lib/moderation.mjs";
import { registerAirline } from "./lib/airlines.mjs";

const payload = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, "utf8"));
const issue = payload.issue;
if (!issue?.number || !issue.body) throw new Error("Issue payload is missing a number or structured body.");
const label = payload.label?.name;
const repository = process.env.GITHUB_REPOSITORY;
const actor = process.env.GITHUB_ACTOR;
const branch = process.env.DEFAULT_BRANCH || "main";

function gh(args, options = {}) {
  return execFileSync("gh", args, { encoding: "utf8", stdio: options.inherit ? "inherit" : ["ignore", "pipe", "pipe"] });
}
function git(args, options = {}) {
  return execFileSync("git", args, { encoding: "utf8", stdio: options.inherit ? "inherit" : ["ignore", "pipe", "pipe"] });
}
function requireModerator() {
  const result = JSON.parse(gh(["api", `repos/${repository}/collaborators/${actor}/permission`]));
  if (!["admin", "maintain", "write"].includes(result.permission)) {
    throw new Error(`@${actor} needs write, maintain, or admin repository permission to moderate events.`);
  }
}
function heading(labelText) {
  const escaped = labelText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matcher = new RegExp(`^### ${escaped}\\s*\\r?\\n`, "m");
  const match = matcher.exec(issue.body);
  if (!match) return "";
  const remainder = issue.body.slice(match.index + match[0].length);
  const nextHeading = remainder.search(/^### /m);
  const value = (nextHeading < 0 ? remainder : remainder.slice(0, nextHeading)).trim();
  return value.toLowerCase() === "_no response_" ? "" : value;
}
function firstToken(value) { return value.split(" — ")[0].trim(); }
function required(value, labelText) {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.toLowerCase() === "_no response_") throw new Error(`Issue field “${labelText}” is required.`);
  return trimmed;
}
function date(value, labelText) {
  const normalized = required(value, labelText);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || new Date(`${normalized}T00:00:00Z`).toISOString().slice(0, 10) !== normalized) {
    throw new Error(`Issue field “${labelText}” must be a real date in YYYY-MM-DD format.`);
  }
  return normalized;
}
function optionalDate(value, labelText) {
  return value?.trim() ? date(value, labelText) : undefined;
}
function coordinate(value, labelText, min, max) {
  if (!value?.trim()) return undefined;
  const number = Number(value.trim());
  if (!Number.isFinite(number) || number < min || number > max) throw new Error(`Issue field “${labelText}” must be between ${min} and ${max}.`);
  return number;
}
function source(index) {
  const name = required(heading(`Источник ${index} — название`), `Источник ${index} — название`);
  const url = required(heading(`Источник ${index} — HTTPS ссылка`), `Источник ${index} — HTTPS ссылка`);
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error(`Источник ${index}: invalid URL.`); }
  if (parsed.protocol !== "https:") throw new Error(`Источник ${index}: HTTPS is required.`);
  return {
    name,
    url: parsed.toString(),
    publishedAt: date(heading(`Источник ${index} — дата публикации`), `Источник ${index} — дата публикации`),
    kind: required(heading(`Источник ${index} — тип`), `Источник ${index} — тип`),
  };
}
function uniqueId() { return `issue-${issue.number}`; }
async function appendModeration(entry) {
  const path = "data/moderation-log.json";
  let log = [];
  try { log = JSON.parse(await readFile(path, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
  if (!log.some((item) => item.issueNumber === issue.number && item.action === entry.action)) log.push(entry);
  await writeFile(path, `${JSON.stringify(log, null, 2)}\n`, "utf8");
}
async function commitAndDeploy(message) {
  const issueLabels = JSON.parse(gh(["api", `repos/${repository}/issues/${issue.number}/labels`])).map((entry) => entry.name);
  const removeLabels = ["needs-review", "needs-more-information"].filter((name) => issueLabels.includes(name));
  const editArgs = ["issue", "edit", String(issue.number), "--repo", repository];
  for (const name of removeLabels) editArgs.push("--remove-label", name);
  editArgs.push("--add-label", label === "publish-approved" ? "published" : label);
  gh(editArgs, { inherit: true });
  gh(["issue", "close", String(issue.number), "--repo", repository, "--reason", label === "publish-approved" ? "completed" : "not planned"], { inherit: true });
  gh(["issue", "comment", String(issue.number), "--repo", repository, "--body", label === "publish-approved" ? "Событие прошло ручную проверку источников и добавлено в публичный реестр. Начинаю сборку сайта." : `Заявка закрыта редактором с решением: ${label}.`], { inherit: true });
  git(["config", "user.name", "github-actions[bot]"], { inherit: true });
  git(["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"], { inherit: true });
  git(["add", "data/events.json", "data/sources.json", "data/airlines.json", "data/moderation-log.json"], { inherit: true });
  if (!git(["diff", "--cached", "--name-only"]).trim()) return;
  git(["commit", "-m", message], { inherit: true });
  git(["push", "origin", `HEAD:${branch}`], { inherit: true });
  gh(["workflow", "run", "webpack.yml", "--repo", repository, "--ref", branch], { inherit: true });
}

if (payload.action === "opened") {
  if (!issue.title.startsWith("Предложение события:")) process.exit(0);
  const labels = [
    ["needs-review", "1d76db", "Ожидает ручной проверки источников"],
    ["publish-approved", "0e8a16", "Проверено редактором; передать в публикацию"],
    ["needs-more-information", "fbca04", "Нужны дополнительные подтверждения"],
    ["rejected", "d93f0b", "Отклонено модератором"],
    ["published", "5319e7", "Добавлено в публичную ленту"],
  ];
  const existing = new Set(gh(["label", "list", "--repo", repository, "--json", "name", "--jq", ".[].name" ]).split("\n").map((value) => value.trim()).filter(Boolean));
  for (const [name, color, description] of labels) {
    if (!existing.has(name)) gh(["label", "create", name, "--repo", repository, "--color", color, "--description", description], { inherit: true });
  }
  gh(["issue", "edit", String(issue.number), "--repo", repository, "--add-label", "needs-review"], { inherit: true });
  gh(["issue", "comment", String(issue.number), "--repo", repository, "--body", "Заявка добавлена в очередь проверки. Она не появится на сайте, пока редактор не сверит источники и не применит метку `publish-approved`."], { inherit: true });
  process.exit(0);
}

if (payload.action !== "labeled" || !["publish-approved", "rejected", "needs-more-information"].includes(label)) process.exit(0);
const issueKind = classifyModerationIssue(issue);
if (issueKind === "other") process.exit(0);
requireModerator();

if (issueKind === "rss-candidate") {
  if (label === "publish-approved") {
    gh(["issue", "edit", String(issue.number), "--repo", repository, "--remove-label", "publish-approved"], { inherit: true });
    gh(["issue", "comment", String(issue.number), "--repo", repository, "--body", `RSS-кандидат не является готовым событием и не может быть опубликован этой меткой. Проверьте оригинал и независимое подтверждение, затем создайте отдельную структурированную заявку: https://github.com/${repository}/issues/new?template=event-submission.yml`], { inherit: true });
    process.exit(0);
  }
  if (label === "needs-more-information") {
    gh(["issue", "edit", String(issue.number), "--repo", repository, "--remove-label", "needs-review"], { inherit: true });
    gh(["issue", "comment", String(issue.number), "--repo", repository, "--body", "Редактор просит дополнительное подтверждение или уточнение даты. Откройте исходный материал и приложите независимый источник; кандидат пока не опубликован."], { inherit: true });
    process.exit(0);
  }
  gh(["issue", "edit", String(issue.number), "--repo", repository, "--remove-label", "needs-review"], { inherit: true });
  gh(["issue", "close", String(issue.number), "--repo", repository, "--reason", "not planned"], { inherit: true });
  gh(["issue", "comment", String(issue.number), "--repo", repository, "--body", "Редактор отклонил этот RSS-кандидат. Он не добавлялся в публичную ленту; история проверки сохранена в этой заявке."], { inherit: true });
  process.exit(0);
}

const moderation = {
  eventId: uniqueId(), administratorId: actor, action: label === "publish-approved" ? "verified" : label === "rejected" ? "rejected" : "needs_more_information",
  comment: `Решение редактора по GitHub Issue #${issue.number}.`, createdAt: new Date().toISOString(), issueNumber: issue.number,
};

if (label === "publish-approved") {
  const rightsDeclaration = heading("Проверка материалов");
  if (!rightsDeclaration.includes("Я добавил(а) только краткое описание своими словами")) throw new Error("The submitter must confirm that the submission contains no copied text or unlicensed images.");
  const categories = new Set(["FLEET", "LIVERY", "ROUTE", "AIRPORT", "BUSINESS"]);
  const eventTypesByCategory = {
    FLEET: ["aircraft_added", "aircraft_removed", "aircraft_transferred", "aircraft_returned_to_service", "aircraft_inactive", "aircraft_registration_changed", "aircraft_operator_changed", "aircraft_delivered", "aircraft_entered_service", "aircraft_retired"],
    LIVERY: ["new_special_livery", "new_aircraft_livery", "aircraft_repainted", "livery_removed", "promotional_livery", "anniversary_livery", "aircraft_brand_refresh", "livery_design_competition"],
    ROUTE: ["route_opened", "route_announced", "route_seasonal", "route_closed", "route_resumed", "route_frequency_changed", "route_aircraft_changed", "codeshare_expanded"],
    AIRPORT: ["airport_added", "airport_removed", "new_airline_presence", "airport_base_changed"],
    BUSINESS: ["new_contract", "new_project", "project_delayed", "project_cancelled", "project_completed", "airline_announcement", "executive_appointment"],
  };
  const category = firstToken(required(heading("Категория"), "Категория"));
  const eventType = firstToken(required(heading("Тип события"), "Тип события"));
  if (!categories.has(category)) throw new Error(`Unsupported event category “${category}”.`);
  if (!eventTypesByCategory[category]?.includes(eventType)) throw new Error(`Event type “${eventType}” does not belong to category “${category}”.`);
  const eventDate = date(heading("Дата события"), "Дата события");
  const detectedAt = new Date().toISOString().slice(0, 10);
  if (eventDate > detectedAt) throw new Error("Event date cannot be in the future; use the planned start date for an announcement.");
  const aircraftType = heading("Тип самолёта (если известно)");
  const registration = heading("Регистрационный номер (если известен)").trim().toUpperCase();
  const originName = heading("Откуда (для маршрута)");
  const destinationName = heading("Куда (для маршрута)");
  const plannedStartDate = optionalDate(heading("Планируемая дата начала (если анонс)"), "Планируемая дата начала");
  const originLatitude = coordinate(heading("Широта отправления (для карты, необязательно)"), "Широта отправления", -90, 90);
  const originLongitude = coordinate(heading("Долгота отправления (для карты, необязательно)"), "Долгота отправления", -180, 180);
  const destinationLatitude = coordinate(heading("Широта назначения (для карты, необязательно)"), "Широта назначения", -90, 90);
  const destinationLongitude = coordinate(heading("Долгота назначения (для карты, необязательно)"), "Долгота назначения", -180, 180);
  if (category === "FLEET" && (!aircraftType.trim() || !registration.trim())) throw new Error("Fleet events require both aircraft type and registration.");
  if (registration && !/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(registration)) throw new Error("Aircraft registration may contain only letters, numbers, and hyphens.");
  if (category === "ROUTE" && (!originName.trim() || !destinationName.trim())) throw new Error("Route events require origin and destination.");
  const completeOrigin = originLatitude !== undefined && originLongitude !== undefined;
  const completeDestination = destinationLatitude !== undefined && destinationLongitude !== undefined;
  if ((originLatitude !== undefined || originLongitude !== undefined || destinationLatitude !== undefined || destinationLongitude !== undefined) && !(completeOrigin && completeDestination)) throw new Error("Map coordinates must be provided as two complete latitude/longitude pairs.");
  const event = {
    id: uniqueId(),
    title: required(heading("Название события"), "Название события"),
    description: required(heading("Краткое описание"), "Краткое описание"),
    category, eventType,
    airline: required(heading("Авиакомпания"), "Авиакомпания"),
    eventDate, detectedAt, status: "verified",
    isHistorical: Date.parse(`${eventDate}T00:00:00Z`) < Date.parse(`${detectedAt}T00:00:00Z`) - 365 * 86400000,
    confidence: "high",
    ...(aircraftType.trim() || registration.trim() ? { aircraft: { ...(aircraftType.trim() ? { type: aircraftType.trim() } : {}), ...(registration.trim() ? { registration: registration.trim().toUpperCase() } : {}) } } : {}),
    ...(category === "ROUTE" ? { route: {
      originName: originName.trim(), destinationName: destinationName.trim(),
      ...(plannedStartDate ? { plannedStartDate } : {}), ...(aircraftType.trim() ? { aircraftType: aircraftType.trim() } : {}),
      mapVisible: completeOrigin && completeDestination,
      ...(completeOrigin ? { origin: { latitude: originLatitude, longitude: originLongitude } } : {}),
      ...(completeDestination ? { destination: { latitude: destinationLatitude, longitude: destinationLongitude } } : {}),
    } } : {}),
    sources: [source(1), source(2)],
  };
  const eventsPath = "data/events.json";
  const sourcesPath = "data/sources.json";
  const airlinesPath = "data/airlines.json";
  if (new Set(event.sources.map((item) => item.url)).size !== event.sources.length) throw new Error("The two source links must be different.");
  const events = JSON.parse(await readFile(eventsPath, "utf8"));
  const key = (item) => [item.category, item.eventType, item.airline.toLowerCase(), item.eventDate, item.aircraft?.registration?.toLowerCase() ?? "", item.route?.originName?.toLowerCase() ?? "", item.route?.destinationName?.toLowerCase() ?? ""].join("|");
  if (events.some((item) => item.id === event.id || key(item) === key(event))) throw new Error("This issue appears to duplicate an event already in the verified registry.");
  const airlineDirectory = JSON.parse(await readFile(airlinesPath, "utf8"));
  const airlineRegistration = registerAirline(airlineDirectory, event.airline);
  if (airlineRegistration.created) {
    await writeFile(airlinesPath, `${JSON.stringify(airlineRegistration.airlines, null, 2)}\n`, "utf8");
    console.log(`Created a minimal profile for newly verified carrier: ${airlineRegistration.airline.name} (${airlineRegistration.airline.slug}). No official website was inferred.`);
  }
  events.push(event);
  events.sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  await writeFile(eventsPath, `${JSON.stringify(events, null, 2)}\n`, "utf8");
  const sourceRegistry = JSON.parse(await readFile(sourcesPath, "utf8"));
  for (const [index, eventSource] of event.sources.entries()) {
    if (sourceRegistry.some((record) => record.url === eventSource.url)) continue;
    sourceRegistry.unshift({
      id: `${event.id}-source-${index + 1}`,
      name: eventSource.name,
      type: eventSource.kind.toLowerCase().includes("государ") ? "Государственный источник" : eventSource.kind.toLowerCase().includes("перевозчик") ? "Авиакомпания" : "Авиационное / региональное СМИ",
      url: eventSource.url,
      status: "Ручная проверка",
      limitations: "Добавлен при редакционной проверке события. Автоматический сбор и повторное использование материалов не настроены.",
    });
  }
  await writeFile(sourcesPath, `${JSON.stringify(sourceRegistry, null, 2)}\n`, "utf8");
  await appendModeration(moderation);
  execFileSync(process.execPath, ["scripts/validate-news.mjs"], { stdio: "inherit" });
  execFileSync(process.execPath, ["scripts/validate-airlines.mjs"], { stdio: "inherit" });
  await commitAndDeploy(`Publish verified aviation event from issue #${issue.number}`);
  process.exit(0);
}

await appendModeration(moderation);
if (label === "needs-more-information") {
  gh(["issue", "comment", String(issue.number), "--repo", repository, "--body", "Редактор запросил дополнительные сведения или независимые подтверждения. Обновите заявку и отметьте редактора в комментарии."], { inherit: true });
  git(["config", "user.name", "github-actions[bot]"], { inherit: true });
  git(["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"], { inherit: true });
  git(["add", "data/moderation-log.json"], { inherit: true });
  if (git(["diff", "--cached", "--name-only"]).trim()) {
    git(["commit", "-m", `Log moderation request for issue #${issue.number}`], { inherit: true });
    git(["push", "origin", `HEAD:${branch}`], { inherit: true });
  }
} else {
  await commitAndDeploy(`Record rejected aviation event from issue #${issue.number}`);
}
