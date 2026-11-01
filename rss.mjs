const AIRLINE_TERMS = [
  "аэрофлот", "россия", "победа", "s7", "utair", "ютэйр", "уральские авиалинии",
  "red wings", "ред вингс", "северсталь", "алроса", "ижавиа", "газпром авиа",
  "руслайн", "ямал", "nordwind", "smartavia", "азимут", "ираэро", "красавиа",
  "аврора", "azur air", "якутия", "полярные авиалинии", "чукотавиа", "ангара",
];
const AVIATION_TERMS = ["авиа", "авиакомпан", "перевозчик", "рейс", "рейс", "аэропорт", "самол", "воздушн", "флот", "маршрут", "лайнер"];
const CHANGE_TERMS = ["нов", "открыл", "запуст", "запущ", "возобнов", "прекрат", "закрыл", "получил", "постав", "представил", "анонс", "назначен", "назначила", "передал", "сменил", "ввел", "ввела", "переш", "расшир", "сократ", "увелич", "изменил", "расписан", "частот", "проект", "контракт", "договор", "ливре", "окрас", "самолет", "борта"];

function decodeXml(value) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(x[\da-f]+|\d+);/gi, (_, code) => {
      const point = code[0].toLowerCase() === "x" ? Number.parseInt(code.slice(1), 16) : Number.parseInt(code, 10);
      return point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : "�";
    })
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'")
    .trim();
}

function tagValue(block, tag) {
  const match = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}\\s*>`, "i").exec(block);
  return match ? decodeXml(match[1]) : "";
}

export function parseRss(xml) {
  if (typeof xml !== "string" || !/<(?:rss|rdf:RDF)\b/i.test(xml)) throw new Error("Feed is not RSS XML.");
  const itemTag = /<item\b[^>]*>([\s\S]*?)<\/item\s*>/gi;
  const items = [];
  for (const match of xml.matchAll(itemTag)) {
    const block = match[1];
    const title = tagValue(block, "title");
    const link = tagValue(block, "link") || tagValue(block, "guid");
    const dateText = tagValue(block, "pubDate") || tagValue(block, "dc:date");
    const publishedAt = new Date(dateText);
    if (!title || !link || !Number.isFinite(publishedAt.valueOf())) continue;
    let url;
    try { url = new URL(link).toString(); } catch { continue; }
    items.push({ title: title.replace(/\s+/g, " ").trim(), url, publishedAt: publishedAt.toISOString() });
  }
  return items;
}

export function normalizeAexItem(item) {
  let url;
  try { url = new URL(item.url); } catch { return null; }
  if (url.protocol !== "https:" || !["aex.ru", "www.aex.ru"].includes(url.hostname.toLowerCase()) || !/^\/news\//.test(url.pathname)) return null;
  url.hash = "";
  url.search = "";
  return { ...item, url: url.toString() };
}

export function isAviationChangeCandidate(title) {
  const normalized = title.toLocaleLowerCase("ru-RU");
  const hasAirline = AIRLINE_TERMS.some((term) => normalized.includes(term));
  const hasAviationContext = AVIATION_TERMS.some((term) => normalized.includes(term));
  const hasChange = CHANGE_TERMS.some((term) => normalized.includes(term));
  return hasAviationContext && hasChange && (hasAirline || /авиакомпан|перевозчик|авиа|рейс|маршрут|ливре|самолет|аэропорт/.test(normalized));
}
