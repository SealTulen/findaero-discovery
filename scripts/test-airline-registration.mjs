import assert from "node:assert/strict";
import { airlineSlug, registerAirline } from "./lib/airlines.mjs";

assert.equal(airlineSlug("Новая авиакомпания"), "novaya-aviakompaniya");

const directory = [
  { slug: "s7-airlines", name: "S7 Airlines", eventAliases: ["S7 Group"] },
];

const aliasResult = registerAirline(directory, "s7 group");
assert.equal(aliasResult.created, false);
assert.equal(aliasResult.airlines.length, 1);

const newResult = registerAirline(directory, "Новая авиакомпания");
assert.equal(newResult.created, true);
assert.equal(newResult.airline.slug, "novaya-aviakompaniya");
assert.equal(newResult.airline.officialWebsite, undefined);

const collisionResult = registerAirline(
  [{ slug: "novaya-aviakompaniya", name: "Другой перевозчик" }],
  "Новая авиакомпания",
);
assert.equal(collisionResult.airline.slug, "novaya-aviakompaniya-2");

console.log("Airline registration checks passed.");
