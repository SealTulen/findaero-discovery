"use client";

import { createElement, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, ArrowDownUp, ArrowRight, Bell, ChevronDown, CircleHelp, ChevronLeft, ChevronRight, Building2,
  Clock3, Compass, Database, Plane, Radio, Search, ShieldCheck,
  SlidersHorizontal, Sparkles, MapPin, Layers3, ExternalLink, X,
} from "lucide-react";
import { projectRussiaPoint, routeArc, type VerifiedMapRoute } from "@/lib/route-map";
import { AirlineMark } from "@/components/AirlineMark";
import { SourceRegistry } from "@/components/SourceRegistry";
import { AviationIntelligence } from "@/components/AviationIntelligence";
import newsData from "@/data/events.json";
import sourcesData from "@/data/sources.json";
import airlineData from "@/data/airlines.json";
import moderationData from "@/data/moderation-log.json";
import { EVENT_CATEGORY_LABELS, EVENT_TYPE_LABELS, type EventCategory, type EventType } from "@/lib/domain";

type NewsEvent = {
  id: string; title: string; description: string; category: EventCategory;
  eventType: EventType; airline: string; eventDate: string; detectedAt: string; status: string; isHistorical: boolean; confidence: string;
  route?: { originName: string; destinationName: string; aircraftType?: string; plannedStartDate?: string; mapVisible: boolean; origin?: { latitude: number; longitude: number }; destination?: { latitude: number; longitude: number } };
  aircraft?: { type: string; registration?: string };
  sources: { name: string; url: string; publishedAt: string; kind: string }[];
};
type SourceEntry = (typeof sourcesData)[number];
const newsEvents = newsData as NewsEvent[];
const sourceEntries = sourcesData as SourceEntry[];
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const sections = ["PULSE", "CHANGELOG", "FLEET", "LIVERIES", "ROUTES", "COMPARE", "SOURCES", "AIRLINES"] as const;
type Section = (typeof sections)[number];

const sectionCopy: Record<Section, { title: string; subtitle: string; eyebrow: string }> = {
  PULSE: { title: "Авиация меняется.\nМы показываем как.", subtitle: "Проверенные сигналы, связи между событиями и сценарии — с указанием того, где заканчиваются факты.", eyebrow: "AVIATION INTELLIGENCE" },
  CHANGELOG: { title: "Изменения, которые\nдвигают авиацию", subtitle: "Проверяемая хроника российской гражданской авиации. Только события с источниками.", eyebrow: "АВИАЦИОННАЯ ХРОНИКА" },
  FLEET: { title: "История каждого\nвоздушного судна", subtitle: "Поступления, смены операторов и возвращения в эксплуатацию — с подтверждениями.", eyebrow: "МОНИТОРИНГ ФЛОТА" },
  LIVERIES: { title: "Самолёты, которые\nневозможно спутать", subtitle: "Специальные окраски и история их появления — с указанием авторства изображений.", eyebrow: "АРХИВ ЛИВРЕЙ" },
  ROUTES: { title: "География полётов\nв движении", subtitle: "Новые направления, возобновления и изменения маршрутных сетей.", eyebrow: "КАРТА МАРШРУТОВ" },
  COMPARE: { title: "Динамика без\nрейтингов", subtitle: "Сравнивайте наблюдаемые изменения с учётом полноты данных.", eyebrow: "СРАВНЕНИЕ ПЕРЕВОЗЧИКОВ" },
  SOURCES: { title: "Откуда мы знаем,\nчто изменилось", subtitle: "Прозрачность источников и ограничений — часть каждого события.", eyebrow: "РЕЕСТР ИСТОЧНИКОВ" },
  AIRLINES: { title: "Перевозчики\nи подтверждённая история", subtitle: "Откройте профиль авиакомпании и просмотрите только события, сверенные по источникам.", eyebrow: "КАТАЛОГ АВИАКОМПАНИЙ" },
};

type AirlineEntry = { slug: string; name: string; officialWebsite?: string; eventAliases?: string[] };
const airlineRecords = airlineData as AirlineEntry[];
const airlines = airlineRecords.map((airline) => airline.name);
const airlineWebsites: Record<string, string | undefined> = {};
for (const airline of airlineRecords) for (const name of [airline.name, ...(airline.eventAliases ?? [])]) airlineWebsites[name] = airline.officialWebsite;
function airlineProfileHref(name: string) {
  const key = name.toLocaleLowerCase("ru");
  const profile = airlineRecords.find((airline) => airline.name.toLocaleLowerCase("ru") === key || airline.eventAliases?.some((alias) => alias.toLocaleLowerCase("ru") === key));
  return profile ? `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/airlines/${profile.slug}/` : null;
}

function AircraftModel({ src, alt }: { src: string; alt: string }) {
  const [viewerReady, setViewerReady] = useState(false);
  const [modelState, setModelState] = useState<"loading" | "loaded" | "failed">("loading");
  const viewerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    let active = true;
    import("@google/model-viewer")
      .then(() => customElements.whenDefined("model-viewer"))
      .then(() => { if (active) setViewerReady(true); })
      .catch(() => { if (active) setModelState("failed"); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !viewerReady) return;
    const onLoad = () => setModelState("loaded");
    const onError = () => setModelState("failed");
    viewer.addEventListener("load", onLoad);
    viewer.addEventListener("error", onError);
    if ((viewer as HTMLElement & { modelIsVisible?: boolean }).modelIsVisible) onLoad();
    return () => { viewer.removeEventListener("load", onLoad); viewer.removeEventListener("error", onError); };
  }, [viewerReady, src]);
  if (modelState === "failed") return <div className="aircraft-model-loading aircraft-model-error" role="status"><Plane size={24}/><small>3D-МОДЕЛЬ НЕ ЗАГРУЗИЛАСЬ</small></div>;
  if (!viewerReady) return <div className="aircraft-model-loading" aria-label="Загрузка 3D-просмотрщика"><span/><small>ЗАГРУЖАЕМ 3D-ПРОСМОТРЩИК</small></div>;
  return createElement("model-viewer", {
    ref: viewerRef,
    className: "aircraft-model-viewer", src, alt,
    "camera-controls": "true", "auto-rotate": "true", "rotation-per-second": "7deg",
    "camera-target": "auto auto auto", "camera-orbit": "0deg 72deg 180%", "field-of-view": "40deg",
    "min-camera-orbit": "auto auto 145%", "max-camera-orbit": "auto auto 400%",
    "shadow-intensity": "0.8", exposure: "1.1", "interaction-prompt": "none", "touch-action": "pan-y",
    "aria-label": alt,
  });
}

