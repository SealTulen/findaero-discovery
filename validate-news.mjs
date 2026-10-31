import { readFile } from "node:fs/promises";

const events = JSON.parse(await readFile(new URL("../data/events.json", import.meta.url), "utf8"));
const sources = JSON.parse(await readFile(new URL("../data/sources.json", import.meta.url), "utf8"));
const ids = new Set();
const allowedCategories = new Set(["FLEET", "LIVERY", "ROUTE", "AIRPORT", "BUSINESS"]);
const errors = [];

if (!Array.isArray(events) || !Array.isArray(sources)) throw new Error("News and source registries must be JSON arrays.");
for (const [index, event] of events.entries()) {
  const label = `events[${index}]`;
  if (!event.id || ids.has(event.id)) errors.push(`${label}: missing or duplicate id`);
  ids.add(event.id);
  if (!event.title?.trim() || !event.description?.trim()) errors.push(`${label}: title and description are required`);
  if (!allowedCategories.has(event.category)) errors.push(`${label}: unknown category`);
  if (event.status !== "verified") errors.push(`${label}: only verified events may enter the public feed`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(event.eventDate ?? "")) errors.push(`${label}: eventDate must be YYYY-MM-DD`);
  if (event.category === "FLEET" && (!event.aircraft?.type || !event.aircraft?.registration)) errors.push(`${label}: fleet changes need a type and registration`);
  if (!Array.isArray(event.sources) || event.sources.length < 2) errors.push(`${label}: at least two linked sources are required`);
  for (const [sourceIndex, source] of (event.sources ?? []).entries()) {
    try {
      const parsed = new URL(source.url);
      if (parsed.protocol !== "https:") errors.push(`${label}.sources[${sourceIndex}]: HTTPS is required`);
    } catch {
      errors.push(`${label}.sources[${sourceIndex}]: invalid source URL`);
    }
    if (!source.name || !source.kind) errors.push(`${label}.sources[${sourceIndex}]: source name and role are required`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(source.publishedAt ?? "")) errors.push(`${label}.sources[${sourceIndex}]: publishedAt must be YYYY-MM-DD`);
  }
}

const sourceIds = new Set();
for (const [index, source] of sources.entries()) {
  const label = `sources[${index}]`;
  if (!source.id || sourceIds.has(source.id)) errors.push(`${label}: missing or duplicate id`);
  sourceIds.add(source.id);
  for (const field of ["url", "termsUrl"]) {
    try {
      if (new URL(source[field]).protocol !== "https:") errors.push(`${label}.${field}: HTTPS is required`);
    } catch {
      errors.push(`${label}.${field}: invalid URL`);
    }
  }
  if (!source.status || !source.limitations) errors.push(`${label}: status and limitations are required`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`News data valid: ${events.length} verified events, ${sources.length} source records.`);
}
