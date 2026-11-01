"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, CalendarDays, Plane, Search, ShieldCheck } from "lucide-react";
import { EVENT_CATEGORY_LABELS, EVENT_TYPE_LABELS, type EventCategory, type EventType } from "@/lib/domain";

type AirlineEvent = {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  eventType: EventType;
  airline: string;
  eventDate: string;
  detectedAt: string;
  status: string;
  aircraft?: { type: string; registration?: string };
  route?: { originName: string; destinationName: string; aircraftType?: string };
  sources: { name: string; url: string; publishedAt: string; kind: string }[];
};

const categoryOptions: { value: "ALL" | EventCategory; label: string }[] = [
  { value: "ALL", label: "Все категории" },
  { value: "FLEET", label: "Флот" },
  { value: "LIVERY", label: "Ливреи" },
  { value: "ROUTE", label: "Маршруты" },
  { value: "AIRPORT", label: "Аэропорты" },
  { value: "BUSINESS", label: "Бизнес" },
];

function dateLabel(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

export function AirlineHistory({ records }: { records: AirlineEvent[] }) {
  const [category, setCategory] = useState<"ALL" | EventCategory>("ALL");
  const [sort, setSort] = useState<"eventDate" | "detectedAt">("eventDate");
  const [query, setQuery] = useState("");

  const aircraft = useMemo(() => Array.from(new Map(records.filter((event) => event.aircraft?.registration).map((event) => [event.aircraft!.registration!, event])).values()), [records]);
  const visibleRecords = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("ru");
    return records.filter((event) => {
      if (category !== "ALL" && event.category !== category) return false;
      if (!needle) return true;
      return [event.title, event.description, event.aircraft?.type, event.aircraft?.registration, event.route?.originName, event.route?.destinationName, event.route?.aircraftType]
        .filter(Boolean).join(" ").toLocaleLowerCase("ru").includes(needle);
    }).sort((a, b) => b[sort].localeCompare(a[sort]) || b.eventDate.localeCompare(a.eventDate));
  }, [category, query, records, sort]);

  return <>
    {aircraft.length > 0 && <div className="airline-page-aircraft"><b>ВОЗДУШНЫЕ СУДНА С ЗАПИСЯМИ</b>{aircraft.map((event) => <span key={event.aircraft!.registration}><Plane size={13}/>{event.aircraft?.type} · {event.aircraft?.registration}</span>)}</div>}
    <div className="airline-history-controls" aria-label="Фильтры истории перевозчика">
      <label className="airline-history-search"><Search size={15}/><span className="sr-only">Поиск в истории</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Самолёт, регистрация, маршрут или событие" /></label>
      <label><span>Категория</span><select value={category} onChange={(event) => setCategory(event.target.value as "ALL" | EventCategory)}>{categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label><span>Сортировка</span><select value={sort} onChange={(event) => setSort(event.target.value as "eventDate" | "detectedAt")}><option value="eventDate">По дате события</option><option value="detectedAt">По дате обнаружения</option></select></label>
      <span className="airline-history-count">{visibleRecords.length} из {records.length}</span>
    </div>
    {visibleRecords.length ? <div className="airline-page-events">{visibleRecords.map((event) => <article key={event.id} className="airline-page-event"><div className="airline-page-event-meta"><span><CalendarDays size={13}/>Событие: {dateLabel(event.eventDate)}</span><span><CalendarDays size={13}/>Обнаружено: {dateLabel(event.detectedAt)}</span><span>{EVENT_CATEGORY_LABELS[event.category]}</span><span>{EVENT_TYPE_LABELS[event.eventType]}</span></div><h3>{event.title}</h3><p>{event.description}</p>{event.route && <div className="airline-page-route">{event.route.originName} <span>→</span> {event.route.destinationName}{event.route.aircraftType && <small>{event.route.aircraftType}</small>}</div>}{event.aircraft && <div className="airline-page-aircraft-detail"><Plane size={13}/>{event.aircraft.type}{event.aircraft.registration && ` · ${event.aircraft.registration}`}</div>}<div className="airline-page-sources">{event.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer"><span><b>{source.name}</b><small>{source.kind} · {dateLabel(source.publishedAt)}</small></span><ArrowUpRight size={13}/></a>)}</div></article>)}</div> : <div className="airline-page-empty"><ShieldCheck size={18}/><b>{records.length ? "По выбранным фильтрам ничего не найдено" : "Подтверждённых событий пока нет"}</b><p>{records.length ? "Измените поисковый запрос или выберите другую категорию." : "Мы не заполняем историю предположениями. Новые записи появятся после проверки источников."}</p>{query || category !== "ALL" ? <button type="button" onClick={() => { setQuery(""); setCategory("ALL"); }}>Сбросить фильтры</button> : null}</div>}
  </>;
}
