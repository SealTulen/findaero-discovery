"use client";

import { useMemo, useState } from "react";
import {
  Activity, ArrowDownUp, ArrowRight, Bell, ChevronDown, CircleHelp,
  Clock3, Compass, Database, Plane, Radio, Search, ShieldCheck,
  SlidersHorizontal, Sparkles, MapPin, Layers3, ExternalLink,
} from "lucide-react";
import { projectRussiaPoint, routeArc, type VerifiedMapRoute } from "@/lib/route-map";
import { AircraftModel } from "@/components/AircraftModel";

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

function RussiaMap() {
  // Schematic country outline. Event coordinates will be plotted only from verified route records.
  const verifiedRoutes: VerifiedMapRoute[] = [];
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
  </div><div className="map-data-empty"><span className="map-empty-icon"><MapPin size={17}/></span><div><b>Пока нет подтверждённых новых направлений</b><span>Точки и линии появятся после проверки источников.</span></div><span className="map-empty-count">00 · ИЗМЕНЕНИЙ</span></div></div>;
}

function SectionWorkspace({ section, onSources }: { section: Section; onSources: () => void }) {
  if (section === "FLEET") return <div className="workspace-grid"><div className="feature-card fleet-card"><div className="card-kicker"><Plane size={14}/> КАРТОЧКА ВОЗДУШНОГО СУДНА</div><AircraftScene/><div className="fleet-caption"><div><span>СВЯЗАННЫХ БОРТОВ</span><b>—</b></div><div><span>ИЗМЕНЕНИЙ ФЛОТА</span><b>—</b></div><button onClick={onSources}>Как появляются записи <ArrowRight size={14}/></button></div></div><div className="feature-card timeline-card"><div className="card-heading"><div><div className="card-kicker">ХРОНОЛОГИЯ</div><h3>История эксплуатации</h3></div><span className="empty-chip">НЕТ ДАННЫХ</span></div><div className="timeline-empty"><div className="timeline-line"/><div className="timeline-point"/><div className="timeline-placeholder"><span>ОЖИДАЕТСЯ ИСТОЧНИК</span><b>История начнётся с первого подтверждённого события</b><p>Поступление · смена оператора · простой · возвращение</p></div><ShieldCheck size={18}/></div><div className="timeline-note">Мы не достраиваем историю самолёта, если сведений нет.</div></div></div>;
  if (section === "ROUTES") return <div className="feature-card route-card"><div className="card-heading"><div><div className="card-kicker">МАРШРУТНАЯ СЕТЬ</div><h3>Новые направления и изменения</h3></div><div className="route-filter"><span>ПЕРИОД</span><button>12 месяцев <ChevronDown size={13}/></button></div></div><RussiaMap/><div className="route-note"><ShieldCheck size={14}/> Разовый чартер не считается постоянным маршрутом без подтверждения регулярности.</div></div>;
  if (section === "LIVERIES") return <div className="workspace-grid"><div className="feature-card livery-gallery"><div className="card-heading"><div><div className="card-kicker">ГАЛЕРЕЯ</div><h3>Специальные окраски</h3></div><span className="empty-chip">0 ПОДТВЕРЖДЕНО</span></div><div className="hangar"><div className="hangar-lines"/><div className="hangar-plane"><Plane size={58}/></div><div className="hangar-caption">ИЗОБРАЖЕНИЯ ПОЯВЯТСЯ ПОСЛЕ ПРОВЕРКИ ПРАВ И ИСТОЧНИКОВ</div></div><div className="license-note"><ShieldCheck size={15}/> Фото публикуются только с проверенными условиями использования.</div></div><div className="feature-card livery-types"><div className="card-kicker">КАТЕГОРИИ ЛИВРЕЙ</div>{["Юбилейные", "Рекламные", "Спортивные", "Тематические", "Исторические"].map((name, i) => <div className="livery-type" key={name}><span className="livery-index">0{i + 1}</span><b>{name}</b><span>—</span></div>)}</div></div>;
  if (section === "COMPARE") return <div className="feature-card compare-card"><div className="card-heading"><div><div className="card-kicker">СОПОСТАВИМЫЕ ДАННЫЕ</div><h3>Выберите перевозчиков</h3></div><span className="empty-chip">БЕЗ РЕЙТИНГОВ</span></div><div className="compare-selectors"><label>ПЕРЕВОЗЧИК A<select defaultValue=""><option value="" disabled>Выберите авиакомпанию</option>{airlines.map(a => <option key={a}>{a}</option>)}</select></label><div className="compare-vs">VS</div><label>ПЕРЕВОЗЧИК B<select defaultValue=""><option value="" disabled>Выберите авиакомпанию</option>{airlines.map(a => <option key={a}>{a}</option>)}</select></label><label>ПЕРИОД<select defaultValue="12 месяцев"><option>3 месяца</option><option>6 месяцев</option><option>12 месяцев</option></select></label></div><div className="compare-empty"><div className="compare-bars"><i/><i/><i/><i/><i/><i/><i/><i/></div><b>Сравнение появится, когда накопятся подтверждённые события</b><span>Неполнота наблюдений будет показана рядом с результатами.</span></div></div>;
  if (section === "SOURCES") return <div className="feature-card sources-card"><div className="card-heading"><div><div className="card-kicker">РЕЕСТР И НАДЁЖНОСТЬ</div><h3>Источники данных</h3></div><button className="source-cta" onClick={onSources}>Принципы проверки <ArrowRight size={14}/></button></div><div className="source-table"><div className="source-row source-head"><span>ТИП ИСТОЧНИКА</span><span>СТАТУС</span><span>ОГРАНИЧЕНИЯ</span><span>ПОСЛЕДНЯЯ ПРОВЕРКА</span></div>{[{n:"Официальные сайты авиакомпаний", d:"Пресс-релизы и новости"},{n:"Официальные сайты аэропортов", d:"Сообщения о направлениях"},{n:"Государственные источники", d:"Реестры и официальные публикации"},{n:"Отраслевые издания", d:"Требуется ручная проверка"}].map((s, i) => <div className="source-row" key={s.n}><div className="source-name"><span className="source-symbol">{i < 2 ? <ExternalLink size={14}/> : <Database size={14}/>}</span><div><b>{s.n}</b><small>{s.d}</small></div></div><span className="source-status"><i/>Не подключён</span><span className="source-limits">Условия использования не проверены</span><span className="source-date">—</span></div>)}</div><div className="source-footnote"><ShieldCheck size={14}/> Статус не означает успешное подключение. Источники появятся только после проверки доступности и условий использования.</div><div className="asset-credits"><b>КАРТОГРАФИЯ И МОДЕЛИ</b><span>Контур России — геоданные Natural Earth, public domain.</span><span>Модель самолёта — amvlab, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. Безлоготипный A320, используется без изменений.</span></div></div>;
  return null;
}

