export function classifyModerationIssue(issue) {
  const title = issue?.title ?? "";
  const body = issue?.body ?? "";
  if (title.startsWith("Предложение события:")) return "event-submission";
  if (/^Кандидат новости aex-[a-f0-9]{12}:/i.test(title) && body.includes("<!-- findaero-rss-candidate:v1 -->")) return "rss-candidate";
  return "other";
}
