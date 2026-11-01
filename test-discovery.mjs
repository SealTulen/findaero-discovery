import assert from "node:assert/strict";
import { isAviationChangeCandidate, normalizeAexItem, parseRss } from "./lib/rss.mjs";
import { classifyModerationIssue } from "./lib/moderation.mjs";

const sample = `<?xml version="1.0"?><rss version="2.0"><channel><item><title><![CDATA[Red Wings объявила новый маршрут]]></title><link>https://www.aex.ru/news/2026/10/30/123456/</link><pubDate>Fri, 30 Oct 2026 12:00:00 +0300</pubDate></item><item><title>Новости рынка без изменения</title><link>https://www.aex.ru/news/2026/10/30/123457/</link><pubDate>Fri, 30 Oct 2026 12:00:00 +0300</pubDate></item></channel></rss>`;
const parsed = parseRss(sample);
assert.equal(parsed.length, 2);
assert.equal(parsed[0].title, "Red Wings объявила новый маршрут");
assert.equal(normalizeAexItem(parsed[0]).url, "https://www.aex.ru/news/2026/10/30/123456/");
assert.equal(normalizeAexItem({ ...parsed[0], url: "https://example.org/news/story" }), null);
assert.equal(isAviationChangeCandidate(parsed[0].title), true);
assert.equal(isAviationChangeCandidate(parsed[1].title), false);
assert.equal(isAviationChangeCandidate("Авиамаршрут Минск — Жуковский запущен после длительного перерыва"), true);
assert.throws(() => parseRss("<html>not a feed</html>"), /not RSS XML/);
assert.equal(classifyModerationIssue({ title: "Кандидат новости aex-012345abcdef: Новый маршрут", body: "<!-- findaero-rss-candidate:v1 -->" }), "rss-candidate");
assert.equal(classifyModerationIssue({ title: "Предложение события: маршрут открыт", body: "<!-- findaero-rss-candidate:v1 -->" }), "event-submission");
assert.equal(classifyModerationIssue({ title: "Кандидат новости aex-012345abcdef: Новый маршрут", body: "plain text" }), "other");
console.log("RSS discovery checks passed (parser, URL allow-list, candidate filter, moderation routing).");
