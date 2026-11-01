import { readFile } from "node:fs/promises";

const events = JSON.parse(await readFile(new URL("../data/events.json", import.meta.url), "utf8"));
const sources = JSON.parse(await readFile(new URL("../data/sources.json", import.meta.url), "utf8"));
const ids = new Set();
const eventKeys = new Set();
const allowedCategories = new Set(["FLEET", "LIVERY", "ROUTE", "AIRPORT", "BUSINESS"]);
const eventTypesByCategory = {
  FLEET: new Set(["aircraft_added", "aircraft_removed", "aircraft_transferred", "aircraft_returned_to_service", "aircraft_inactive", "aircraft_registration_changed", "aircraft_operator_changed", "aircraft_delivered", "aircraft_entered_service", "aircraft_retired"]),
  LIVERY: new Set(["new_special_livery", "new_aircraft_livery", "aircraft_repainted", "livery_removed", "promotional_livery", "anniversary_livery", "aircraft_brand_refresh", "livery_design_competition"]),
  ROUTE: new Set(["route_opened", "route_announced", "route_seasonal", "route_closed", "route_resumed", "route_frequency_changed", "route_aircraft_changed", "codeshare_expanded"]),
  AIRPORT: new Set(["airport_added", "airport_removed", "new_airline_presence", "airport_base_changed"]),
  BUSINESS: new Set(["new_contract", "new_project", "project_delayed", "project_cancelled", "project_completed", "airline_announcement", "executive_appointment"]),
};
const errors = [];

if (!Array.isArray(events) || !Array.isArray(sources)) throw new Error("News and source registries must be JSON arrays.");
function isDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "")) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}
for (const [index, event] of events.entries()) {
  const label = `events[${index}]`;
  if (!event.id || ids.has(event.id)) errors.push(`${label}: missing or duplicate id`);
  ids.add(event.id);
  if (!event.title?.trim() || !event.description?.trim()) errors.push(`${label}: title and description are required`);
  if (!allowedCategories.has(event.category)) errors.push(`${label}: unknown category`);
  if (!eventTypesByCategory[event.category]?.has(event.eventType)) errors.push(`${label}: unknown or incompatible event type ${event.eventType}`);
  if (event.status !== "verified") errors.push(`${label}: only verified events may enter the public feed`);
  if (!isDate(event.eventDate)) errors.push(`${label}: eventDate must be a real date in YYYY-MM-DD format`);
  if (!isDate(event.detectedAt)) errors.push(`${label}: detectedAt must be a real date in YYYY-MM-DD format`);
  const eventKey = [event.category, event.eventType, event.airline?.toLocaleLowerCase("ru"), event.eventDate, event.aircraft?.registration?.toLocaleLowerCase("ru") ?? "", event.route?.originName?.toLocaleLowerCase("ru") ?? "", event.route?.destinationName?.toLocaleLowerCase("ru") ?? ""].join("|");
  if (eventKeys.has(eventKey)) errors.push(`${label}: duplicate event key`);
  eventKeys.add(eventKey);
  if (event.aircraft?.registration && !/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(event.aircraft.registration.trim().toUpperCase())) errors.push(`${label}: registration must contain only letters, numbers, and hyphens so its public history URL is safe`);
  if (event.category === "FLEET" && (!event.aircraft?.type || !event.aircraft?.registration)) errors.push(`${label}: fleet changes need a type and registration`);
  if (event.category === "ROUTE" && (!event.route?.originName?.trim() || !event.route?.destinationName?.trim())) errors.push(`${label}: route events need origin and destination names`);
  if (!Array.isArray(event.sources) || event.sources.length < 2) errors.push(`${label}: at least two linked sources are required`);
  const sourceUrls = new Set();
  for (const [sourceIndex, source] of (event.sources ?? []).entries()) {
    try {
      const parsed = new URL(source.url);
      if (parsed.protocol !== "https:") errors.push(`${label}.sources[${sourceIndex}]: HTTPS is required`);
      if (sourceUrls.has(parsed.href)) errors.push(`${label}.sources[${sourceIndex}]: duplicate source URL`);
      sourceUrls.add(parsed.href);
    } catch {
      errors.push(`${label}.sources[${sourceIndex}]: invalid source URL`);
    }
    if (!source.name || !source.kind) errors.push(`${label}.sources[${sourceIndex}]: source name and role are required`);
    if (!isDate(source.publishedAt)) errors.push(`${label}.sources[${sourceIndex}]: publishedAt must be a real date in YYYY-MM-DD format`);
  }
  const route = event.route;
  if (route) {
    const originComplete = Number.isFinite(route.origin?.latitude) && Number.isFinite(route.origin?.longitude);
    const destinationComplete = Number.isFinite(route.destination?.latitude) && Number.isFinite(route.destination?.longitude);
    const hasAnyCoordinates = route.origin?.latitude !== undefined || route.origin?.longitude !== undefined || route.destination?.latitude !== undefined || route.destination?.longitude !== undefined;
    if (hasAnyCoordinates && !(originComplete && destinationComplete)) errors.push(`${label}.route: coordinates must include both complete airport points`);
    if (route.mapVisible && !(originComplete && destinationComplete)) errors.push(`${label}.route: mapVisible requires complete origin and destination coordinates`);
    if (route.plannedStartDate && !isDate(route.plannedStartDate)) errors.push(`${label}.route: plannedStartDate must be a real date in YYYY-MM-DD format`);
  }
}

const sourceIds = new Set();
for (const [index, source] of sources.entries()) {
  const label = `sources[${index}]`;
  if (!source.id || sourceIds.has(source.id)) errors.push(`${label}: missing or duplicate id`);
  sourceIds.add(source.id);
  for (const field of ["url", ...(source.termsUrl ? ["termsUrl"] : [])]) {
    try {
      const parsed = new URL(source[field]);
      if (parsed.protocol !== "https:") errors.push(`${label}.${field}: HTTPS is required`);
      if (field === "termsUrl" && parsed.pathname === "/") errors.push(`${label}.termsUrl: a site homepage is not a verified terms or reuse policy`);
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
