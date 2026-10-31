"use client";

import { createElement, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, ArrowDownUp, ArrowRight, Bell, ChevronDown, CircleHelp,
  Clock3, Compass, Database, Plane, Radio, Search, ShieldCheck,
  SlidersHorizontal, Sparkles, MapPin, Layers3, ExternalLink,
} from "lucide-react";
import { projectRussiaPoint, routeArc, type VerifiedMapRoute } from "@/lib/route-map";
import newsData from "@/data/events.json";
import sourcesData from "@/data/sources.json";

type NewsEvent = {
  id: string; title: string; description: string; category: "FLEET" | "LIVERY" | "ROUTE" | "AIRPORT" | "BUSINESS";
  eventType: string; airline: string; eventDate: string; detectedAt: string; status: string; isHistorical: boolean; confidence: string;
  route?: { originName: string; destinationName: string; aircraftType?: string; plannedStartDate?: string; mapVisible: boolean; origin?: { latitude: number; longitude: number }; destination?: { latitude: number; longitude: number } };
  aircraft?: { type: string; registration: string };
  sources: { name: string; url: string; publishedAt: string; kind: string }[];
};
type SourceEntry = (typeof sourcesData)[number];
const newsEvents = newsData as NewsEvent[];
const sourceEntries = sourcesData as SourceEntry[];

const sections = ["CHANGELOG", "FLEET", "LIVERIES", "ROUTES", "COMPARE", "SOURCES"] as const;
type Section = (typeof sections)[number];

const sectionCopy: Record<Section, { title: string; subtitle: string; eyebrow: string }> = {
  CHANGELOG: { title: "Изменения, которые\nдвигают авиацию", subtitle: "Проверяемая хроника российской гражданской авиации. Только события с источниками.", eyebrow: "АВИАЦИОННАЯ ХРОНИКА" },
  FLEET: { title: "История каждого\nвоздушного судна", subtitle: "Поступления, смены операторов и возвращения в эксплуатацию — с подтверждениями.", eyebrow: "МОНИТОРИНГ ФЛОТА" },
  LIVERIES: { title: "Самолёты, которые\nневозможно спутать", subtitle: "Специальные окраски и история их появления — с указанием авторства изображений.", eyebrow: "АРХИВ ЛИВРЕЙ" },
  ROUTES: { title: "География полётов\nв движении", subtitle: "Новые направления, возобновления и изменения маршрутных сетей.", eyebrow: "КАРТА МАРШРУТОВ" },
  COMPARE: { title: "Динамика без\nрейтингов", subtitle: "Сравнивайте наблюдаемые изменения с учётом полноты данных.", eyebrow: "СРАВНЕНИЕ ПЕРЕВОЗЧИКОВ" },
  SOURCES: { title: "Откуда мы знаем,\nчто изменилось", subtitle: "Прозрачность источников и ограничений — часть каждого события.", eyebrow: "РЕЕСТР ИСТОЧНИКОВ" },
};

const airlines = ["Аэрофлот", "Россия", "Победа", "S7 Airlines", "UTair", "Nordwind", "Smartavia", "Red Wings", "Azur Air", "Уральские авиалинии", "Ямал", "Северсталь", "Алроса", "Ижавиа", "Газпром авиа", "РусЛайн"];

