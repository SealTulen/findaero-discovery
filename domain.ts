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
  aircraft_entered_service: "Самолёт введён в эксплуатацию",
  aircraft_retired: "Самолёт выведен из эксплуатации",
  new_special_livery: "Новая специальная ливрея",
  new_aircraft_livery: "Самолёт получил новую ливрею",
  aircraft_repainted: "Самолёт перекрашен",
  aircraft_brand_refresh: "Обновлена фирменная окраска флота",
  livery_design_competition: "Конкурс дизайна ливреи",
  livery_removed: "Специальная ливрея снята",
  promotional_livery: "Рекламная ливрея",
  anniversary_livery: "Юбилейная ливрея",
  route_opened: "Открыт новый маршрут",
  route_announced: "Анонсирован новый маршрут",
  route_seasonal: "Сезонная программа маршрута",
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
  codeshare_expanded: "Расширено код-шеринговое сотрудничество",
  executive_appointment: "Назначен руководитель авиакомпании",
} as const;

export type EventType = keyof typeof EVENT_TYPE_LABELS;
export const EVENT_TYPES_BY_CATEGORY = {
  FLEET: ["aircraft_added", "aircraft_removed", "aircraft_transferred", "aircraft_returned_to_service", "aircraft_inactive", "aircraft_registration_changed", "aircraft_operator_changed", "aircraft_delivered", "aircraft_entered_service", "aircraft_retired"],
  LIVERY: ["new_special_livery", "new_aircraft_livery", "aircraft_repainted", "livery_removed", "promotional_livery", "anniversary_livery", "aircraft_brand_refresh", "livery_design_competition"],
  ROUTE: ["route_opened", "route_announced", "route_seasonal", "route_closed", "route_resumed", "route_frequency_changed", "route_aircraft_changed", "codeshare_expanded"],
  AIRPORT: ["airport_added", "airport_removed", "new_airline_presence", "airport_base_changed"],
  BUSINESS: ["new_contract", "new_project", "project_delayed", "project_cancelled", "project_completed", "airline_announcement", "executive_appointment"],
} as const satisfies Record<EventCategory, readonly EventType[]>;
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
