import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, CalendarDays, Plane, ShieldCheck } from "lucide-react";
import eventsData from "@/data/events.json";
import airlinesData from "@/data/airlines.json";
import { AirlineMark } from "@/components/AirlineMark";
import { EVENT_CATEGORY_LABELS, EVENT_TYPE_LABELS, type EventCategory, type EventType } from "@/lib/domain";

type AircraftEvent = {
  id: string; title: string; description: string; category: EventCategory; eventType: EventType;
  airline: string; eventDate: string; detectedAt: string; status: string;
  aircraft?: { type: string; registration?: string };
  route?: { originName: string; destinationName: string; aircraftType?: string };
  sources: { name: string; url: string; publishedAt: string; kind: string }[];
};
type Airline = { slug: string; name: string; eventAliases?: string[] };

const events = eventsData as AircraftEvent[];
const airlines = airlinesData as Airline[];
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

function registrations() {
  return [...new Set(events.filter((event) => event.status === "verified").map((event) => event.aircraft?.registration?.trim().toUpperCase()).filter((registration): registration is string => Boolean(registration)))];
}

export const dynamicParams = false;
export function generateStaticParams() { return registrations().map((registration) => ({ registration })); }

export async function generateMetadata({ params }: { params: Promise<{ registration: string }> }): Promise<Metadata> {
  const { registration } = await params;
  const normalized = registration.toUpperCase();
  const record = events.find((event) => event.status === "verified" && event.aircraft?.registration?.toUpperCase() === normalized);
  return { title: record ? `${normalized} — история борта | FINDaero` : "История борта | FINDaero", description: record ? `Подтверждённые события FINDaero для воздушного судна ${record.aircraft?.type} ${normalized}.` : undefined };
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function airlineHref(name: string) {
  const key = name.toLocaleLowerCase("ru");
  const profile = airlines.find((airline) => [airline.name, ...(airline.eventAliases ?? [])].some((alias) => alias.toLocaleLowerCase("ru") === key));
  return profile ? `${basePath}/airlines/${profile.slug}/` : null;
}

export default async function AircraftHistoryPage({ params }: { params: Promise<{ registration: string }> }) {
  const { registration: rawRegistration } = await params;
  const registration = rawRegistration.trim().toUpperCase();
  const history = events.filter((event) => event.status === "verified" && event.aircraft?.registration?.toUpperCase() === registration).sort((a, b) => a.eventDate.localeCompare(b.eventDate) || a.detectedAt.localeCompare(b.detectedAt));
  if (!history.length) notFound();

  const types = [...new Set(history.map((event) => event.aircraft?.type).filter((type): type is string => Boolean(type)))];
  const operators = [...new Set(history.map((event) => event.airline))];

  return <main className="airline-page-shell aircraft-page-shell">
    <header className="airline-page-topbar"><a href={`${basePath}/`}><ArrowLeft size={15}/> FINDaero CHANGELOG</a><span>ИСТОРИЯ ВОЗДУШНОГО СУДНА</span></header>
    <div className="airline-page-content">
      <section className="aircraft-page-hero">
        <div className="aircraft-page-kicker"><Plane size={14}/> КАРТОЧКА ВОЗДУШНОГО СУДНА · ПОДТВЕРЖДЁННЫЕ ЗАПИСИ</div>
        <h1>{registration}</h1>
        <div className="aircraft-page-types">{types.map((type) => <span key={type}>{type}</span>)}</div>
        <p>Это история фактов, найденных в проверенных публикациях. Она не подтверждает текущего владельца или статус эксплуатации, если такие сведения отдельно не указаны источниками.</p>
        <div className="aircraft-page-stats"><div><span>ЗАПИСИ</span><b>{history.length}</b></div><div><span>ТИП ВОЗДУШНОГО СУДНА</span><b>{types.join(" · ") || "Не указан"}</b></div><div><span>УПОМИНАВШИЕСЯ ПЕРЕВОЗЧИКИ</span><b>{operators.length}</b></div></div>
      </section>
      <section className="airline-page-section aircraft-page-history">
        <div className="airline-page-section-head"><div><span>ХРОНОЛОГИЯ ИЗ ИСТОЧНИКОВ</span><h2>Подтверждённая история</h2></div><span className="airline-page-record-count"><ShieldCheck size={14}/>{history.length} событий</span></div>
        <div className="aircraft-page-operator-list"><b>АВИАКОМПАНИИ, УПОМЯНУТЫЕ В ИСТОРИИ</b>{operators.map((operator) => { const href = airlineHref(operator); return <span key={operator}><AirlineMark airline={operator}/>{href ? <a href={href}>{operator} <ArrowUpRight size={12}/></a> : operator}</span>; })}</div>
        <div className="aircraft-page-timeline">{history.map((event) => <article className="aircraft-page-event" key={event.id}><div className="aircraft-page-event-date"><CalendarDays size={14}/><span>{formatDate(event.eventDate)}</span><small>Обнаружено: {formatDate(event.detectedAt)}</small></div><div className="aircraft-page-event-body"><div className="aircraft-page-event-labels"><span>{EVENT_CATEGORY_LABELS[event.category]}</span><span>{EVENT_TYPE_LABELS[event.eventType]}</span></div><h3>{event.title}</h3><p>{event.description}</p>{event.route && <div className="airline-page-route">{event.route.originName} <span>→</span> {event.route.destinationName}{event.route.aircraftType && <small>{event.route.aircraftType}</small>}</div>}<div className="airline-page-sources">{event.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer"><span><b>{source.name}</b><small>{source.kind} · {formatDate(source.publishedAt)}</small></span><ArrowUpRight size={13}/></a>)}</div></div></article>)}</div>
        <p className="aircraft-page-disclaimer"><ShieldCheck size={14}/> Регистрацию, тип и историю оператора показываем только там, где сведения прямо приведены в проверенных источниках. Неизвестные даты и периоды простоя не реконструируются.</p>
      </section>
      <footer className="airline-page-footer">FINDaero CHANGELOG · The aviation industry, change by change. <a href={`${basePath}/`}>К разделу флота <ArrowLeft size={12}/></a></footer>
    </div>
  </main>;
}
