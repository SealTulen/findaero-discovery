import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, ShieldCheck } from "lucide-react";
import eventsData from "@/data/events.json";
import airlinesData from "@/data/airlines.json";
import { AirlineMark } from "@/components/AirlineMark";
import { AirlineHistory } from "@/components/AirlineHistory";
import { type EventCategory, type EventType } from "@/lib/domain";

type Airline = { slug: string; name: string; officialWebsite?: string; eventAliases?: string[] };
type AirlineEvent = {
  id: string; title: string; description: string; category: EventCategory; eventType: EventType;
  airline: string; eventDate: string; detectedAt: string; status: string;
  aircraft?: { type: string; registration?: string };
  route?: { originName: string; destinationName: string; aircraftType?: string };
  sources: { name: string; url: string; publishedAt: string; kind: string }[];
};
const airlines = airlinesData as Airline[];
const events = eventsData as AirlineEvent[];
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const dynamicParams = false;
export function generateStaticParams() { return airlines.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const airline = airlines.find((entry) => entry.slug === slug);
  return { title: airline ? `${airline.name} — история изменений | FINDaero` : "Авиакомпания | FINDaero", description: airline ? `Подтверждённые события, флот, маршруты и специальные окраски ${airline.name} с первичными источниками.` : undefined };
}

export default async function AirlineProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const airline = airlines.find((entry) => entry.slug === slug);
  if (!airline) notFound();
  const names = new Set([airline.name, ...(airline.eventAliases ?? [])].map((name) => name.toLocaleLowerCase("ru")));
  const records = events.filter((event) => event.status === "verified" && names.has(event.airline.toLocaleLowerCase("ru"))).sort((a, b) => b.eventDate.localeCompare(a.eventDate));
  const aircraft = Array.from(new Map(records.filter((event) => event.aircraft?.registration).map((event) => [event.aircraft!.registration!, event])).values());
  const categories = ["FLEET", "LIVERY", "ROUTE", "AIRPORT", "BUSINESS"] as const;
  const counts = Object.fromEntries(categories.map((category) => [category, records.filter((event) => event.category === category).length])) as Record<EventCategory, number>;

  return <main className="airline-page-shell">
    <header className="airline-page-topbar"><a href={`${basePath}/`}><ArrowLeft size={15}/> FINDaero CHANGELOG</a><span>ПРОФИЛЬ ПЕРЕВОЗЧИКА</span></header>
    <div className="airline-page-content">
      <section className="airline-page-hero">
        <div className="airline-page-title"><AirlineMark airline={airline.name}/><div><span>ИСТОРИЯ ПЕРЕВОЗЧИКА</span><h1>{airline.name}</h1></div></div>
        <p>Подтверждённые изменения в реестре FINDaero. Отсутствие записи не означает, что событие не происходило.</p>
        {airline.officialWebsite && <a className="airline-page-official" href={airline.officialWebsite} target="_blank" rel="noreferrer">Официальный сайт <ArrowUpRight size={14}/></a>}
        <div className="airline-page-stats"><div><span>СОБЫТИЯ</span><b>{records.length}</b></div><div><span>БОРТА С РЕГИСТРАЦИЕЙ</span><b>{aircraft.length}</b></div><div><span>ЛИВРЕИ</span><b>{counts.LIVERY}</b></div><div><span>МАРШРУТЫ</span><b>{counts.ROUTE}</b></div></div>
      </section>
      <section className="airline-page-section">
        <div className="airline-page-section-head"><div><span>ТОЛЬКО ПРОВЕРЕННЫЕ ФАКТЫ</span><h2>История изменений</h2></div><span className="airline-page-record-count"><ShieldCheck size={14}/>{records.length} записей</span></div>
        <AirlineHistory records={records}/>
      </section>
      <footer className="airline-page-footer">FINDaero CHANGELOG · The aviation industry, change by change. <a href={`${basePath}/`}>К общей ленте <ArrowLeft size={12}/></a></footer>
    </div>
  </main>;
}
