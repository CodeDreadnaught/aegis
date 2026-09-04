import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(connectionString),
});

const sharedPassword = process.env.APP_PASSWORD!;

const users = [
  {
    currentEmail: process.env.PREVIOUS_ADMINISTRATOR_EMAIL!,
    email: process.env.ADMINISTRATOR_EMAIL!,
    name: "AEGIS Admin",
    role: "ADMINISTRATOR" as const,
  },
  {
    currentEmail: process.env.PREVIOUS_MAINTENANCE_ENGINEER_EMAIL!,
    email: process.env.MAINTENANCE_ENGINEER_EMAIL!,
    name: "Maintenance Engineer",
    role: "MAINTENANCE_ENGINEER" as const,
  },
  {
    currentEmail: process.env.PREVIOUS_OPERATIONS_MANAGER_EMAIL!,
    email: process.env.OPERATIONS_MANAGER_EMAIL!,
    name: "Operations Manager",
    role: "OPERATIONS_MANAGER" as const,
  },
];

async function main() {
  const passwordHash = await hash(sharedPassword, 12);

  await prisma.$transaction(
    users.map(user =>
      prisma.user.update({
        where: {
          email: user.currentEmail,
        },
        data: {
          email: user.email,
          name: user.name,
          role: user.role,
          status: "ACTIVE",
          passwordHash,
        },
      }),
    ),
  );
}

main().finally(async () => {
  await prisma.$disconnect();
});