function AirlineMark({ airline }: { airline: string }) {
  const key = airline.toLowerCase();
  const mark = key.includes("red wings") ? { initials: "RW", style: "red-wings" }
    : key.includes("s7") ? { initials: "S7", style: "s7" }
    : key.includes("ираэро") || key.includes("iraero") ? { initials: "IA", style: "iraero" }
    : key.includes("ямал") || key.includes("yamal") ? { initials: "Я", style: "yamal" }
    : key.includes("россия") || key.includes("rossiya") ? { initials: "РОССИЯ", style: "rossiya" }
    : key.includes("аэрофлот") ? { initials: "А", style: "aeroflot" }
    : { initials: airline.split(/\\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase(), style: "generic" };
  return <span className={`airline-mark airline-mark-${mark.style}`} role="img" aria-label={`Знак авиакомпании ${airline}`}><span>{mark.initials}</span></span>;
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
  if (section === "FLEET") {
    const fleetEvents = newsEvents.filter((event) => event.status === "verified" && event.category === "FLEET").sort((a, b) => b.eventDate.localeCompare(a.eventDate));
    return <div className="workspace-grid"><div className="feature-card fleet-card"><div className="card-kicker"><Plane size={14}/> КАРТОЧКА ВОЗДУШНОГО СУДНА · 3D-ИЛЛЮСТРАЦИЯ</div><AircraftScene/><div className="fleet-caption"><div><span>ПОДТВЕРЖДЁННЫХ БОРТОВ</span><b>{new Set(fleetEvents.map((event) => event.aircraft?.registration).filter(Boolean)).size.toString().padStart(2, "0")}</b></div><div><span>СОБЫТИЙ ФЛОТА</span><b>{fleetEvents.length.toString().padStart(2, "0")}</b></div><button onClick={onSources}>Источники записей <ArrowRight size={14}/></button></div></div><div className="feature-card timeline-card"><div className="card-heading"><div><div className="card-kicker">ХРОНОЛОГИЯ</div><h3>Подтверждённые изменения флота</h3></div><span className="empty-chip">{fleetEvents.length ? `${fleetEvents.length} ЗАПИСЬ` : "НЕТ ДАННЫХ"}</span></div>{fleetEvents.length ? <div className="fleet-history">{fleetEvents.map((event) => <article className="fleet-history-item" key={event.id}><span className="fleet-history-date">{new Date(`${event.eventDate}T00:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</span><b>{event.aircraft?.type ?? "Тип не указан"} · {event.aircraft?.registration ?? "Регистрация не указана"}</b><strong>{event.title}</strong><p>{event.description}</p><a href={event.sources[0]?.url} target="_blank" rel="noreferrer">Официальное подтверждение <ExternalLink size={12}/></a></article>)}</div> : <div className="timeline-empty"><div className="timeline-line"/><div className="timeline-point"/><div className="timeline-placeholder"><span>ОЖИДАЕТСЯ ИСТОЧНИК</span><b>История начнётся с первого подтверждённого события</b><p>Поступление · смена оператора · простой · возвращение</p></div><ShieldCheck size={18}/></div>}<div className="timeline-note">Мы показываем только подтверждённые изменения. 3D-модель служит иллюстрацией и не связана с конкретной регистрацией.</div></div></div>;
  }
  if (section === "ROUTES") return <div className="feature-card route-card"><div className="card-heading"><div><div className="card-kicker">МАРШРУТНАЯ СЕТЬ</div><h3>Новые направления и изменения</h3></div><div className="route-filter"><span>ПОДТВЕРЖДЁННЫЕ МАРШРУТЫ</span><b>{newsEvents.filter((event) => event.status === "verified" && event.route?.mapVisible).length}</b></div></div><RussiaMap verifiedRoutes={newsEvents.filter((event) => event.status === "verified" && event.route?.mapVisible && event.route.origin && event.route.destination).map((event) => ({ id: event.id, title: event.title, airlineName: event.airline, originName: event.route!.originName, destinationName: event.route!.destinationName, origin: event.route!.origin!, destination: event.route!.destination! }))}/><div className="route-note"><ShieldCheck size={14}/> Разовый чартер не считается постоянным маршрутом без подтверждения регулярности.</div></div>;
  if (section === "LIVERIES") {
    const liveryProjects = newsEvents.filter((event) => event.status === "verified" && event.category === "LIVERY").sort((a, b) => b.eventDate.localeCompare(a.eventDate));
    return <div className="workspace-grid"><div className="feature-card livery-gallery"><div className="card-heading"><div><div className="card-kicker">ГАЛЕРЕЯ</div><h3>Специальные окраски</h3></div><span className="empty-chip">0 ГОТОВЫХ ОКРАСОК · {liveryProjects.length} ПРОЕКТ</span></div><div className="hangar"><div className="hangar-lines"/><div className="hangar-plane"><Plane size={58}/></div><div className="hangar-caption">ФОТО ПОЯВЯТСЯ ПОСЛЕ ПРОВЕРКИ ПРАВ И ИСТОЧНИКОВ</div></div><div className="license-note"><ShieldCheck size={15}/> Проекты дизайна отделены от уже нанесённых на самолёт ливрей. Фото без проверенной лицензии не публикуем.</div>{liveryProjects.map((event) => <article className="livery-project" key={event.id}><span>ПРОЕКТ · {new Date(`${event.eventDate}T00:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</span><b>{event.title}</b><p>{event.description}</p><div>{event.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.name} <ExternalLink size={11}/></a>)}</div></article>)}</div><div className="feature-card livery-types"><div className="card-kicker">КАТЕГОРИИ ЛИВРЕЙ</div>{["Юбилейные", "Рекламные", "Спортивные", "Тематические", "Исторические"].map((name, i) => <div className="livery-type" key={name}><span className="livery-index">0{i + 1}</span><b>{name}</b><span>—</span></div>)}</div></div>;
  }
  if (section === "COMPARE") {
    const metrics = [{ key: "FLEET", label: "Изменения флота" }, { key: "LIVERY", label: "Специальные ливреи" }, { key: "ROUTE", label: "Маршрутные изменения" }, { key: "AIRPORT", label: "Изменения аэропортов" }, { key: "BUSINESS", label: "События бизнеса" }];
    const count = (airline: string, key: string) => newsEvents.filter(event => event.status === "verified" && event.airline === airline && event.category === key).length;
    return <div className="feature-card compare-card"><div className="card-heading"><div><div className="card-kicker">СОПОСТАВИМЫЕ ДАННЫЕ</div><h3>Сравнение подтверждённых событий</h3></div><span className="empty-chip">БЕЗ РЕЙТИНГОВ</span></div><div className="compare-selectors"><label>ПЕРЕВОЗЧИК A<select value={compareA} onChange={event => setCompareA(event.target.value)}>{Array.from(new Set(newsEvents.map(event => event.airline))).map(name => <option key={name}>{name}</option>)}</select></label><div className="compare-vs">VS</div><label>ПЕРЕВОЗЧИК B<select value={compareB} onChange={event => setCompareB(event.target.value)}>{Array.from(new Set(newsEvents.map(event => event.airline))).map(name => <option key={name}>{name}</option>)}</select></label><div className="compare-period-note">За весь период наблюдений в текущем реестре</div></div><div className="compare-results"><div className="compare-result-head"><b>{compareA}</b><span>КАТЕГОРИЯ</span><b>{compareB}</b></div>{metrics.map(metric => { const first = count(compareA, metric.key); const second = count(compareB, metric.key); const total = Math.max(first + second, 1); return <div className="compare-result-row" key={metric.key}><strong>{first}</strong><span>{metric.label}<i><b style={{ width: `${(first / total) * 100}%` }}/><b style={{ width: `${(second / total) * 100}%` }}/></i></span><strong>{second}</strong></div>; })}</div><div className="compare-coverage"><ShieldCheck size={14}/> Это сравнение охватывает только {newsEvents.length} найденных и подтверждённых записей проекта; оно не измеряет качество или полный масштаб работы авиакомпаний.</div></div>;
  }
  if (section === "SOURCES") return <div className="feature-card sources-card"><div className="card-heading"><div><div className="card-kicker">РЕЕСТР И НАДЁЖНОСТЬ</div><h3>Источники данных</h3></div><span className="source-count">{sourceEntries.length} источников · автосбор не настроен</span></div><div className="source-table"><div className="source-row source-head"><span>ИСТОЧНИК</span><span>СТАТУС</span><span>ОГРАНИЧЕНИЯ</span><span>САЙТ</span></div>{sourceEntries.map((source) => <div className="source-row" key={source.id}><div className="source-name"><span className="source-symbol"><ExternalLink size={14}/></span><div><b>{source.name}</b><small>{source.type}</small></div></div><span className={`source-status ${source.status === "Требуется разрешение" ? "source-permission" : ""}`}><i/>{source.status}</span><span className="source-limits">{source.limitations}</span><a className="source-link" href={source.url} target="_blank" rel="noreferrer">Открыть <ArrowRight size={12}/></a></div>)}</div><div className="source-footnote"><ShieldCheck size={14}/> Автоматический сбор выключен. В ленту попадают события после ручной сверки минимум по двум источникам; публикуется краткое описание и ссылка на оригинал.</div><div className="asset-credits"><b>КАРТОГРАФИЯ И МОДЕЛИ</b><span>Контур России — геоданные Natural Earth, public domain.</span><span>Модель самолёта — amvlab, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. Безлоготипный A320, используется без изменений.</span></div></div>;
  return null;
}

export default function Home() {
  const [section, setSection] = useState<Section>("CHANGELOG");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [period, setPeriod] = useState("12m");
  const [airlineFilter, setAirlineFilter] = useState("ALL");
  const [sort, setSort] = useState("По дате события");
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
      if (needle && ![event.title, event.description, event.airline, event.route?.originName, event.route?.destinationName, event.route?.aircraftType].filter(Boolean).join(" ").toLocaleLowerCase("ru").includes(needle)) return false;
      return true;
    }).sort((a, b) => Date.parse(sort === "По дате события" ? b.eventDate : b.detectedAt) - Date.parse(sort === "По дате события" ? a.eventDate : a.detectedAt));
  }, [query, category, period, airlineFilter, sort]);
  const sectionIndex = sections.indexOf(section) + 1;

  return <main className="shell">
    <aside className="sidebar">
      <button className="brand" onClick={() => setSection("CHANGELOG")}><span className="brand-mark"><Plane size={19}/></span><span>FIND<span className="brand-light">aero</span><small>CHANGELOG</small></span></button>
      <div className="side-label">МОНИТОРИНГ</div>
      <nav className="nav-list" aria-label="Разделы">
        {sections.map((item, i) => <button key={item} onClick={() => setSection(item)} className={`nav-item ${section === item ? "active" : ""}`}><span className="nav-icon">{[<Activity size={17}/>, <Plane size={17}/>, <Sparkles size={17}/>, <Compass size={17}/>, <ArrowDownUp size={17}/>, <Database size={17}/>][i]}</span>{item}{item === "CHANGELOG" && <span className="nav-pulse"/>}</button>)}
      </nav>
      <div className="sidebar-bottom"><div className="system-card"><div className="system-title"><span className="live-dot"/>СИСТЕМА ГОТОВА</div><p>Источники ожидают<br/>подключения и проверки</p><div className="system-foot"><span>СОСТОЯНИЕ</span><b>Не настроена</b></div></div><div className="help-link"><CircleHelp size={16}/>О проекте <span>↗</span></div></div>
    </aside>
    <section className="main-area" id="top">
      <header className="topbar"><div className="crumb"><span>FINDaero</span><i>/</i><b>{section}</b></div><div className="top-actions"><span className="edition"><span/> РОССИЯ · MVP</span><button className="icon-button" aria-label="Уведомления"><Bell size={17}/></button><div className="avatar">FA</div></div></header>
      <div className="content">
        <section className={`hero hero-${section.toLowerCase()}`} key={section} aria-live="polite"><div className="hero-copy-block"><div className="eyebrow"><span className="eyebrow-line"/>{copy.eyebrow}<span className="eyebrow-year">/ 2026</span></div><h1>{copy.title.split("\n").map((line, i) => <span key={line}>{line}{i === 0 && <br/>}</span>)}</h1><p className="hero-copy">{copy.subtitle}</p><div className="hero-meta"><span><ShieldCheck size={14}/> Только подтверждённые события</span><span className="meta-sep"/><span><Clock3 size={14}/> История с источниками</span></div></div><HeroScene section={section}/><div className="hero-index">{sectionIndex.toString().padStart(2,"0")} <span>/ 06</span></div></section>
        <div className="metrics"><div className="metric"><span className="metric-label">ПОДТВЕРЖДЁННЫЕ СОБЫТИЯ</span><div className="metric-value">{newsEvents.filter((event) => event.status === "verified").length.toString().padStart(2,"0")} <span>в ленте</span></div></div><div className="metric"><span className="metric-label">ИСТОЧНИКИ</span><div className="metric-value">{sourceEntries.length.toString().padStart(2,"0")} <span>в реестре · без автосбора</span></div></div><div className="metric"><span className="metric-label">ПОСЛЕДНЯЯ РЕДАКЦИОННАЯ СВЕРКА</span><div className="metric-value muted-value">1 ноября 2026</div></div><div className="metric metric-end"><Radio size={16}/><span>Проверка источников вручную</span></div></div>
        <div className="workspace-transition" key={`workspace-${section}`}><SectionWorkspace section={section} onSources={() => setSection("SOURCES")}/></div>
        {section === "CHANGELOG" && <><div className="feed-heading"><div><div className="eyebrow small-eye"><span className="eyebrow-line"/>ЛЕНТА ИЗМЕНЕНИЙ</div><h2>Последние события</h2></div><div className="feed-tools"><button className="filter-button" onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal size={15}/> Фильтры <ChevronDown size={14} className={showFilters ? "rotated" : ""}/></button><button className="sort-button" onClick={() => setSort(sort === "По дате события" ? "По дате обнаружения" : "По дате события")}><ArrowDownUp size={14}/>{sort}</button></div></div>
        {showFilters && <div className="filter-panel"><label>Категория<select value={category} onChange={e => setCategory(e.target.value)}><option value="ALL">Все категории</option><option value="FLEET">Флот</option><option value="LIVERY">Ливреи</option><option value="ROUTE">Маршруты</option><option value="AIRPORT">Аэропорты</option><option value="BUSINESS">Бизнес</option></select></label><label>Период<select value={period} onChange={e => setPeriod(e.target.value)}><option value="all">Любое время</option><option value="30d">Последние 30 дней</option><option value="12m">Последние 12 месяцев</option></select></label><label>Авиакомпания<select value={airlineFilter} onChange={e => setAirlineFilter(e.target.value)}><option value="ALL">Все авиакомпании</option>{Array.from(new Set(newsEvents.map(event => event.airline))).sort().map(name => <option key={name}>{name}</option>)}</select></label></div>}
        <div className="feed-toolbar"><div className="searchbox"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Поиск по авиакомпании, самолёту, маршруту..."/><kbd>⌘ K</kbd></div><div className="feed-count">{results.length.toString().padStart(2,"0")} <span>ЗАПИСЕЙ</span></div></div>
        {results.length ? <div className="event-list">{results.map(event => <article className="event-card" key={event.id}><div className="event-card-top"><div className="event-brand"><AirlineMark airline={event.airline}/><span className="event-airline-name">{event.airline}</span><span className="event-category">{({FLEET:"ФЛОТ",LIVERY:"ЛИВРЕИ",ROUTE:"МАРШРУТЫ",AIRPORT:"АЭРОПОРТЫ",BUSINESS:"БИЗНЕС"} as Record<string,string>)[event.category]}</span></div><span className="event-verified"><ShieldCheck size={13}/> ПРОВЕРЕНО</span></div><h3>{event.title}</h3><p>{event.description}</p><div className="event-meta"><span>{new Date(`${event.eventDate}T00:00:00`).toLocaleDateString("ru-RU",{day:"numeric",month:"long",year:"numeric"})}</span>{event.route && <span>{event.route.originName} → {event.route.destinationName}</span>}{event.route?.aircraftType && <span>{event.route.aircraftType}</span>}</div><div className="event-sources">{event.sources.map((source,index) => <a key={`${event.id}-${index}`} href={source.url} target="_blank" rel="noreferrer"><ExternalLink size={12}/><span><b>{source.name}</b><small>{source.kind} · {new Date(`${source.publishedAt}T00:00:00`).toLocaleDateString("ru-RU")}</small></span></a>)}</div></article>)}</div> : <div className="empty-state"><div className="empty-graphic"><div className="empty-orbit orbit-a"/><div className="empty-orbit orbit-b"/><div className="empty-plane"><Plane size={23}/></div><span className="orbit-dot dot-one"/><span className="orbit-dot dot-two"/></div><div className="empty-kicker">НЕТ СОВПАДЕНИЙ</div><h3>{query ? "Ничего не найдено" : "В этом периоде нет событий"}</h3><p>Измените запрос или фильтры. В ленте остаются только подтверждённые записи с двумя источниками.</p><button className="source-cta" onClick={() => setSection("SOURCES")}>Посмотреть реестр источников <ArrowRight size={15}/></button></div>}</>}
        <footer><span>FINDaero CHANGELOG <i>·</i> The aviation industry, change by change.</span><span>ТОЛЬКО ПРОВЕРЕННЫЕ ФАКТЫ <ShieldCheck size={12}/></span></footer>
      </div>
    </section>
  </main>;
}

