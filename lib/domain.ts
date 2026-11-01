export const EVENT_CATEGORIES = [
  "FLEET",
  "LIVERY",
  "ROUTE",
  "AIRPORT",
  "BUSINESS",
] as const;

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
  codeshare_expanded: "Расширено код-шеринговое сотрудничество",
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
  executive_appointment: "Назначен руководитель авиакомпании",
} as const;

export type EventType = keyof typeof EVENT_TYPE_LABELS;