function AircraftScene() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return <div className="scene aircraft-scene" aria-label="Иллюстрация воздушного судна">
    <div className="aircraft-grid"/><div className="aircraft-orbit orbit-back"/><div className="aircraft-orbit orbit-front"/>
    <div className="aircraft-model"><AircraftModel src={`${basePath}/models/A320_nologo.glb`} alt="Безлоготипная 3D-модель пассажирского Airbus A320"/></div>
    <div className="scene-label plane-label"><span className="scene-led"/>AIRBUS A320 · 3D <a className="asset-credit" href="https://github.com/amvlab/aircraft-models" target="_blank" rel="noreferrer">amvlab · CC BY 4.0 ↗</a></div>
    <div className="plane-readout readout-a"><span>ТИП</span><b>—</b></div><div className="plane-readout readout-b"><span>РЕГИСТРАЦИЯ</span><b>—</b></div>
    <div className="model-controls-hint">ПЕРЕТАЩИТЕ · ВРАЩЕНИЕ · КОЛЁСИКО</div>
  </div>;
}

function RussiaMap({ verifiedRoutes }: { verifiedRoutes: VerifiedMapRoute[] }) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return <div className="map-wrap"><div className="map-stage">
    <div className="map-toolbar"><div className="map-mode"><Layers3 size={14}/> КАРТА РОССИИ · ОБЗОР</div><div className="map-legend"><i/>Проверенные изменения маршрутов</div></div>
    <svg className="russia-map" viewBox="0 0 820 360" role="img" aria-label="Схематичная карта России с подтверждёнными изменениями маршрутов">
      <defs><pattern id="mapGrid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#1b2c3b" strokeWidth=".7"/></pattern><radialGradient id="mapGlow"><stop stopColor="#15324a" stopOpacity=".58"/><stop offset="1" stopColor="#0b1420" stopOpacity="0"/></radialGradient></defs>
      <rect width="820" height="360" fill="url(#mapGrid)"/><ellipse cx="445" cy="183" rx="375" ry="205" fill="url(#mapGlow)"/>
      <image href={`${basePath}/maps/russia.svg`} x="0" y="0" width="820" height="360" preserveAspectRatio="none"/>
      {verifiedRoutes.map((route) => { const start = projectRussiaPoint(route.origin); const end = projectRussiaPoint(route.destination); const path = routeArc(route); return <g key={route.id} className="route-line"><title>{route.airlineName}: {route.originName} — {route.destinationName}. {route.title}</title><path d={path}/><circle cx={start.x} cy={start.y} r="3.5"/><circle cx={end.x} cy={end.y} r="3.5"/><circle r="3"><animateMotion dur="3s" repeatCount="indefinite" path={path}/></circle></g>; })}
      <text x="164" y="185">ЕВРОПЕЙСКАЯ ЧАСТЬ</text><text x="403" y="205">УРАЛ</text><text x="527" y="190">СИБИРЬ</text><text x="695" y="200">ДАЛЬНИЙ ВОСТОК</text>
      <text x="20" y="340" className="map-coordinate">20°E</text><text x="370" y="340" className="map-coordinate">100°E</text><text x="720" y="340" className="map-coordinate">180°E</text><text x="775" y="340" className="map-coordinate">170°W</text>
    </svg>
    <div className="map-foot"><span>СХЕМА ПО ДАННЫМ NATURAL EARTH · НЕ ДЛЯ НАВИГАЦИИ</span><span>{verifiedRoutes.length.toString().padStart(2, "0")} ИЗМЕНЕНИЙ</span></div>
  </div><div className="map-data-empty"><span className="map-empty-icon"><MapPin size={17}/></span><div><b>{verifiedRoutes.length ? "На карте показаны подтверждённые изменения" : "Пока нет подтверждённых направлений на карте"}</b><span>{verifiedRoutes.length ? "Другие маршруты не нанесены: они международные, планируемые или не имеют координат в реестре." : "Точки и линии появятся после проверки источников и координат."}</span></div><span className="map-empty-count">{verifiedRoutes.length.toString().padStart(2, "0")} · ИЗМЕНЕНИЙ</span></div></div>;
}

