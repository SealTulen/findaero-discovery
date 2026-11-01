import { readFile } from "node:fs/promises";

const [airlines, events] = await Promise.all([
  readFile(new URL("../data/airlines.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../data/events.json", import.meta.url), "utf8").then(JSON.parse),
]);
if (!Array.isArray(airlines) || airlines.length === 0) throw new Error("data/airlines.json must contain airline records.");
if (!Array.isArray(events)) throw new Error("data/events.json must contain an array.");

const slugs = new Set();
const names = new Set();
const eventNames = new Set();
for (const airline of airlines) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(airline.slug ?? "")) throw new Error(`Invalid airline slug: ${airline.slug}`);
  if (slugs.has(airline.slug)) throw new Error(`Duplicate airline slug: ${airline.slug}`);
  slugs.add(airline.slug);
  if (!airline.name?.trim()) throw new Error(`${airline.slug}: name is required.`);
  for (const name of [airline.name, ...(airline.eventAliases ?? [])]) {
    const key = name.trim().toLocaleLowerCase("ru");
    if (!key || names.has(key)) throw new Error(`Duplicate or empty airline name/alias: ${name}`);
    names.add(key);
    eventNames.add(key);
  }
  if (airline.officialWebsite) {
    const url = new URL(airline.officialWebsite);
    if (url.protocol !== "https:") throw new Error(`${airline.name}: official website must use HTTPS.`);
  }
}

const orphaned = [...new Set(events.filter((event) => event.status === "verified").map((event) => event.airline))]
  .filter((name) => !eventNames.has(name.toLocaleLowerCase("ru")));
if (orphaned.length) throw new Error(`Verified event airline names are missing from the directory: ${orphaned.join(", ")}`);
console.log(`Airline directory valid: ${airlines.length} profile routes, ${events.filter((event) => event.status === "verified").length} verified events linked.`);
