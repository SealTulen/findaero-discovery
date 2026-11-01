import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client";
import airlineData from "../data/airlines.json";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to seed the local PostgreSQL database.");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });
try {
  for (const airline of airlineData) {
    await prisma.airline.upsert({
      where: { slug: airline.slug },
      update: { name: airline.name, officialWebsite: airline.officialWebsite ?? null },
      create: { slug: airline.slug, name: airline.name, officialWebsite: airline.officialWebsite ?? null },
    });
  }
  console.log(`Seeded ${airlineData.length} airline directory entries from data/airlines.json (no events or sources).`);
} finally {
  await prisma.$disconnect();
}
