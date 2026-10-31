CREATE TYPE "EventCategory" AS ENUM ('FLEET', 'LIVERY', 'ROUTE', 'AIRPORT', 'BUSINESS');
CREATE TYPE "VerificationStatus" AS ENUM ('pending', 'verified', 'rejected', 'needs_more_information');
CREATE TYPE "ConfidenceLevel" AS ENUM ('low', 'medium', 'high');
CREATE TYPE "RouteStatus" AS ENUM ('planned', 'active', 'seasonal', 'closed', 'unknown');
CREATE TYPE "SourceStatus" AS ENUM ('not_configured', 'active', 'unsupported', 'error');
CREATE TYPE "SourceType" AS ENUM ('airline', 'airport', 'government', 'schedule', 'media', 'other');
CREATE TYPE "ImportStatus" AS ENUM ('running', 'completed', 'failed');

CREATE TABLE "airlines" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL,
  "iata_code" TEXT, "icao_code" TEXT, "official_website" TEXT, "description" TEXT, "logo" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "airlines_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "aircraft" (
  "id" TEXT NOT NULL, "registration" TEXT, "manufacturer_serial_number" TEXT, "aircraft_type" TEXT,
  "manufacturer" TEXT, "production_year" INTEGER, "current_airline_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "aircraft_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "airports" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "iata_code" TEXT, "icao_code" TEXT, "city" TEXT, "country" TEXT,
  "latitude" DECIMAL(9,6), "longitude" DECIMAL(9,6), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "airports_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "routes" (
  "id" TEXT NOT NULL, "airline_id" TEXT NOT NULL, "origin_airport_id" TEXT NOT NULL,
  "destination_airport_id" TEXT NOT NULL, "aircraft_type" TEXT, "start_date" DATE, "end_date" DATE,
  "status" "RouteStatus" NOT NULL DEFAULT 'unknown', "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "sources" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "url" TEXT NOT NULL, "source_type" "SourceType" NOT NULL,
  "status" "SourceStatus" NOT NULL DEFAULT 'not_configured', "terms_url" TEXT, "last_checked_at" TIMESTAMP(3),
  "limitations" TEXT, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "liveries" (
  "id" TEXT NOT NULL, "airline_id" TEXT NOT NULL, "aircraft_id" TEXT, "name" TEXT NOT NULL, "category" TEXT NOT NULL,
  "description" TEXT, "first_seen_at" DATE, "last_seen_at" DATE, "image_url" TEXT, "image_author" TEXT,
  "image_license" TEXT, "source_id" TEXT, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "liveries_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "events" (
  "id" TEXT NOT NULL, "title" TEXT NOT NULL, "slug" TEXT NOT NULL, "description" TEXT NOT NULL,
  "category" "EventCategory" NOT NULL, "event_type" TEXT NOT NULL, "airline_id" TEXT, "aircraft_id" TEXT,
  "airport_id" TEXT, "route_id" TEXT, "event_date" DATE, "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "published_at" TIMESTAMP(3), "verification_status" "VerificationStatus" NOT NULL DEFAULT 'pending',
  "is_historical" BOOLEAN NOT NULL DEFAULT false, "confidence_level" "ConfidenceLevel" NOT NULL DEFAULT 'medium',
  "dedupe_key" TEXT, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "event_sources" (
  "id" TEXT NOT NULL, "event_id" TEXT NOT NULL, "source_id" TEXT NOT NULL, "source_url" TEXT NOT NULL,
  "source_publication_date" TIMESTAMP(3), "source_excerpt" TEXT, "collected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "event_sources_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "moderation_logs" (
  "id" TEXT NOT NULL, "event_id" TEXT NOT NULL, "administrator_id" TEXT NOT NULL, "action" TEXT NOT NULL,
  "comment" TEXT, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "moderation_logs_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "source_imports" (
  "id" TEXT NOT NULL, "source_id" TEXT NOT NULL, "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3), "status" "ImportStatus" NOT NULL DEFAULT 'running',
  "records_processed" INTEGER NOT NULL DEFAULT 0, "events_created" INTEGER NOT NULL DEFAULT 0, "errors" JSONB,
  CONSTRAINT "source_imports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "airlines_slug_key" ON "airlines"("slug");
CREATE UNIQUE INDEX "airlines_iata_code_key" ON "airlines"("iata_code");
CREATE UNIQUE INDEX "airlines_icao_code_key" ON "airlines"("icao_code");
CREATE INDEX "airlines_name_idx" ON "airlines"("name");
CREATE UNIQUE INDEX "aircraft_registration_key" ON "aircraft"("registration");
CREATE INDEX "aircraft_aircraft_type_idx" ON "aircraft"("aircraft_type");
CREATE INDEX "aircraft_current_airline_id_idx" ON "aircraft"("current_airline_id");
CREATE UNIQUE INDEX "airports_iata_code_key" ON "airports"("iata_code");
CREATE UNIQUE INDEX "airports_icao_code_key" ON "airports"("icao_code");
CREATE INDEX "airports_name_idx" ON "airports"("name");
CREATE INDEX "airports_city_idx" ON "airports"("city");
CREATE UNIQUE INDEX "routes_identity_key" ON "routes"("airline_id", "origin_airport_id", "destination_airport_id", "start_date");
CREATE INDEX "routes_status_date_idx" ON "routes"("status", "start_date");
CREATE UNIQUE INDEX "sources_url_key" ON "sources"("url");
CREATE INDEX "sources_status_source_type_idx" ON "sources"("status", "source_type");
CREATE INDEX "liveries_airline_id_first_seen_at_idx" ON "liveries"("airline_id", "first_seen_at");
CREATE INDEX "liveries_aircraft_id_idx" ON "liveries"("aircraft_id");
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");
CREATE UNIQUE INDEX "events_dedupe_key_key" ON "events"("dedupe_key");
CREATE INDEX "events_status_date_idx" ON "events"("verification_status", "event_date" DESC);
CREATE INDEX "events_category_status_date_idx" ON "events"("category", "verification_status", "event_date" DESC);
CREATE INDEX "events_airline_date_idx" ON "events"("airline_id", "event_date" DESC);
CREATE INDEX "events_aircraft_id_idx" ON "events"("aircraft_id");
CREATE INDEX "events_airport_id_idx" ON "events"("airport_id");
CREATE UNIQUE INDEX "event_sources_identity_key" ON "event_sources"("event_id", "source_id", "source_url");
CREATE INDEX "event_sources_event_id_idx" ON "event_sources"("event_id");
CREATE INDEX "moderation_logs_event_id_created_at_idx" ON "moderation_logs"("event_id", "created_at" DESC);
CREATE INDEX "moderation_logs_administrator_id_created_at_idx" ON "moderation_logs"("administrator_id", "created_at" DESC);
CREATE INDEX "source_imports_source_id_started_at_idx" ON "source_imports"("source_id", "started_at" DESC);
CREATE INDEX "source_imports_status_started_at_idx" ON "source_imports"("status", "started_at" DESC);

ALTER TABLE "aircraft" ADD CONSTRAINT "aircraft_current_airline_id_fkey" FOREIGN KEY ("current_airline_id") REFERENCES "airlines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "routes" ADD CONSTRAINT "routes_airline_id_fkey" FOREIGN KEY ("airline_id") REFERENCES "airlines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "routes" ADD CONSTRAINT "routes_origin_airport_id_fkey" FOREIGN KEY ("origin_airport_id") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "routes" ADD CONSTRAINT "routes_destination_airport_id_fkey" FOREIGN KEY ("destination_airport_id") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "liveries" ADD CONSTRAINT "liveries_airline_id_fkey" FOREIGN KEY ("airline_id") REFERENCES "airlines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "liveries" ADD CONSTRAINT "liveries_aircraft_id_fkey" FOREIGN KEY ("aircraft_id") REFERENCES "aircraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "liveries" ADD CONSTRAINT "liveries_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_airline_id_fkey" FOREIGN KEY ("airline_id") REFERENCES "airlines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_aircraft_id_fkey" FOREIGN KEY ("aircraft_id") REFERENCES "aircraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_airport_id_fkey" FOREIGN KEY ("airport_id") REFERENCES "airports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "event_sources" ADD CONSTRAINT "event_sources_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_sources" ADD CONSTRAINT "event_sources_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "source_imports" ADD CONSTRAINT "source_imports_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
