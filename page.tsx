"use client";

import { useMemo, useState } from "react";
import { Activity, ArrowDownUp, ArrowRight, Bell, ChevronDown, CircleHelp, Clock3, Compass, Database, Filter, Plane, Radio, Search, ShieldCheck, SlidersHorizontal, Sparkles } from "lucide-react";

const sections = ["CHANGELOG", "FLEET", "LIVERIES", "ROUTES", "COMPARE", "SOURCES"];
const sectionCopy: Record<string, { title: string; subtitle: string }> = {
  CHANGELOG: { title: "Изменения, которые\nдвигают авиацию", subtitle: "Проверяемая хроника российской гражданской авиации. Только события с источниками." },
  FLEET: { title: "История каждого\nвоздушного судна", subtitle: "Поступления, смены операторов и возвращения в эксплуатацию — с подтверждениями." },
  LIVERIES: { title: "Самолёты, которые\nневозможно спутать", subtitle: "Специальные окраски и их история с указанием авторства изображений." },
  ROUTES: { title: "География полётов\nв движении", subtitle: "Новые направления, возобновления и изменения маршрутных сетей." },
  COMPARE: { title: "Динамика без\nрейтингов", subtitle: "Сравнивайте наблюдаемые изменения с учётом полноты данных." },
  SOURCES: { title: "Откуда мы знаем,\nчто изменилось", subtitle: "Прозрачность источников и ограничений — часть каждого события." },
};

export default function Home() {
  const [section, setSection] = useState("CHANGELOG");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Все категории");
  const [sort, setSort] = useState("По дате события");
  const [showFilters, setShowFilters] = useState(false);
  const copy = sectionCopy[section];
  const results = useMemo(() => [], [query, category, sort, section]);

  return <main className="shell">
    <aside className="sidebar">
      <a className="brand" href="#top" onClick={() => setSection("CHANGELOG")}><span className="brand-mark"><Plane size={19} /></span><span>FIND<span className="brand-light">aero</span><small>CHANGELOG</small></span></a>
      <div className="side-label">МОНИТОРИНГ</div>
      <nav className="nav-list" aria-label="Разделы">
        {sections.map((item, i) => <button key={item} onClick={() => setSection(item)} className={`nav-item ${section === item ? "active" : ""}`}><span className="nav-icon">{[<Activity size={17}/>, <Plane size={17}/>, <Sparkles size={17}/>, <Compass size={17}/>, <ArrowDownUp size={17}/>, <Database size={17}/>][i]}</span>{item}{item === "CHANGELOG" && <span className="nav-pulse"/>}</button>)}
      </nav>
      <div className="sidebar-bottom"><div className="system-card"><div className="system-title"><span className="live-dot"/>СИСТЕМА АКТИВНА</div><p>Источники проверяются<br/>по мере подключения</p><div className="system-foot"><span>СОСТОЯНИЕ</span><b>Ожидает настройки</b></div></div><div className="help-link"><CircleHelp size={16}/>О проекте <span>↗</span></div></div>
    </aside>
    <section className="main-area" id="top">
      <header className="topbar"><div className="crumb"><span>FINDaero</span><i>/</i><b>{section}</b></div><div className="top-actions"><span className="edition"><span/> РОССИЯ · MVP</span><button className="icon-button" aria-label="Уведомления"><Bell size={17}/></button><div className="avatar">FA</div></div></header>
      <div className="content">
        <div className="hero"><div><div className="eyebrow"><span className="eyebrow-line"/>АВИАЦИОННАЯ ХРОНИКА <span className="eyebrow-year">/ 2026</span></div><h1>{copy.title.split("\n").map((line, i) => <span key={line}>{line}{i === 0 && <br/>}</span>)}</h1><p className="hero-copy">{copy.subtitle}</p><div className="hero-meta"><span><ShieldCheck size={14}/> Только подтверждённые события</span><span className="meta-sep"/><span><Clock3 size={14}/> История с источниками</span></div></div><div className="radar" aria-hidden="true"><div className="radar-ring ring-one"/><div className="radar-ring ring-two"/><div className="radar-ring ring-three"/><div className="radar-sweep"/><div className="radar-center"><Plane size={20}/></div><span className="radar-tag tag-a">RU</span><span className="radar-tag tag-b">LIVE</span></div><div className="hero-index">01 <span>/ 06</span></div></div>
        <div className="metrics"><div className="metric"><span className="metric-label">СОБЫТИЯ</span><div className="metric-value">— <span>ожидают публикации</span></div></div><div className="metric"><span className="metric-label">ИСТОЧНИКИ</span><div className="metric-value">— <span>не подключены</span></div></div><div className="metric"><span className="metric-label">ПОСЛЕДНЯЯ ПРОВЕРКА</span><div className="metric-value muted-value">Пока не запускалась</div></div><div className="metric metric-end"><Radio size={16}/><span>Ждём подтверждённые данные</span></div></div>
        <div className="feed-heading"><div><div className="eyebrow small-eye"><span className="eyebrow-line"/>ЛЕНТА ИЗМЕНЕНИЙ</div><h2>{section === "CHANGELOG" ? "Последние события" : sectionCopy[section].title.replace("\n", " ")}</h2></div><div className="feed-tools"><button className="filter-button" onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal size={15}/> Фильтры <ChevronDown size={14} className={showFilters ? "rotated" : ""}/></button><button className="sort-button" onClick={() => setSort(sort === "По дате события" ? "По дате обнаружения" : "По дате события")}><ArrowDownUp size={14}/>{sort}</button></div></div>
        {showFilters && <div className="filter-panel"><label>Категория<select value={category} onChange={e => setCategory(e.target.value)}><option>Все категории</option><option>Флот</option><option>Ливреи</option><option>Маршруты</option><option>Аэропорты</option><option>Бизнес</option></select></label><label>Период<select><option>Любое время</option><option>Последние 30 дней</option><option>Последние 12 месяцев</option></select></label><label>Авиакомпания<select><option>Все авиакомпании</option></select></label></div>}
        <div className="feed-toolbar"><div className="searchbox"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Поиск по авиакомпании, самолёту, маршруту..."/><kbd>⌘ K</kbd></div><div className="feed-count">{results.length.toString().padStart(2, "0")} <span>ЗАПИСЕЙ</span></div></div>
        <div className="empty-state"><div className="empty-graphic"><div className="empty-orbit orbit-a"/><div className="empty-orbit orbit-b"/><div className="empty-plane"><Plane size={23}/></div><span className="orbit-dot dot-one"/><span className="orbit-dot dot-two"/></div><div className="empty-kicker">ЛЕНТА ПОКА ПУСТА</div><h3>{query ? "Ничего не найдено" : "Первое изменение ещё впереди"}</h3><p>{query ? "Попробуйте изменить поисковый запрос или фильтры." : "События появятся здесь после подключения источников и проверки редактором."}</p><button className="source-cta" onClick={() => setSection("SOURCES")}>Посмотреть источники <ArrowRight size={15}/></button></div>
        <footer><span>FINDaero CHANGELOG <i>·</i> The aviation industry, change by change.</span><span>ТОЛЬКО ПРОВЕРЕННЫЕ ФАКТЫ <ShieldCheck size={12}/></span></footer>
      </div>
    </section>
  </main>;
}
