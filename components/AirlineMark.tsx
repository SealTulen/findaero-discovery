export function AirlineMark({ airline }: { airline: string }) {
  const key = airline.toLowerCase();
  const mark = key.includes("red wings") ? { initials: "RW", style: "red-wings" }
    : key.includes("красавиа") || key.includes("krasavia") ? { initials: "КРАСАВИА", style: "krasavia" }
    : key.includes("s7") ? { initials: "S7", style: "s7" }
    : key.includes("ираэро") || key.includes("iraero") ? { initials: "IA", style: "iraero" }
    : key.includes("ямал") || key.includes("yamal") ? { initials: "Я", style: "yamal" }
    : key.includes("россия") || key.includes("rossiya") ? { initials: "РОССИЯ", style: "rossiya" }
    : key.includes("аэрофлот") ? { initials: "А", style: "aeroflot" }
    : { initials: airline.split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase(), style: "generic" };

  const symbol = mark.style === "red-wings"
    ? <svg viewBox="0 0 48 32" aria-hidden="true"><path d="M4 8 19 12 24 5 29 12 44 8 32 18 24 14 16 18Z"/><path d="m8 21 11-2 5 7 5-7 11 2-11 5-5-3-5 3Z"/></svg>
    : mark.style === "s7"
      ? <svg viewBox="0 0 48 32" aria-hidden="true"><text x="24" y="25" textAnchor="middle">S7</text></svg>
      : mark.style === "aeroflot"
        ? <svg viewBox="0 0 48 32" aria-hidden="true"><path d="M24 4 28 13 43 7 31 18 26 16 24 28 22 16 17 18 5 7 20 13Z"/><path d="M13 22h22"/></svg>
        : mark.style === "rossiya"
          ? <svg viewBox="0 0 48 32" aria-hidden="true"><path d="M7 20c7-2 10-8 17-14 7 6 10 12 17 14-7-1-12 0-17-4-5 4-10 3-17 4Z"/><path d="M15 24h18"/></svg>
          : mark.style === "yamal"
            ? <svg viewBox="0 0 48 32" aria-hidden="true"><path d="M11 6h8v9h10V6h8v20h-8v-7H19v7h-8Z"/><path d="M8 4h32" opacity=".45"/></svg>
            : mark.style === "iraero"
              ? <svg viewBox="0 0 48 32" aria-hidden="true"><path d="M7 25 21 5l4 7L18 25Zm14 0L34 5l7 20h-7l-5-11-6 11Z"/></svg>
              : mark.style === "krasavia"
                ? <svg viewBox="0 0 48 32" aria-hidden="true"><path d="M7 22 17 8l6 7 6-7 12 14H30l-7-7-7 7Z"/><circle cx="36" cy="9" r="2"/></svg>
                : <svg viewBox="0 0 48 32" aria-hidden="true"><path d="M5 22 19 8l5 6 5-6 14 14H31l-7-7-7 7Z"/></svg>;

  const wordmark = mark.style === "s7" ? "" : mark.initials;

  return (
    <span
      className={`airline-mark airline-mark-${mark.style}`}
      role="img"
      aria-label={`Эмблема ${airline}`}
    >
      <span className="airline-mark-symbol">{symbol}</span>
      {wordmark && <span className="airline-mark-letters">{wordmark}</span>}
    </span>
  );
}
