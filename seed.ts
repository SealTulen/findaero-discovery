import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to seed the local PostgreSQL database.");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });
const airlines = [
  ["aeroflot", "Аэрофлот"],
  ["rossiya", "Россия"],
  ["pobeda", "Победа"],
  ["s7-airlines", "S7 Airlines"],
  ["utair", "UTair"],
  ["nordwind", "Nordwind"],
  ["smartavia", "Smartavia"],
  ["red-wings", "Red Wings"],
  ["azur-air", "Azur Air"],
  ["ural-airlines", "Уральские авиалинии"],
  ["yamal", "Ямал"],
  ["severstal", "Северсталь"],
  ["alrosa", "Алроса"],
  ["izhavia", "Ижавиа"],
  ["gazprom-avia", "Газпром авиа"],
  ["rusline", "РусЛайн"],
] as const;

try {
  for (const [slug, name] of airlines) {
    await prisma.airline.upsert({ where: { slug }, update: { name }, create: { slug, name } });
  }
  console.log(`Seeded ${airlines.length} airline directory entries (no events or sources).`);
} finally {
  await prisma.$disconnect();
}
