import assert from "node:assert/strict";
import { airlineSlug, registerAirline } from "./lib/airlines.mjs";

assert.equal(airlineSlug("Новая авиакомпания"), "novaya-aviakompaniya");
const directory = [{ slug: "s7-airlines", name: "S7 Airlines", eventAliases: ["S7 Group"] }];
const aliasResult = registerAirline(directory, "s7 group");
assert.equal(aliasResult.created, false, "An existing event alias must not create a duplicate profile.");
assert.equal(aliasResult.airlines.length, 1);

const newResult = registerAirline(directory, "Новая авиакомпания");
assert.equal(newResult.created, true);
assert.equal(newResult.airline.slug, "novaya-aviakompaniya");
assert.equal(newResult.airline.officialWebsite, undefined, "Do not infer an official website for a new carrier.");

const collisionResult = registerAirline([{ slug: "novaya-aviakompaniya", name: "Другой перевозчик" }], "Новая авиакомпания");
assert.equal(collisionResult.airline.slug, "novaya-aviakompaniya-2", "Slug collisions must receive a deterministic suffix.");

console.log("Airline registration checks passed (Cyrillic slug, alias match, new profile and slug collision).");