export default function Home() {
  const [section, setSection] = useState<Section>("CHANGELOG");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Все категории");
  const [sort, setSort] = useState("По дате события");
  const [showFilters, setShowFilters] = useState(false);
  const copy = sectionCopy[section];
  const results = useMemo(() => [], [query, category, sort, section]);
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
        <div className="metrics"><div className="metric"><span className="metric-label">СОБЫТИЯ</span><div className="metric-value">— <span>нет подтверждённых записей</span></div></div><div className="metric"><span className="metric-label">ИСТОЧНИКИ</span><div className="metric-value">— <span>не подключены</span></div></div><div className="metric"><span className="metric-label">ПОСЛЕДНЯЯ ПРОВЕРКА</span><div className="metric-value muted-value">Пока не запускалась</div></div><div className="metric metric-end"><Radio size={16}/><span>Ждём подтверждённые данные</span></div></div>
        <div className="workspace-transition" key={`workspace-${section}`}><SectionWorkspace section={section} onSources={() => setSection("SOURCES")}/></div>
        {section === "CHANGELOG" && <><div className="feed-heading"><div><div className="eyebrow small-eye"><span className="eyebrow-line"/>ЛЕНТА ИЗМЕНЕНИЙ</div><h2>Последние события</h2></div><div className="feed-tools"><button className="filter-button" onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal size={15}/> Фильтры <ChevronDown size={14} className={showFilters ? "rotated" : ""}/></button><button className="sort-button" onClick={() => setSort(sort === "По дате события" ? "По дате обнаружения" : "По дате события")}><ArrowDownUp size={14}/>{sort}</button></div></div>
        {showFilters && <div className="filter-panel"><label>Категория<select value={category} onChange={e => setCategory(e.target.value)}><option>Все категории</option><option>Флот</option><option>Ливреи</option><option>Маршруты</option><option>Аэропорты</option><option>Бизнес</option></select></label><label>Период<select><option>Любое время</option><option>Последние 30 дней</option><option>Последние 12 месяцев</option></select></label><label>Авиакомпания<select><option>Все авиакомпании</option>{airlines.map(a => <option key={a}>{a}</option>)}</select></label></div>}
        <div className="feed-toolbar"><div className="searchbox"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Поиск по авиакомпании, самолёту, маршруту..."/><kbd>⌘ K</kbd></div><div className="feed-count">{results.length.toString().padStart(2,"0")} <span>ЗАПИСЕЙ</span></div></div>
        <div className="empty-state"><div className="empty-graphic"><div className="empty-orbit orbit-a"/><div className="empty-orbit orbit-b"/><div className="empty-plane"><Plane size={23}/></div><span className="orbit-dot dot-one"/><span className="orbit-dot dot-two"/></div><div className="empty-kicker">ЛЕНТА ПОКА ПУСТА</div><h3>{query ? "Ничего не найдено" : "Первое изменение ещё впереди"}</h3><p>{query ? "Попробуйте изменить поисковый запрос или фильтры." : "События появятся здесь после подключения источников и проверки редактором."}</p><button className="source-cta" onClick={() => setSection("SOURCES")}>Посмотреть источники <ArrowRight size={15}/></button></div></>}
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
