import { PrismaClient } from "@prisma/client";

import { env } from "~/env";

const createPrismaClient = () => {
  // Append pgbouncer parameter if not already present
  const url = env.DATABASE_URL.includes('?pgbouncer=true') 
    ? env.DATABASE_URL 
    : `${env.DATABASE_URL}${env.DATABASE_URL.includes('?') ? '&' : '?'}pgbouncer=true`;
    
  return new PrismaClient({
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    datasources: {
      db: {
        url,
      },
    },
  });
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
