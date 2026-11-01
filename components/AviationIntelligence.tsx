"use client";

import { useMemo, useState } from "react";
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays,
  CircleHelp, Compass, Database, GitBranch, Radar, ShieldCheck, Sparkles,
  X,
} from "lucide-react";
import { EVENT_CATEGORY_LABELS, EVENT_TYPE_LABELS, type EventCategory, type EventType } from "@/lib/domain";

type SourceRef = { name: string; url: string; publishedAt: string; kind: string };
type EventRecord = {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  eventType: EventType;
  airline: string;
  eventDate: string;
  detectedAt: string;
  status: string;
  confidence?: string;
  isHistorical?: boolean;
  aircraft?: { type: string; registration?: string };
  route?: {
    originName: string;
    destinationName: string;
    aircraftType?: string;
    plannedStartDate?: string;
  };
  sources: SourceRef[];
};
type ModerationRecord = {
  eventId: string;
  action: string;
  comment?: string;
  createdAt: string;
  administratorId?: string;
};
type Tab = "PULSE" | "RADAR" | "DOMINO" | "DNA" | "NEXT";

const tabs: { id: Tab; title: string; subtitle: string; icon: typeof Activity }[] = [
  { id: "PULSE", title: "AVIATION PULSE", subtitle: "Срез изменений", icon: Activity },
  { id: "RADAR", title: "CHANGE RADAR", subtitle: "Поток сигналов", icon: Radar },
  { id: "DOMINO", title: "DOMINO EFFECT", subtitle: "Связи и гипотезы", icon: GitBranch },
  { id: "DNA", title: "AVIATION DNA", subtitle: "Эволюция реестра", icon: Compass },
  { id: "NEXT", title: "WHAT’S NEXT", subtitle: "Планы и сценарии", icon: Sparkles },
];
const categories = Object.keys(EVENT_CATEGORY_LABELS) as EventCategory[];

function formatDate(value?: string) {
  if (!value) return "Дата не указана";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.valueOf())
    ? "Дата не указана"
    : date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

function daysBetween(first: string, second: string) {
  return Math.abs(Date.parse(`${first}T00:00:00Z`) - Date.parse(`${second}T00:00:00Z`)) / 86_400_000;
}

function relation(first: EventRecord, second: EventRecord) {
  const firstReg = first.aircraft?.registration?.trim().toUpperCase();
  const secondReg = second.aircraft?.registration?.trim().toUpperCase();
  if (firstReg && secondReg && firstReg === secondReg) return { label: `Одна регистрация борта · ${firstReg}`, fact: true };
  const a = first.route;
  const b = second.route;
  if (a && b && a.originName === b.originName && a.destinationName === b.destinationName) {
    return { label: `Одна пара направлений · ${a.originName} — ${a.destinationName}`, fact: true };
  }
  if (first.airline === second.airline) return { label: `Один перевозчик · ${first.airline}`, fact: false };
  return null;
}

function hypothesisPair(event: EventRecord, events: EventRecord[]) {
  if (event.category !== "FLEET" && event.category !== "ROUTE") return [];
  return events.filter((other) => {
    if (other.id === event.id || other.airline !== event.airline) return false;
    if (event.category === other.category || !["FLEET", "ROUTE"].includes(other.category)) return false;
    return daysBetween(event.eventDate, other.eventDate) <= 180;
  }).sort((a, b) => daysBetween(event.eventDate, a.eventDate) - daysBetween(event.eventDate, b.eventDate)).slice(0, 3);
}

function EventButton({ event, onOpen, compact = false }: { event: EventRecord; onOpen: (event: EventRecord) => void; compact?: boolean }) {
  return (
    <button type="button" className={`intel-event ${compact ? "intel-event-compact" : ""}`} onClick={() => onOpen(event)}>
      <span className="intel-event-top"><span className="intel-category">{EVENT_CATEGORY_LABELS[event.category]}</span><span>{formatDate(event.eventDate)}</span></span>
      <strong>{event.title}</strong>
      {!compact && <span className="intel-event-airline">{event.airline}{event.aircraft?.registration ? ` · ${event.aircraft.registration}` : ""}</span>}
      <ArrowUpRight size={15} aria-hidden="true" />
    </button>
  );
}