function SectionWorkspace({ section, onSources }: { section: Section; onSources: () => void }) {
  const [compareA, setCompareA] = useState("Red Wings");
  const [compareB, setCompareB] = useState("S7 Airlines");
  const [comparePeriod, setComparePeriod] = useState("all");
  const [airlineQuery, setAirlineQuery] = useState("");
  const [liveryKind, setLiveryKind] = useState("all");
  const [liveryAirline, setLiveryAirline] = useState("ALL");
  const [routeAirline, setRouteAirline] = useState("ALL");
  const [routeType, setRouteType] = useState("ALL");
  const [selectedRegistration, setSelectedRegistration] = useState("");
  if (section === "PULSE") return <AviationIntelligence events={newsEvents} moderationLog={moderationData as { eventId: string; action: string; comment?: string; createdAt: string }[]}/>;
  if (section === "AIRLINES") {
    const filteredAirlines = airlines.filter((name) => name.toLocaleLowerCase("ru").includes(airlineQuery.trim().toLocaleLowerCase("ru")));
    return <div className="feature-card airline-directory"><div className="card-heading"><div><div className="card-kicker">ПЕРЕВОЗЧИКИ РОССИИ</div><h3>Каталог авиакомпаний</h3></div><span className="source-count">{airlines.length} компаний в каталоге</span></div><label className="airline-directory-search"><Search size={16}/><input value={airlineQuery} onChange={(event) => setAirlineQuery(event.target.value)} placeholder="Найти авиакомпанию"/></label><div className="airline-directory-grid">{filteredAirlines.map((name) => { const events = newsEvents.filter((event) => event.status === "verified" && (event.airline.toLocaleLowerCase("ru") === name.toLocaleLowerCase("ru") || (name === "S7 Airlines" && event.airline === "S7 Group"))); const href = airlineProfileHref(name); return <a key={name} className="airline-directory-item" href={href ?? "#"}><AirlineMark airline={name}/><span className="airline-directory-text"><b>{name}</b><small>{events.length ? `${events.length} подтверждённых событий` : "Пока нет подтверждённых записей"}</small></span><ArrowRight size={15}/></a>; })}{!filteredAirlines.length && <p className="airline-directory-empty">По такому запросу перевозчиков не найдено.</p>}</div><div className="airline-directory-note"><ShieldCheck size={14}/> Нулевое число событий означает, что в текущем реестре нет проверенных записей; это не оценка деятельности авиакомпании.</div></div>;
  }
  if (section === "FLEET") {
    const fleetEvents = newsEvents.filter((event) => event.status === "verified" && event.category === "FLEET").sort((a, b) => b.eventDate.localeCompare(a.eventDate));
    const aircraftEvents = newsEvents.filter((event) => event.status === "verified" && event.aircraft?.registration);
    const aircraftRecords = Array.from(new Map(aircraftEvents.map((event) => [event.aircraft!.registration!, event])).values()).sort((a, b) => (b.eventDate).localeCompare(a.eventDate));
    const unregisteredAircraftEvents = newsEvents.filter((event) => event.status === "verified" && event.aircraft?.type && !event.aircraft.registration).sort((a, b) => b.eventDate.localeCompare(a.eventDate));
    const activeRegistration = aircraftRecords.some((event) => event.aircraft?.registration === selectedRegistration) ? selectedRegistration : aircraftRecords[0]?.aircraft?.registration ?? "";
    const activeAircraftEvents = aircraftEvents.filter((event) => event.aircraft?.registration === activeRegistration).sort((a, b) => b.eventDate.localeCompare(a.eventDate));
    return <div className="fleet-workspace"><div className="workspace-grid"><div className="feature-card fleet-card"><div className="card-kicker"><Plane size={14}/> 3D-ИЛЛЮСТРАЦИЯ · НЕ ПРИВЯЗАНА К БОРТУ</div><AircraftScene/><div className="fleet-caption"><div><span>ЗАПИСЕЙ С РЕГИСТРАЦИЕЙ</span><b>{aircraftRecords.length.toString().padStart(2, "0")}</b></div><div><span>СОБЫТИЙ ФЛОТА</span><b>{fleetEvents.length.toString().padStart(2, "0")}</b></div><button onClick={onSources}>Источники записей <ArrowRight size={14}/></button></div></div><div className="feature-card timeline-card"><div className="card-heading"><div><div className="card-kicker">ИСТОРИЯ БОРТА</div><h3>Подтверждённые события</h3></div><span className="empty-chip">{activeAircraftEvents.length ? `${activeAircraftEvents.length} СОБЫТ.` : "НЕТ ДАННЫХ"}</span></div>{activeAircraftEvents.length ? <><div className="fleet-active-aircraft"><AirlineMark airline={activeAircraftEvents[0].airline}/><div><b>{activeAircraftEvents[0].aircraft?.type}</b><span className="fleet-registration">{activeRegistration}</span></div></div><a className="fleet-aircraft-page-link" href={`${basePath}/aircraft/${encodeURIComponent(activeRegistration)}/`}>Открыть карточку борта <ArrowRight size={13}/></a><div className="fleet-history">{activeAircraftEvents.map((event) => <article className="fleet-history-item" key={event.id}><span className="fleet-history-date">{new Date(`${event.eventDate}T00:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })} · {event.airline}</span><strong>{event.title}</strong><p>{event.description}</p><a href={event.sources[0]?.url} target="_blank" rel="noreferrer">Первичный источник <ExternalLink size={12}/></a></article>)}</div></> : <div className="timeline-empty"><div className="timeline-placeholder"><span>ОЖИДАЕТСЯ ИСТОЧНИК</span><b>История начнётся с первого подтверждённого события</b><p>Поступление · смена оператора · простой · возвращение</p></div><ShieldCheck size={18}/></div>}<div className="timeline-note">Это выборка известных регистраций, а не полный реестр парка авиакомпаний. Модель A320 слева — отдельная иллюстрация.</div></div></div><div className="feature-card fleet-register"><div className="card-heading"><div><div className="card-kicker">РЕЕСТР ВОЗДУШНЫХ СУДОВ</div><h3>Борта с подтверждёнными записями</h3></div><span className="source-count">{aircraftRecords.length} регистраций · не полный список парка</span></div><div className="fleet-register-grid">{aircraftRecords.map((event) => { const registration = event.aircraft?.registration ?? ""; const latest = aircraftEvents.filter((candidate) => candidate.aircraft?.registration === registration).sort((a, b) => b.eventDate.localeCompare(a.eventDate))[0]; return <button type="button" key={registration} className={`fleet-register-item ${activeRegistration === registration ? "is-selected" : ""}`} onClick={() => setSelectedRegistration(registration)} aria-pressed={activeRegistration === registration}><AirlineMark airline={latest.airline}/><span><b>{event.aircraft?.type}</b><small>{registration} · {latest.airline}</small></span><span className="fleet-register-date">{new Date(`${latest.eventDate}T00:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}</span></button>; })}{!aircraftRecords.length && <div className="fleet-register-empty">Пока нет подтверждённых записей с регистрационным номером.</div>}</div><div className="fleet-register-note"><ShieldCheck size={14}/> В реестр попадают только борта, прямо названные в проверенных публикациях. Выберите борт, затем откройте отдельную карточку с его подтверждённой историей.</div>{unregisteredAircraftEvents.length > 0 && <section className="feature-card fleet-unregistered"><div className="card-heading"><div><div className="card-kicker">УПОМИНАНИЯ БЕЗ РЕГИСТРАЦИИ</div><h3>Самолёты без подтверждённого номера борта</h3></div><span className="source-count">{unregisteredAircraftEvents.length} событий</span></div><div className="fleet-unregistered-list">{unregisteredAircraftEvents.map((event) => <article className="fleet-unregistered-item" key={event.id}><AirlineMark airline={event.airline}/><div className="fleet-unregistered-main"><span>{event.airline} · {event.category === "LIVERY" ? "Ливрея" : event.category === "FLEET" ? "Флот" : "Авиационное событие"} · {new Date(`${event.eventDate}T00:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</span><b>{event.aircraft?.type ?? "Тип не указан"}</b><strong>{event.title}</strong><p>{event.description}</p><div>{event.sources.map((source, index) => <a key={`${event.id}-${source.url}-${index}`} href={source.url} target="_blank" rel="noreferrer">Источник {index + 1} <ExternalLink size={12}/></a>)}</div></div><span className="unregistered-tag">БЕЗ РЕГИСТРАЦИИ</span></article>)}</div><div className="fleet-register-note"><ShieldCheck size={14}/> Эти события относятся к типу самолёта, но публикации не подтверждают регистрацию. Поэтому они не включены в историю конкретного борта.</div></section>}</div></div>;
  }
  if (section === "ROUTES") {
    const routeEvents = newsEvents.filter((event) => event.status === "verified" && event.category === "ROUTE" && event.route).sort((a, b) => b.eventDate.localeCompare(a.eventDate));
    const routeAirlines = Array.from(new Set(routeEvents.map((event) => event.airline))).sort((a, b) => a.localeCompare(b, "ru"));
    const routeTypes = Array.from(new Set(routeEvents.map((event) => event.eventType))).sort((a, b) => EVENT_TYPE_LABELS[a].localeCompare(EVENT_TYPE_LABELS[b], "ru"));
    const filteredRouteEvents = routeEvents.filter((event) => (routeAirline === "ALL" || event.airline === routeAirline) && (routeType === "ALL" || event.eventType === routeType));
    const mappedRoutes = filteredRouteEvents.filter((event) => event.route?.mapVisible && event.route.origin && event.route.destination).map((event) => ({ id: event.id, title: event.title, airlineName: event.airline, originName: event.route!.originName, destinationName: event.route!.destinationName, origin: event.route!.origin!, destination: event.route!.destination! }));
    const routeStatus = (event: NewsEvent) => {
      if (event.route?.plannedStartDate && Date.parse(`${event.route.plannedStartDate}T00:00:00Z`) > Date.now()) return "ЗАПЛАНИРОВАНО";
      if (event.eventType === "route_closed") return "МАРШРУТ ЗАКРЫТ";
      if (event.eventType === "route_resumed") return "ВОЗОБНОВЛЁН";
      if (event.eventType === "route_seasonal") return "СЕЗОННАЯ ПРОГРАММА";
      if (event.eventType === "codeshare_expanded") return "КОД-ШЕРИНГ РАСШИРЕН";
      if (event.eventType === "route_opened") return "МАРШРУТ ЗАПУЩЕН";
      if (event.eventType === "route_announced") return "АНОНС МАРШРУТА";
      return "ИЗМЕНЕНИЕ ПОДТВЕРЖДЕНО";
    };
    return <div className="feature-card route-card"><div className="card-heading"><div><div className="card-kicker">МАРШРУТНАЯ СЕТЬ</div><h3>Новые направления и изменения</h3></div><div className="route-filter"><span>ПОКАЗАНО / ВСЕ СОБЫТИЯ</span><b>{filteredRouteEvents.length} / {routeEvents.length}</b></div></div><div className="route-filters"><label>АВИАКОМПАНИЯ<select value={routeAirline} onChange={(event) => setRouteAirline(event.target.value)}><option value="ALL">Все авиакомпании</option>{routeAirlines.map((airline) => <option key={airline} value={airline}>{airline}</option>)}</select></label><label>ТИП ИЗМЕНЕНИЯ<select value={routeType} onChange={(event) => setRouteType(event.target.value)}><option value="ALL">Все изменения</option>{routeTypes.map((type) => <option key={type} value={type}>{EVENT_TYPE_LABELS[type]}</option>)}</select></label></div><RussiaMap verifiedRoutes={mappedRoutes}/><div className="route-note"><ShieldCheck size={14}/> На карте — только события с подтверждёнными координатами. Международные маршруты, размытые анонсы без пары аэропортов и направления без подтверждённых координат показаны ниже, без приблизительных линий.</div><section className="route-event-section"><div className="route-event-heading"><div><div className="card-kicker">ПОДТВЕРЖДЁННЫЕ ИЗМЕНЕНИЯ</div><h3>Кто, куда и когда</h3></div><span>{filteredRouteEvents.length} из {routeEvents.length} записей</span></div>{filteredRouteEvents.length ? <div className="route-event-list">{filteredRouteEvents.map((event) => <article className="route-event-card" key={event.id}><div className="route-event-top"><span className="route-event-airline"><AirlineMark airline={event.airline}/><b>{event.airline}</b></span><span className={`route-event-status ${event.route?.plannedStartDate && Date.parse(`${event.route.plannedStartDate}T00:00:00Z`) > Date.now() ? "route-event-planned" : ""}`}>{routeStatus(event)}</span></div><h4>{event.route!.originName} <ArrowRight size={16}/> {event.route!.destinationName}</h4><b className="route-event-title">{event.title}</b><p>{event.description}</p><div className="route-event-meta"><span>Событие: {new Date(`${event.eventDate}T00:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</span>{event.route?.plannedStartDate && <span>Начало: {new Date(`${event.route.plannedStartDate}T00:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</span>}{event.route?.aircraftType && <span>{event.route.aircraftType}</span>}</div><div className="route-event-sources">{event.sources.map((source) => <a href={source.url} key={source.url} target="_blank" rel="noreferrer">{source.name} <ExternalLink size={12}/></a>)}</div></article>)}</div> : <div className="timeline-empty"><div className="timeline-placeholder"><span>{routeEvents.length ? "ФИЛЬТРЫ" : "НЕТ ДАННЫХ"}</span><b>{routeEvents.length ? "По этим фильтрам маршруты не найдены" : "Подтверждённых изменений маршрутной сети пока нет"}</b><p>{routeEvents.length ? "Выберите другую авиакомпанию или тип изменения." : "Непроверенные анонсы не отображаются."}</p></div></div>}</section></div>;
  }
  if (section === "LIVERIES") {
    const liveryProjects = newsEvents.filter((event) => event.status === "verified" && event.category === "LIVERY").sort((a, b) => b.eventDate.localeCompare(a.eventDate));
    const kindFor = (event: NewsEvent) => event.eventType === "livery_design_competition" ? "design" : event.eventType === "aircraft_brand_refresh" ? "branding" : "applied";
    const kindLabel = (event: NewsEvent) => kindFor(event) === "design" ? "КОНКУРС ДИЗАЙНА" : kindFor(event) === "branding" ? "ОБНОВЛЕНИЕ СИМВОЛИКИ" : "ЛИВРЕЯ НА САМОЛЁТЕ";
    const filteredLiveries = liveryProjects.filter((event) => (liveryKind === "all" || kindFor(event) === liveryKind) && (liveryAirline === "ALL" || event.airline === liveryAirline));
    const appliedCount = liveryProjects.filter((event) => kindFor(event) === "applied").length;
    const brandingCount = liveryProjects.filter((event) => kindFor(event) === "branding").length;
    const designCount = liveryProjects.filter((event) => kindFor(event) === "design").length;
    const categoryCounts = [
      { code: "applied", label: "Ливреи, нанесённые на самолёты", count: appliedCount },
      { code: "branding", label: "Обновление символики на борту", count: brandingCount },
      { code: "design", label: "Конкурсы и проекты дизайна", count: designCount },
    ];
    return <div className="workspace-grid"><div className="feature-card livery-gallery"><div className="card-heading"><div><div className="card-kicker">ПОДТВЕРЖДЁННЫЕ СОБЫТИЯ</div><h3>Ливреи и обновления оформления</h3></div><span className="empty-chip">{appliedCount} ЛИВРЕИ · {brandingCount} СИМВОЛИКА · {designCount} КОНКУРС</span></div><div className="hangar"><div className="hangar-lines"/><div className="hangar-plane"><Plane size={58}/></div><div className="hangar-caption">ФОТО НЕ ПОКАЗЫВАЕМ БЕЗ ПОДТВЕРЖДЁННОЙ ЛИЦЕНЗИИ</div></div><div className="license-note"><ShieldCheck size={15}/> Фактическая окраска, обновление логотипа и конкурс дизайна разделены. Фото без подтверждённой лицензии не публикуем.</div><div className="livery-filters"><label>ТИП ИЗМЕНЕНИЯ<select value={liveryKind} onChange={(event) => setLiveryKind(event.target.value)}><option value="all">Все</option><option value="applied">Нанесённые ливреи</option><option value="branding">Обновление символики</option><option value="design">Конкурс дизайна</option></select></label><label>АВИАКОМПАНИЯ<select value={liveryAirline} onChange={(event) => setLiveryAirline(event.target.value)}><option value="ALL">Все компании</option>{Array.from(new Set(liveryProjects.map((event) => event.airline))).sort().map((airline) => <option key={airline} value={airline}>{airline}</option>)}</select></label><span>{filteredLiveries.length} записей</span></div>{filteredLiveries.length ? filteredLiveries.map((event) => <article className="livery-project" key={event.id}><div className="livery-project-brand"><AirlineMark airline={event.airline}/><span>{kindLabel(event)} · {new Date(`${event.eventDate}T00:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</span></div><b>{event.title}</b><p>{event.description}</p>{event.aircraft?.type && <small className="livery-aircraft">{event.aircraft.type}{event.aircraft.registration ? ` · ${event.aircraft.registration}` : ""}</small>}<div>{event.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.name} <ExternalLink size={11}/></a>)}</div></article>) : <div className="livery-empty">Нет проверенных записей по выбранным фильтрам.</div>}</div><div className="feature-card livery-types"><div className="card-kicker">СОСТОЯНИЕ ЗАПИСЕЙ</div>{categoryCounts.map((category, i) => <button className="livery-type" key={category.code} onClick={() => setLiveryKind(liveryKind === category.code ? "all" : category.code)} aria-pressed={liveryKind === category.code}><span className="livery-index">0{i + 1}</span><b>{category.label}</b><span>{category.count}</span></button>)}<p className="livery-type-note">Счётчик отражает только текущие подтверждённые записи проекта.</p></div></div>;
  }
  if (section === "COMPARE") {
    const metrics = [{ key: "FLEET", label: "Все события флота" }, { key: "fleet_added", label: "Поступления и возвраты" }, { key: "fleet_removed", label: "Выбытия и передачи" }, { key: "LIVERY", label: "Специальные ливреи" }, { key: "ROUTE", label: "Все изменения маршрутов" }, { key: "route_opened", label: "Открытые и возобновлённые маршруты" }, { key: "route_announced", label: "Анонсированные маршруты" }, { key: "route_seasonal", label: "Сезонные программы" }, { key: "route_closed", label: "Закрытые маршруты" }, { key: "total", label: "Всего подтверждённых событий" }];
    const compareCutoff = comparePeriod === "12m" ? Date.now() - 365 * 86400000 : comparePeriod === "30d" ? Date.now() - 30 * 86400000 : 0;
    const matchesMetric = (event: NewsEvent, key: string) => key === "total" || event.category === key || (key === "fleet_added" && event.category === "FLEET" && ["aircraft_added", "aircraft_delivered", "aircraft_entered_service", "aircraft_returned_to_service"].includes(event.eventType)) || (key === "fleet_removed" && event.category === "FLEET" && ["aircraft_removed", "aircraft_transferred", "aircraft_retired"].includes(event.eventType)) || (key === "route_opened" && event.category === "ROUTE" && ["route_opened", "route_resumed"].includes(event.eventType)) || (key === "route_announced" && event.category === "ROUTE" && event.eventType === "route_announced") || (key === "route_seasonal" && event.category === "ROUTE" && event.eventType === "route_seasonal") || (key === "route_closed" && event.category === "ROUTE" && event.eventType === "route_closed");
    const count = (airline: string, key: string) => newsEvents.filter(event => event.status === "verified" && event.airline === airline && matchesMetric(event, key) && Date.parse(`${event.eventDate}T00:00:00Z`) >= compareCutoff).length;
    const trend = Array.from({ length: 12 }, (_, index) => { const month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0); month.setMonth(month.getMonth() - 11 + index); const nextMonth = new Date(month); nextMonth.setMonth(nextMonth.getMonth() + 1); const inMonth = (airline: string) => newsEvents.filter(event => event.status === "verified" && event.airline === airline && Date.parse(`${event.eventDate}T00:00:00Z`) >= month.getTime() && Date.parse(`${event.eventDate}T00:00:00Z`) < nextMonth.getTime()).length; return { label: month.toLocaleDateString("ru-RU", { month: "short" }), title: month.toLocaleDateString("ru-RU", { month: "long", year: "numeric" }), first: inMonth(compareA), second: inMonth(compareB) }; });
    const trendMax = Math.max(1, ...trend.flatMap(month => [month.first, month.second]));
    return <div className="feature-card compare-card"><div className="card-heading"><div><div className="card-kicker">СОПОСТАВИМЫЕ ДАННЫЕ</div><h3>Сравнение подтверждённых событий</h3></div><span className="empty-chip">БЕЗ РЕЙТИНГОВ</span></div><div className="compare-selectors"><label>ПЕРЕВОЗЧИК A<select value={compareA} onChange={event => setCompareA(event.target.value)}>{Array.from(new Set(newsEvents.map(event => event.airline))).map(name => <option key={name}>{name}</option>)}</select></label><div className="compare-vs">VS</div><label>ПЕРЕВОЗЧИК B<select value={compareB} onChange={event => setCompareB(event.target.value)}>{Array.from(new Set(newsEvents.map(event => event.airline))).map(name => <option key={name}>{name}</option>)}</select></label><label className="compare-period-select">ПЕРИОД<select value={comparePeriod} onChange={event => setComparePeriod(event.target.value)}><option value="all">Весь период</option><option value="12m">12 месяцев</option><option value="30d">30 дней</option></select></label></div><div className="compare-results"><div className="compare-result-head"><b>{compareA}</b><span>ПОКАЗАТЕЛЬ</span><b>{compareB}</b></div>{metrics.map(metric => { const first = count(compareA, metric.key); const second = count(compareB, metric.key); const total = Math.max(first + second, 1); return <div className="compare-result-row" key={metric.key}><strong>{first}</strong><span>{metric.label}<i><b style={{ width: `${(first / total) * 100}%` }}/><b style={{ width: `${(second / total) * 100}%` }}/></i></span><strong>{second}</strong></div>; })}</div><div className="compare-trend"><div className="compare-trend-heading"><b>ДИНАМИКА ПУБЛИКАЦИЙ · 12 МЕСЯЦЕВ</b><span><i className="trend-a"/>{compareA}<i className="trend-b"/>{compareB}</span></div><div className="compare-trend-chart" role="img" aria-label={`Помесячное число подтверждённых событий: ${compareA} и ${compareB}`}>
      {trend.map(month => <div className="compare-trend-month" key={month.title} title={`${month.title}: ${compareA} — ${month.first}; ${compareB} — ${month.second}`}><div className="compare-trend-bars"><i className="trend-bar-a" style={{ height: `${month.first ? Math.max(5, (month.first / trendMax) * 100) : 0}%` }}/><i className="trend-bar-b" style={{ height: `${month.second ? Math.max(5, (month.second / trendMax) * 100) : 0}%` }}/></div><small>{month.label}</small></div>)}
      </div><p>Показывается число записей в реестре по месяцу события. Нулевой столбец означает, что проверенных записей за этот месяц нет.</p></div><div className="compare-coverage"><ShieldCheck size={14}/> Сравнение охватывает только {newsEvents.length} найденных и подтверждённых записей проекта, а не полный объём работы перевозчиков. Ноль записей не означает отсутствие событий.</div></div>;
  }
  if (section === "SOURCES") return <SourceRegistry />;
  return null;
}

export default function Home() {
  const [section, setSection] = useState<Section>("PULSE");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [period, setPeriod] = useState("12m");
  const [airlineFilter, setAirlineFilter] = useState("ALL");
  const [sort, setSort] = useState("По дате события");
  const [feedPage, setFeedPage] = useState(1);
  const [selectedAirline, setSelectedAirline] = useState<string | null>(null);
  const [companyCategory, setCompanyCategory] = useState("ALL");
  const [showFilters, setShowFilters] = useState(false);
  const copy = sectionCopy[section];
  const results = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("ru");
    const cutoff = period === "30d" ? Date.now() - 30 * 86400000 : period === "12m" ? Date.now() - 365 * 86400000 : 0;
    return newsEvents.filter((event) => {
      if (event.status !== "verified") return false;
      if (category !== "ALL" && event.category !== category) return false;
      if (airlineFilter !== "ALL" && event.airline !== airlineFilter) return false;
      if (Date.parse(`${event.eventDate}T00:00:00Z`) < cutoff) return false;
      if (needle && ![event.title, event.description, event.airline, event.aircraft?.registration, event.aircraft?.type, event.route?.originName, event.route?.destinationName, event.route?.aircraftType].filter(Boolean).join(" ").toLocaleLowerCase("ru").includes(needle)) return false;
      return true;
    }).sort((a, b) => Date.parse(sort === "По дате события" ? b.eventDate : b.detectedAt) - Date.parse(sort === "По дате события" ? a.eventDate : a.detectedAt));
  }, [query, category, period, airlineFilter, sort]);
  const pageSize = 5;
  const pageCount = Math.max(1, Math.ceil(results.length / pageSize));
  const currentPage = Math.min(feedPage, pageCount);
  const visibleResults = results.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectedAirlineEvents = selectedAirline ? newsEvents.filter((event) => event.status === "verified" && event.airline === selectedAirline).sort((a, b) => b.eventDate.localeCompare(a.eventDate)) : [];
  const visibleCompanyEvents = selectedAirlineEvents.filter((event) => companyCategory === "ALL" || event.category === companyCategory);
  const companyAircraft = Array.from(new Map(selectedAirlineEvents.filter((event) => event.aircraft?.registration).map((event) => [event.aircraft!.registration!, event])).values());
  useEffect(() => {
    if (!selectedAirline) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setSelectedAirline(null); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedAirline]);
  const sectionIndex = sections.indexOf(section) + 1;

  return <main className="shell">
    <aside className="sidebar">
      <button className="brand" onClick={() => setSection("PULSE")}><span className="brand-mark"><Plane size={19}/></span><span>FIND<span className="brand-light">aero</span><small>AVIATION INTELLIGENCE</small></span></button>
      <div className="side-label">МОНИТОРИНГ</div>
      <nav className="nav-list" aria-label="Разделы">
        {sections.map((item, i) => <button key={item} onClick={() => setSection(item)} className={`nav-item ${section === item ? "active" : ""}`}><span className="nav-icon">{[<Activity size={17}/>, <Activity size={17}/>, <Plane size={17}/>, <Sparkles size={17}/>, <Compass size={17}/>, <ArrowDownUp size={17}/>, <Database size={17}/>, <Building2 size={17}/>][i]}</span>{item}{item === "PULSE" && <span className="nav-pulse"/>}</button>)}
      </nav>
      <div className="sidebar-bottom"><div className="system-card"><div className="system-title"><span className="live-dot"/>СИСТЕМА ГОТОВА</div><p>Источники ожидают<br/>подключения и проверки</p><div className="system-foot"><span>СОСТОЯНИЕ</span><b>Не настроена</b></div></div><div className="help-link"><CircleHelp size={16}/>О проекте <span>↗</span></div></div>
    </aside>
    <section className="main-area" id="top">
      <header className="topbar"><div className="crumb"><span>FINDaero</span><i>/</i><b>{section}</b></div><div className="top-actions"><span className="edition"><span/> РОССИЯ · MVP</span><button className="icon-button" aria-label="Уведомления"><Bell size={17}/></button><div className="avatar">FA</div></div></header>
      <div className="content">
        <section className={`hero hero-${section.toLowerCase()}`} key={section} aria-live="polite"><div className="hero-copy-block"><div className="eyebrow"><span className="eyebrow-line"/>{copy.eyebrow}<span className="eyebrow-year">/ 2026</span></div><h1>{copy.title.split("\n").map((line, i) => <span key={line}>{line}{i === 0 && <br/>}</span>)}</h1><p className="hero-copy">{copy.subtitle}</p><div className="hero-meta"><span><ShieldCheck size={14}/> Только подтверждённые события</span><span className="meta-sep"/><span><Clock3 size={14}/> История с источниками</span></div></div><HeroScene section={section}/><div className="hero-index">{sectionIndex.toString().padStart(2,"0")} <span>/ {sections.length.toString().padStart(2,"0")}</span></div></section>
        <div className="metrics"><div className="metric"><span className="metric-label">ПОДТВЕРЖДЁННЫЕ СОБЫТИЯ</span><div className="metric-value">{newsEvents.filter((event) => event.status === "verified").length.toString().padStart(2,"0")} <span>в ленте</span></div></div><div className="metric"><span className="metric-label">ИСТОЧНИКИ</span><div className="metric-value">{sourceEntries.length.toString().padStart(2,"0")} <span>в реестре · без автосбора</span></div></div><div className="metric"><span className="metric-label">ПОСЛЕДНЯЯ РЕДАКЦИОННАЯ СВЕРКА</span><div className="metric-value muted-value">1 ноября 2026</div></div><div className="metric metric-end"><Radio size={16}/><span>Проверка источников вручную</span></div></div>
         <div className="workspace-transition" key={`workspace-${section}`}><SectionWorkspace section={section} onSources={() => setSection("SOURCES")}/></div>
        {(section === "CHANGELOG" || section === "PULSE") && <><div className="feed-heading"><div><div className="eyebrow small-eye"><span className="eyebrow-line"/>ЛЕНТА ИЗМЕНЕНИЙ</div><h2>Последние события</h2></div><div className="feed-tools"><button className="filter-button" onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal size={15}/> Фильтры <ChevronDown size={14} className={showFilters ? "rotated" : ""}/></button><button className="sort-button" onClick={() => setSort(sort === "По дате события" ? "По дате обнаружения" : "По дате события")}><ArrowDownUp size={14}/>{sort}</button></div></div>
        {showFilters && <div className="filter-panel"><label>Категория<select value={category} onChange={e => setCategory(e.target.value)}><option value="ALL">Все категории</option><option value="FLEET">Флот</option><option value="LIVERY">Ливреи</option><option value="ROUTE">Маршруты</option><option value="AIRPORT">Аэропорты</option><option value="BUSINESS">Бизнес</option></select></label><label>Период<select value={period} onChange={e => setPeriod(e.target.value)}><option value="all">Любое время</option><option value="30d">Последние 30 дней</option><option value="12m">Последние 12 месяцев</option></select></label><label>Авиакомпания<select value={airlineFilter} onChange={e => setAirlineFilter(e.target.value)}><option value="ALL">Все авиакомпании</option>{Array.from(new Set(newsEvents.map(event => event.airline))).sort().map(name => <option key={name}>{name}</option>)}</select></label></div>}
        <div className="feed-toolbar"><div className="searchbox"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Поиск по авиакомпании, самолёту, маршруту..."/><kbd>⌘ K</kbd></div><div className="feed-count">{results.length.toString().padStart(2,"0")} <span>ЗАПИСЕЙ</span></div></div>
        {results.length ? <><div className="event-list">{visibleResults.map(event => <article className="event-card" key={event.id}><div className="event-card-top"><button type="button" className="event-brand-button" onClick={() => { setSelectedAirline(event.airline); setCompanyCategory("ALL"); }}><span className="event-brand"><AirlineMark airline={event.airline}/><span className="event-airline-name">{event.airline}</span><span className="event-category">{EVENT_CATEGORY_LABELS[event.category]}</span></span></button><span className="event-verified"><ShieldCheck size={13}/> ПРОВЕРЕНО</span></div><h3>{event.title}</h3><p>{event.description}</p><div className="event-meta"><span>{EVENT_TYPE_LABELS[event.eventType]}</span><span>Событие: {new Date(`${event.eventDate}T00:00:00`).toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"})}</span><span>Обнаружено: {new Date(`${event.detectedAt}T00:00:00`).toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"})}</span>{event.aircraft && <span>{event.aircraft.type}{event.aircraft.registration ? ` · ${event.aircraft.registration}` : ""}</span>}{event.route && <span>{event.route.originName} → {event.route.destinationName}</span>}{event.route?.aircraftType && <span>{event.route.aircraftType}</span>}</div><div className="event-sources">{event.sources.map((source,index) => <a key={`${event.id}-${index}`} href={source.url} target="_blank" rel="noreferrer"><ExternalLink size={12}/><span><b>{source.name}</b><small>{source.kind} · {new Date(`${source.publishedAt}T00:00:00`).toLocaleDateString("ru-RU")}</small></span></a>)}</div></article>)}</div>{pageCount > 1 && <nav className="feed-pagination" aria-label="Страницы ленты"><span>Страница {currentPage} из {pageCount}</span><div><button className="filter-button" onClick={() => setFeedPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} aria-label="Предыдущая страница"><ChevronLeft size={16}/> Назад</button><button className="filter-button" onClick={() => setFeedPage(Math.min(pageCount, currentPage + 1))} disabled={currentPage === pageCount} aria-label="Следующая страница">Далее <ChevronRight size={16}/></button></div></nav>}</> : <div className="empty-state"><div className="empty-graphic"><div className="empty-orbit orbit-a"/><div className="empty-orbit orbit-b"/><div className="empty-plane"><Plane size={23}/></div><span className="orbit-dot dot-one"/><span className="orbit-dot dot-two"/></div><div className="empty-kicker">НЕТ СОВПАДЕНИЙ</div><h3>{query ? "Ничего не найдено" : "В этом периоде нет событий"}</h3><p>Измените запрос или фильтры. В ленте остаются только подтверждённые записи с двумя источниками.</p><button className="source-cta" onClick={() => setSection("SOURCES")}>Посмотреть реестр источников <ArrowRight size={15}/></button></div>}</>}
        <footer><span>FINDaero CHANGELOG <i>·</i> The aviation industry, change by change.</span><span>ТОЛЬКО ПРОВЕРЕННЫЕ ФАКТЫ <ShieldCheck size={12}/></span></footer>
      </div>
      {selectedAirline && <div className="company-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedAirline(null); }}><section className="company-profile" role="dialog" aria-modal="true" aria-labelledby="company-profile-title"><button className="company-profile-close" onClick={() => setSelectedAirline(null)} aria-label="Закрыть профиль"><X size={18}/></button><div className="company-profile-title"><AirlineMark airline={selectedAirline}/><div><span>ПРОФИЛЬ ПЕРЕВОЗЧИКА</span><h2 id="company-profile-title">{selectedAirline}</h2></div></div><div className="company-profile-metrics"><div><span>ПОДТВЕРЖДЁННЫЕ СОБЫТИЯ</span><b>{selectedAirlineEvents.length}</b></div><div><span>ТИПЫ ИЗМЕНЕНИЙ</span><b>{new Set(selectedAirlineEvents.map((event) => event.category)).size}</b></div><div><span>САМОЛЁТЫ С ЗАПИСЯМИ</span><b>{new Set(selectedAirlineEvents.map((event) => event.aircraft?.registration).filter(Boolean)).size}</b></div></div><p className="company-profile-note">Профиль отражает только события, внесённые в проверенную базу FINDaero. Отсутствие записи не означает отсутствие изменений.</p>{airlineProfileHref(selectedAirline) && <a className="company-profile-page-link" href={airlineProfileHref(selectedAirline) ?? undefined}>Открыть полную страницу перевозчика <ArrowRight size={14}/></a>}{airlineWebsites[selectedAirline] && <a className="company-official-link" href={airlineWebsites[selectedAirline]} target="_blank" rel="noreferrer">Официальный сайт <ExternalLink size={13}/></a>}<div className="company-history-heading"><h3>История событий</h3><label>Категория<select value={companyCategory} onChange={(event) => setCompanyCategory(event.target.value)}><option value="ALL">Все события</option><option value="FLEET">Флот</option><option value="LIVERY">Ливреи</option><option value="ROUTE">Маршруты</option><option value="AIRPORT">Аэропорты</option><option value="BUSINESS">Бизнес</option></select></label></div>{companyAircraft.length > 0 && <div className="company-aircraft-list"><b>ВОЗДУШНЫЕ СУДНА В РЕЕСТРЕ</b>{companyAircraft.map((event) => <span key={event.aircraft?.registration}><Plane size={13}/>{event.aircraft?.type} · {event.aircraft?.registration}</span>)}</div>}{visibleCompanyEvents.length ? <div className="company-event-list">{visibleCompanyEvents.map((event) => <article key={event.id}><span>{new Date(`${event.eventDate}T00:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })} · {({ FLEET: "ФЛОТ", LIVERY: "ЛИВРЕИ", ROUTE: "МАРШРУТЫ", AIRPORT: "АЭРОПОРТЫ", BUSINESS: "БИЗНЕС" } as Record<string, string>)[event.category]}</span><b>{event.title}</b><p>{event.description}</p><div>{event.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.name} <ExternalLink size={11}/></a>)}</div></article>)}</div> : <p className="company-profile-note">{selectedAirlineEvents.length ? "Для выбранной категории записей нет." : "В текущем реестре подтверждённых событий по этой авиакомпании пока нет."}</p>}</section></div>}
    </section>
  </main>;
}

function HeroScene({ section }: { section: Section }) {
  if (section === "PULSE") return <div className="hero-visual visual-intelligence" aria-label="Визуализация аналитических связей FINDaero"><div className="intel-hero-glow"/><div className="intel-hero-orbit orbit-outer"/><div className="intel-hero-orbit orbit-inner"/><div className="intel-hero-core"><Plane size={36}/></div><span className="intel-hero-node node-a"/><span className="intel-hero-node node-b"/><span className="intel-hero-node node-c"/><span className="intel-hero-tag">VERIFIED · CONNECTED EVENTS</span></div>;
  if (section === "FLEET") return <AircraftScene/>;
  if (section === "ROUTES") return <div className="hero-visual visual-route"><div className="mini-map-grid"/><svg viewBox="0 0 300 130" aria-hidden="true"><path d="M12 59 34 44 58 49 73 35 91 43 108 31 126 37 144 27 160 38 179 30 197 39 215 29 232 43 255 40 281 58 271 73 246 75 230 89 205 79 187 92 165 81 148 97 128 84 107 98 89 80 67 87 51 69 29 76Z"/><path d="M55 62h180" className="mini-route"/></svg><span className="mini-map-empty">Маршруты появятся<br/>после проверки</span></div>;
  if (section === "LIVERIES") return <div className="hero-visual visual-livery"><div className="livery-halo"/><Plane size={94} strokeWidth={.8}/><span>ГАЛЕРЕЯ · 00</span></div>;
  if (section === "COMPARE") return <div className="hero-visual visual-compare"><div className="compare-circle">A</div><span>↔</span><div className="compare-circle">B</div><small>СОПОСТАВЛЕНИЕ</small></div>;
  if (section === "SOURCES") return <div className="hero-visual visual-sources"><div><Database size={24}/></div><span>ИСТОЧНИКИ</span><i/><i/><i/></div>;
  return <div className="radar" aria-hidden="true"><div className="radar-ring ring-one"/><div className="radar-ring ring-two"/><div className="radar-ring ring-three"/><div className="radar-sweep"/><div className="radar-center"><Plane size={20}/></div><span className="radar-tag tag-a">RU</span><span className="radar-tag tag-b">LIVE</span></div>;
}
