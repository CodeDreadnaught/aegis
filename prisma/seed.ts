import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed AEGIS.");
}
if (
  process.env.NODE_ENV === "production" &&
  process.env.AEGIS_ALLOW_DEMO_SEED !== "true"
) {
  throw new Error(
    "Refusing to seed demo users in production. Set AEGIS_ALLOW_DEMO_SEED=true only for an intentional demo environment.",
  );
}
const prisma = new PrismaClient({ adapter: new PrismaPg(connectionString) });
const demoPassword = process.env.APP_PASSWORD!;
const users = [
  {
    email: process.env.PREVIOUS_ADMINISTRATOR_EMAIL!,
    name: "AEGIS Administrator",
    role: "ADMINISTRATOR" as const,
  },
  {
    email: process.env.PREVIOUS_MAINTENANCE_ENGINEER_EMAIL!,
    name: "Maintenance Engineer",
    role: "MAINTENANCE_ENGINEER" as const,
  },
  {
    email: process.env.PREVIOUS_OPERATIONS_MANAGER_EMAIL!,
    name: "Operations Manager",
    role: "OPERATIONS_MANAGER" as const,
  },
];

async function main() {
  const passwordHash = await hash(demoPassword, 12);
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, status: "ACTIVE" },
      create: { ...user, passwordHash },
    });
  }
}
main().finally(async () => {
  await prisma.$disconnect();
});