function HeroScene({ section }: { section: Section }) {
  if (section === "FLEET") return <AircraftScene/>;
  if (section === "ROUTES") return <div className="hero-visual visual-route"><div className="mini-map-grid"/><svg viewBox="0 0 300 130" aria-hidden="true"><path d="M12 59 34 44 58 49 73 35 91 43 108 31 126 37 144 27 160 38 179 30 197 39 215 29 232 43 255 40 281 58 271 73 246 75 230 89 205 79 187 92 165 81 148 97 128 84 107 98 89 80 67 87 51 69 29 76Z"/><path d="M55 62h180" className="mini-route"/></svg><span className="mini-map-empty">Маршруты появятся<br/>после проверки</span></div>;
  if (section === "LIVERIES") return <div className="hero-visual visual-livery"><div className="livery-halo"/><Plane size={94} strokeWidth={.8}/><span>ГАЛЕРЕЯ · 00</span></div>;
  if (section === "COMPARE") return <div className="hero-visual visual-compare"><div className="compare-circle">A</div><span>↔</span><div className="compare-circle">B</div><small>СОПОСТАВЛЕНИЕ</small></div>;
  if (section === "SOURCES") return <div className="hero-visual visual-sources"><div><Database size={24}/></div><span>ИСТОЧНИКИ</span><i/><i/><i/></div>;
  return <div className="radar" aria-hidden="true"><div className="radar-ring ring-one"/><div className="radar-ring ring-two"/><div className="radar-ring ring-three"/><div className="radar-sweep"/><div className="radar-center"><Plane size={20}/></div><span className="radar-tag tag-a">RU</span><span className="radar-tag tag-b">LIVE</span></div>;
}