export function AviationIntelligence({ events, moderationLog }: { events: EventRecord[]; moderationLog: ModerationRecord[] }) {
  const [tab, setTab] = useState<Tab>("PULSE");
  const [selectedId, setSelectedId] = useState("");
  const [radarCategory, setRadarCategory] = useState<EventCategory | "ALL">("ALL");
  const [radarAirline, setRadarAirline] = useState("ALL");
  const [dnaMonths, setDnaMonths] = useState(6);

  const verified = useMemo(
    () => events.filter((event) => event.status === "verified").sort((a, b) => b.detectedAt.localeCompare(a.detectedAt) || b.eventDate.localeCompare(a.eventDate)),
    [events],
  );
  const selectedEvent = verified.find((event) => event.id === selectedId) ?? null;
  const radarAirlines = [...new Set(verified.map((event) => event.airline))].sort((a, b) => a.localeCompare(b, "ru"));
  const radarEvents = verified.filter((event) =>
    (radarCategory === "ALL" || event.category === radarCategory) &&
    (radarAirline === "ALL" || event.airline === radarAirline),
  );
  const latestObservedAt = verified[0]?.detectedAt;
  const latestTimestamp = latestObservedAt ? Date.parse(`${latestObservedAt}T00:00:00Z`) : Date.now();
  const recentSignals = verified.filter((event) => latestTimestamp - Date.parse(`${event.detectedAt}T00:00:00Z`) <= 30 * 86_400_000);

  const now = new Date();
  const dnaStart = new Date(now.getFullYear(), now.getMonth() - dnaMonths + 1, 1);
  const dnaEvents = verified.filter((event) => Date.parse(`${event.eventDate}T00:00:00`) >= dnaStart.getTime());
  const dnaTimeline = Array.from({ length: dnaMonths }, (_, index) => {
    const month = new Date(dnaStart.getFullYear(), dnaStart.getMonth() + index, 1);
    const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    const count = dnaEvents.filter((event) => {
      const time = Date.parse(`${event.eventDate}T00:00:00`);
      return time >= month.getTime() && time < next.getTime();
    }).length;
    return { label: month.toLocaleDateString("ru-RU", { month: "short" }), full: month.toLocaleDateString("ru-RU", { month: "long", year: "numeric" }), count };
  });
  const maxMonthCount = Math.max(1, ...dnaTimeline.map((month) => month.count));
  const futurePlans = verified.filter((event) => event.route?.plannedStartDate && Date.parse(`${event.route.plannedStartDate}T00:00:00`) > Date.now());

  function openDossier(event: EventRecord) {
    setSelectedId(event.id);
  }

  function renderPulse() {
    const newest = [...verified].sort((a, b) => b.eventDate.localeCompare(a.eventDate) || b.detectedAt.localeCompare(a.detectedAt)).slice(0, 5);
    const airlinesObserved = new Set(recentSignals.map((event) => event.airline)).size;
    return <div className="intel-view pulse-view">
      <div className="intel-pulse-head">
        <div><span className="intel-overline"><i /> AVIATION PULSE · СВЕРЕННЫЕ ИЗМЕНЕНИЯ</span><h2>Сначала факт.<br/><em>Потом его связи.</em></h2><p>События ниже подтверждены источниками и отражают покрытие реестра FINDaero — не полный объём активности рынка.</p></div>
        <div className="pulse-orbit" aria-hidden="true"><div className="pulse-orbit-ring ring-a"/><div className="pulse-orbit-ring ring-b"/><div className="pulse-orbit-ring ring-c"/><span className="pulse-orbit-plane">✦</span><span className="pulse-orbit-tag tag-one">{verified.length.toString().padStart(2, "0")} VERIFIED</span><span className="pulse-orbit-tag tag-two">RU · CIVIL AVIATION</span></div>
      </div>
      <div className="intel-stat-strip"><div><span>ЗАПИСЕЙ В РЕЕСТРЕ</span><b>{verified.length}</b><small>подтверждённые события</small></div><div><span>НОВЫХ НАБЛЮДЕНИЙ</span><b>{recentSignals.length}</b><small>в пределах последних 30 дней данных</small></div><div><span>ПЕРЕВОЗЧИКОВ УПОМЯНУТО</span><b>{airlinesObserved}</b><small>в тех же наблюдениях</small></div><div><span>ПРОИСХОЖДЕНИЕ</span><b><ShieldCheck size={17}/> VERIFIED</b><small>факты со ссылками на источники</small></div></div>
      <div className="intel-section-heading"><div><span className="intel-overline">ПОСЛЕДНИЕ НАБЛЮДЕНИЯ</span><h3>Что изменилось</h3></div><button className="intel-text-action" onClick={() => setTab("RADAR")}>Открыть радар <ArrowRight size={14}/></button></div>
      <div className="pulse-event-grid">{newest.map((event, index) => <div className={`pulse-feature pulse-feature-${index + 1}`} key={event.id}><span className="pulse-index">0{index + 1}</span><EventButton event={event} onOpen={openDossier}/></div>)}</div>
      {!verified.length && <EmptyState title="Пока нет подтверждённых изменений" text="События появятся после проверки фактов и источников."/>}
    </div>;
  }

  function renderRadar() {
    const counts = categories.map((category) => ({ category, count: verified.filter((event) => event.category === category).length }));
    return <div className="intel-view radar-view">
      <div className="intel-heading-block"><span className="intel-overline">CHANGE RADAR · РЕЕСТР СИГНАЛОВ</span><h2>Следим за <em>изменениями</em></h2><p>Радар группирует опубликованные события по категориям и перевозчикам. Приоритет важности не присваивается автоматически.</p></div>
      <div className="radar-layout"><div className="radar-console"><div className="radar-scope" aria-label="Распределение проверенных событий по категориям"><span className="scope-ring scope-ring-one"/><span className="scope-ring scope-ring-two"/><span className="scope-ring scope-ring-three"/><span className="scope-crosshair"/><span className="scope-sweep"/><span className="scope-center"><Radar size={24}/><b>CHANGE<br/>SIGNALS</b></span>{counts.map(({ category, count }, index) => <span className={`scope-contact contact-${index + 1}`} key={category} title={`${EVENT_CATEGORY_LABELS[category]}: ${count}`}><i/>{count > 0 && <b>{count}</b>}</span>)}</div><div className="radar-legend">{counts.map(({ category, count }) => <button type="button" key={category} className={radarCategory === category ? "selected" : ""} onClick={() => setRadarCategory(radarCategory === category ? "ALL" : category)}><i className={`legend-${category.toLowerCase()}`}/><span>{EVENT_CATEGORY_LABELS[category]}</span><b>{count}</b></button>)}</div><div className="radar-ethics"><CircleHelp size={14}/> Схема показывает состав реестра событий, а не местоположение самолётов и не уровень срочности.</div></div>
        <section className="radar-feed"><div className="radar-feed-head"><div><span className="intel-overline">СИГНАЛЫ · {radarEvents.length}</span><h3>Поток изменений</h3></div><div className="radar-selects"><label><span>Категория</span><select value={radarCategory} onChange={(event) => setRadarCategory(event.target.value as EventCategory | "ALL")}><option value="ALL">Все категории</option>{categories.map((category) => <option key={category} value={category}>{EVENT_CATEGORY_LABELS[category]}</option>)}</select></label><label><span>Авиакомпания</span><select value={radarAirline} onChange={(event) => setRadarAirline(event.target.value)}><option value="ALL">Все перевозчики</option>{radarAirlines.map((airline) => <option key={airline} value={airline}>{airline}</option>)}</select></label></div></div><div className="radar-event-list">{radarEvents.map((event) => <article className="radar-signal" key={event.id}><div className="signal-rail"><i/><span>{formatDate(event.detectedAt)}</span></div><div className="signal-copy"><div className="signal-labels"><span>{EVENT_CATEGORY_LABELS[event.category]}</span><span>ПРИОРИТЕТ НЕ ОЦЕНЁН</span></div><button type="button" onClick={() => openDossier(event)}>{event.title}</button><p>{event.airline} · {EVENT_TYPE_LABELS[event.eventType]}</p></div><button className="signal-open" aria-label={`Открыть досье: ${event.title}`} onClick={() => openDossier(event)}><ArrowUpRight size={15}/></button></article>)}{!radarEvents.length && <EmptyState title="По этим фильтрам записей нет" text="Выберите другую категорию или перевозчика."/>}</div></section>
      </div>
    </div>;
  }

  function renderDomino() {
    const root = verified.find((event) => event.id === selectedId) ?? verified[0];
    if (!root) return <EmptyState title="Недостаточно подтверждённых данных" text="Связи появятся, когда в реестре будут события с общими самолётами, направлениями или перевозчиками."/>;
    const connections = verified.filter((event) => event.id !== root.id).map((event) => ({ event, relation: relation(root, event) })).filter((item): item is { event: EventRecord; relation: NonNullable<ReturnType<typeof relation>> } => Boolean(item.relation)).sort((a, b) => Number(b.relation.fact) - Number(a.relation.fact) || b.event.eventDate.localeCompare(a.event.eventDate)).slice(0, 6);
    const hypotheses = hypothesisPair(root, verified);
    return <div className="intel-view domino-view">
      <div className="intel-heading-block"><span className="intel-overline">DOMINO EFFECT · КАРТА СВЯЗЕЙ</span><h2>Связи видны.<br/><em>Причины требуют доказательств.</em></h2><p>Выбери событие. Система покажет проверяемые пересечения и отдельно — гипотезы, которые нельзя считать причинно-следственными выводами.</p></div>
      <label className="domino-root-select"><span>ЦЕНТР ЦЕПОЧКИ</span><select value={root.id} onChange={(event) => setSelectedId(event.target.value)}>{verified.map((item) => <option value={item.id} key={item.id}>{item.eventDate} · {item.airline} · {item.title}</option>)}</select></label>
      <div className="domino-root-card"><span className="domino-node-icon"><GitBranch size={17}/></span><div><span className="intel-overline">ПОДТВЕРЖДЁННОЕ СОБЫТИЕ · {EVENT_CATEGORY_LABELS[root.category]}</span><h3>{root.title}</h3><p>{root.airline} · событие {formatDate(root.eventDate)} · обнаружено {formatDate(root.detectedAt)}</p></div><button type="button" onClick={() => openDossier(root)}>Открыть досье <ArrowUpRight size={14}/></button></div>
      <div className="domino-legend"><span><i className="edge-fact"/>Общий идентификатор в источниках</span><span><i className="edge-context"/>Общий контекст, без причинного вывода</span><span><i className="edge-hypothesis"/>Аналитическая гипотеза</span></div>
      <div className="domino-columns"><section className="domino-column"><div className="intel-section-heading"><div><span className="intel-overline">ПОДТВЕРЖДЁННЫЕ ПЕРЕСЕЧЕНИЯ</span><h3>Общие факты и контекст</h3></div><span className="domino-count">{connections.length}</span></div>{connections.length ? <div className="domino-links">{connections.map(({ event, relation: link }) => <article key={event.id} className="domino-link"><i className={link.fact ? "edge-fact" : "edge-context"}/><div><span className={link.fact ? "connection-kind factual" : "connection-kind contextual"}>{link.fact ? "ПОЛЕ СОВПАДАЕТ" : "ОБЩИЙ КОНТЕКСТ"} · {link.label}</span><button type="button" onClick={() => openDossier(event)}>{event.title}<ArrowUpRight size={13}/></button><small>{event.airline} · {formatDate(event.eventDate)}</small></div></article>)}</div> : <EmptyState title="Прямых пересечений не найдено" text="Для этой записи нет другого события с тем же бортом, маршрутом или перевозчиком в реестре."/>}</section>
        <section className="domino-column hypothesis-column"><div className="intel-section-heading"><div><span className="intel-overline">НЕ ЯВЛЯЕТСЯ УСТАНОВЛЕННЫМ ФАКТОМ</span><h3>Возможная цепочка</h3></div><span className="hypothesis-chip">ГИПОТЕЗА</span></div>{hypotheses.length ? <><div className="hypothesis-explainer"><Sparkles size={15}/> Совпадение перевозчика и близость дат подсказывают тему для проверки, но сами по себе не доказывают влияние.</div>{hypotheses.map((event) => <article className="hypothesis-card" key={event.id}><span>АНАЛИТИЧЕСКОЕ ПРЕДПОЛОЖЕНИЕ · {daysBetween(root.eventDate, event.eventDate)} ДН.</span><p>{root.category === "FLEET" ? "Изменение флота могло совпасть с корректировкой маршрутной сети." : "Изменение маршрутной сети могло быть связано с изменением доступных мощностей."} Причинная связь не установлена.</p><button type="button" onClick={() => openDossier(event)}>Событие для проверки: {event.title} <ArrowRight size={13}/></button></article>)}</> : <EmptyState title="Пока нет пары для гипотезы" text="Покажем сценарий, только если найдутся события флота и маршрутов одного перевозчика в пределах 180 дней. Это окно поиска связей, а не доказательство влияния."/>}</section></div>
    </div>;
  }

  function renderDna() {
    const categoryCounts = categories.map((category) => ({ category, count: dnaEvents.filter((event) => event.category === category).length }));
    const observedAirlines = new Set(dnaEvents.map((event) => event.airline)).size;
    return <div className="intel-view dna-view"><div className="intel-heading-block"><span className="intel-overline">AVIATION DNA · ЭВОЛЮЦИЯ НАБЛЮДАЕМОГО</span><h2>Снимок отрасли<br/><em>по проверенным событиям.</em></h2><p>Исторические данные в проекте неполные. Здесь показана динамика найденных записей, а не полный размер флота или рынка.</p></div>
      <div className="dna-controls"><div><span>ОКНО ИСТОРИИ</span><b>{dnaMonths} мес.</b></div><input type="range" min="3" max="12" step="1" value={dnaMonths} onChange={(event) => setDnaMonths(Number(event.target.value))} aria-label="Период исторического обзора в месяцах"/><div className="dna-range-labels"><span>3 месяца</span><span>12 месяцев</span></div></div>
      <div className="dna-summary"><div><span>ПОДТВЕРЖДЁННЫХ ЗАПИСЕЙ</span><b>{dnaEvents.length}</b><small>событие, а не оценка объёма рынка</small></div><div><span>ПЕРЕВОЗЧИКОВ В ЗАПИСЯХ</span><b>{observedAirlines}</b><small>упомянуты за выбранный период</small></div><div><span>ДАННЫЕ О ПОЛНОМ ФЛОТЕ</span><b>НЕТ СНИМКОВ</b><small>размер парка не экстраполируется</small></div></div>
      <section className="dna-chart-panel"><div className="dna-chart-head"><div><span className="intel-overline">TIMELINE · {dnaStart.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })} — СЕГОДНЯ</span><h3>Изменения по месяцам</h3></div><span className="dna-chart-note">Каждый столбец — подтверждённые события в реестре</span></div><div className="dna-chart" role="img" aria-label={`Число подтверждённых событий по месяцам за ${dnaMonths} месяцев`}><div className="dna-chart-grid"><i/><i/><i/><i/></div>{dnaTimeline.map((month) => <div className="dna-month" key={month.full} title={`${month.full}: ${month.count} подтверждённых записей`}><div className="dna-bar-wrap"><span className="dna-bar-value">{month.count || ""}</span><i className={month.count ? "dna-bar is-active" : "dna-bar"} style={{ height: `${month.count ? Math.max(7, (month.count / maxMonthCount) * 100) : 0}%` }}/></div><small>{month.label}</small></div>)}</div></section>
      <div className="dna-category-grid">{categoryCounts.map(({ category, count }) => <div className="dna-category" key={category}><span>{EVENT_CATEGORY_LABELS[category]}</span><b>{count.toString().padStart(2, "0")}</b><i style={{ width: `${dnaEvents.length ? (count / dnaEvents.length) * 100 : 0}%` }}/></div>)}</div>
      <p className="intel-data-caveat"><Database size={14}/> Исторические срезы отражают покрытие источников, даты обнаружения и редакционную политику. Отсутствие записи не означает, что изменений не было.</p>
    </div>;
  }

  function renderNext() {
    return <div className="intel-view next-view"><div className="intel-heading-block"><span className="intel-overline">WHAT’S NEXT · НАБЛЮДАЕМЫЕ ПЛАНЫ</span><h2>Будущее — только<br/><em>с пометкой об уверенности.</em></h2><p>Показываем подтверждённые планы отдельно от сценариев. Не строим прогноз спроса и не обещаем выполнение расписания.</p></div>
      {futurePlans.length ? <div className="next-plan-list">{futurePlans.map((event) => { const route = event.route!; return <article className="next-plan-card" key={event.id}><div className="next-plan-date"><CalendarDays size={15}/><span>ПЛАНОВАЯ ДАТА</span><b>{formatDate(route.plannedStartDate)}</b></div><div className="next-plan-body"><div className="signal-labels"><span>ПОДТВЕРЖДЁННОЕ ОБЪЯВЛЕНИЕ</span><span>НЕ ФАКТ ВЫПОЛНЕНИЯ</span></div><h3>{route.originName} <ArrowRight size={17}/> {route.destinationName}</h3><strong>{event.airline} · {event.title}</strong><p>{event.description}</p><div className="scenario-box"><span><Sparkles size={13}/> СЦЕНАРИЙ · АНАЛИТИЧЕСКОЕ ПРЕДПОЛОЖЕНИЕ</span><p>Если план будет выполнен, у перевозчика появится сообщение по указанному направлению. Это не вывод о частоте, спросе, рентабельности или влиянии на конкурентов.</p><small>Что изменит оценку: перенос даты, отмена объявления или подтверждение первого выполненного рейса.</small></div><div className="next-sources">{event.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>{source.name} <ArrowUpRight size={13}/></a>)}</div><button className="intel-text-action" onClick={() => openDossier(event)}>Открыть досье события <ArrowRight size={14}/></button></div></article>; })}</div> : <EmptyState title="Подтверждённых будущих планов в реестре нет" text="Мы не строим прогнозы без событий и источников, на которых их можно проверить."/>}
      <div className="next-method"><ShieldCheck size={16}/><div><b>Как читать этот раздел</b><p>План — это сообщение источника о намерении. Сценарий — аналитическое предположение. Уверенность в факте не переносится автоматически на возможный результат.</p></div></div>
    </div>;
  }

  const activeTab = tabs.find((item) => item.id === tab)!;
  const ActiveIcon = activeTab.icon;
  const relatedForDossier = selectedEvent ? verified.filter((event) => event.id !== selectedEvent.id && relation(selectedEvent, event)).slice(0, 6) : [];
  const dossierEdits = selectedEvent ? moderationLog.filter((record) => record.eventId === selectedEvent.id) : [];
  const dossierHypotheses = selectedEvent ? hypothesisPair(selectedEvent, verified) : [];

  return <div className="aviation-intelligence">
    <div className="intel-tabs" role="tablist" aria-label="Инструменты FINDaero"><div className="intel-tab-brand"><span className="intel-brand-icon"><Activity size={17}/></span><span><b>FINDaero</b><small>AVIATION INTELLIGENCE</small></span></div>{tabs.map((item) => { const Icon = item.icon; return <button type="button" role="tab" aria-selected={tab === item.id} className={`intel-tab ${tab === item.id ? "active" : ""}`} key={item.id} onClick={() => setTab(item.id)}><Icon size={15}/><span><b>{item.title}</b><small>{item.subtitle}</small></span></button>; })}</div>
    <div className="intel-workspace" key={tab}><div className="intel-workspace-top"><div><span><ActiveIcon size={13}/> FINDaero / INTELLIGENCE / {activeTab.title}</span></div><span className="intel-data-status"><i/> ДАННЫЕ: {verified.length} VERIFIED</span></div>
      {tab === "PULSE" && renderPulse()}{tab === "RADAR" && renderRadar()}{tab === "DOMINO" && renderDomino()}{tab === "DNA" && renderDna()}{tab === "NEXT" && renderNext()}
      <footer className="intel-footer"><span>FINDaero · Авиация меняется. Мы показываем как.</span><button type="button" onClick={() => setTab("RADAR")}>К реестру сигналов <ArrowRight size={13}/></button></footer>
    </div>
    {selectedEvent && <div className="dossier-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedId(""); }}><section className="event-dossier" role="dialog" aria-modal="true" aria-labelledby="dossier-title"><button className="dossier-close" type="button" aria-label="Закрыть досье" onClick={() => setSelectedId("")}><X size={18}/></button><span className="intel-overline"><ShieldCheck size={13}/> EVENT DOSSIER · VERIFIED</span><div className="dossier-category">{EVENT_CATEGORY_LABELS[selectedEvent.category]} <i/> {EVENT_TYPE_LABELS[selectedEvent.eventType]}</div><h2 id="dossier-title">{selectedEvent.title}</h2><p className="dossier-description">{selectedEvent.description}</p><div className="dossier-facts"><div><span>АВИАКОМПАНИЯ</span><b>{selectedEvent.airline}</b></div><div><span>ДАТА СОБЫТИЯ</span><b>{formatDate(selectedEvent.eventDate)}</b></div><div><span>ОБНАРУЖЕНО</span><b>{formatDate(selectedEvent.detectedAt)}</b></div>{selectedEvent.aircraft && <div><span>ВОЗДУШНОЕ СУДНО</span><b>{selectedEvent.aircraft.type}{selectedEvent.aircraft.registration ? ` · ${selectedEvent.aircraft.registration}` : ""}</b></div>}{selectedEvent.route && <div><span>НАПРАВЛЕНИЕ</span><b>{selectedEvent.route.originName} — {selectedEvent.route.destinationName}</b></div>}</div><section className="dossier-section"><h3>Источники факта</h3><div className="dossier-sources">{selectedEvent.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer"><span><b>{source.name}</b><small>{source.kind} · {formatDate(source.publishedAt)}</small></span><ArrowUpRight size={15}/></a>)}</div></section><section className="dossier-section"><h3>Связанные события</h3>{relatedForDossier.length ? relatedForDossier.map((event) => <EventButton key={event.id} event={event} compact onOpen={(next) => setSelectedId(next.id)}/>) : <p className="dossier-empty">Подтверждённых пересечений с другими записями пока нет.</p>}</section><section className="dossier-section"><h3>Возможные последствия</h3>{dossierHypotheses.length ? dossierHypotheses.map((event) => <p className="dossier-hypothesis" key={event.id}><Sparkles size={13}/> Аналитическая гипотеза: события одного перевозчика произошли в близкий период. Это не доказывает причинную связь. <button type="button" onClick={() => setSelectedId(event.id)}>Проверить связанное событие</button></p>) : <p className="dossier-empty">Недостаточно связанных данных для вывода о последствиях.</p>}</section><section className="dossier-section"><h3>Редакционные обновления</h3>{dossierEdits.length ? dossierEdits.map((edit, index) => <div className="dossier-edit" key={`${edit.eventId}-${edit.createdAt}-${index}`}><b>{edit.action}</b><span>{formatDate(edit.createdAt.slice(0, 10))}</span>{edit.comment && <p>{edit.comment}</p>}</div>) : <p className="dossier-empty">История редакционных изменений для этой записи не предоставлена.</p>}</section><div className="dossier-status"><ShieldCheck size={14}/> Подтверждено редакцией · источники приведены в досье</div></section></div>}
  </div>;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="intel-empty"><span><Database size={17}/></span><b>{title}</b><p>{text}</p></div>;
}
