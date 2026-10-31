/** Shared domain vocabulary for the FINDaero event feed and future API/database. */
export const EVENT_CATEGORIES = ["FLEET", "LIVERY", "ROUTE", "AIRPORT", "BUSINESS"] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  FLEET: "Флот",
  LIVERY: "Ливреи",
  ROUTE: "Маршруты",
  AIRPORT: "Аэропорты",
  BUSINESS: "Бизнес",
};

export const EVENT_TYPE_LABELS = {
  aircraft_added: "Самолёт добавлен во флот",
  aircraft_removed: "Самолёт выбыл из флота",
  aircraft_transferred: "Самолёт передан другому оператору",
  aircraft_returned_to_service: "Самолёт вернулся в эксплуатацию",
  aircraft_inactive: "Самолёт временно не эксплуатируется",
  aircraft_registration_changed: "Изменилась регистрация самолёта",
  aircraft_operator_changed: "Изменился оператор самолёта",
  aircraft_delivered: "Поставка воздушного судна",
  aircraft_retired: "Самолёт выведен из эксплуатации",
  new_special_livery: "Новая специальная ливрея",
  aircraft_repainted: "Самолёт перекрашен",
  livery_removed: "Специальная ливрея снята",
  promotional_livery: "Рекламная ливрея",
  anniversary_livery: "Юбилейная ливрея",
  route_opened: "Открыт новый маршрут",
  route_closed: "Маршрут закрыт",
  route_resumed: "Маршрут возобновлён",
  route_frequency_changed: "Изменилась частота рейсов",
  route_aircraft_changed: "Изменился тип воздушного судна на маршруте",
  airport_added: "Добавлен пункт назначения",
  airport_removed: "Прекращено обслуживание аэропорта",
  new_airline_presence: "Перевозчик начал полёты из аэропорта",
  airport_base_changed: "Изменилась базировка в аэропорту",
  new_contract: "Новый контракт",
  new_project: "Новый проект",
  project_delayed: "Проект отложен",
  project_cancelled: "Проект отменён",
  project_completed: "Проект завершён",
  airline_announcement: "Объявление авиакомпании",
} as const;

export type EventType = keyof typeof EVENT_TYPE_LABELS;
export type VerificationStatus = "pending" | "verified" | "rejected" | "needs_more_information";
export type ConfidenceLevel = "low" | "medium" | "high";
export type SourceStatus = "not_configured" | "active" | "unsupported" | "error";

export interface AirlineRecord {
  id: string;
  name: string;
  slug: string;
  iataCode?: string;
  icaoCode?: string;
  officialWebsite?: string;
  description?: string;
}

export interface AircraftRecord {
  id: string;
  registration?: string;
  manufacturerSerialNumber?: string;
  aircraftType?: string;
  manufacturer?: string;
  productionYear?: number;
  currentAirlineId?: string;
}

export interface AirportRecord {
  id: string;
  name: string;
  iataCode?: string;
  icaoCode?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface RouteRecord {
  id: string;
  airlineId: string;
  originAirportId: string;
  destinationAirportId: string;
  aircraftType?: string;
  startDate?: string;
  endDate?: string;
  status: "planned" | "active" | "seasonal" | "closed" | "unknown";
}

export type LiveryCategory = "anniversary" | "promotional" | "tourism" | "sports" | "entertainment" | "thematic" | "historic" | "other";

export interface LiveryRecord {
  id: string;
  airlineId: string;
  aircraftId?: string;
  name: string;
  category: LiveryCategory;
  description?: string;
  firstSeenAt?: string;
  lastSeenAt?: string;
  imageUrl?: string;
  imageAuthor?: string;
  imageLicense?: string;
  sourceId?: string;
}

export interface EventSourceReference {
  sourceId: string;
  sourceUrl: string;
  publicationDate?: string;
  excerpt?: string;
  collectedAt: string;
}

export interface AviationEvent {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: EventCategory;
  eventType: EventType;
  airlineId?: string;
  aircraftId?: string;
  airportId?: string;
  routeId?: string;
  eventDate?: string;
  detectedAt: string;
  publishedAt?: string;
  verificationStatus: VerificationStatus;
  isHistorical: boolean;
  confidenceLevel: ConfidenceLevel;
  sources: EventSourceReference[];
}

export interface SourceRecord {
  id: string;
  name: string;
  url: string;
  type: "airline" | "airport" | "government" | "schedule" | "media" | "other";
  status: SourceStatus;
  termsUrl?: string;
  lastCheckedAt?: string;
  limitations?: string;
}

export interface ModerationLogRecord {
  id: string;
  eventId: string;
  administratorId: string;
  action: "created" | "edited" | "verified" | "rejected" | "needs_more_information";
  comment?: string;
  createdAt: string;
}

export interface SourceImportRecord {
  id: string;
  sourceId: string;
  startedAt: string;
  completedAt?: string;
  status: "running" | "completed" | "failed";
  recordsProcessed: number;
  eventsCreated: number;
  errors?: string[];
}

/** Public clients must apply this predicate before rendering any event. */
export function isPublicEvent(event: AviationEvent): boolean {
  return event.verificationStatus === "verified" && event.sources.length > 0;
}
