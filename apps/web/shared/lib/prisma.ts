import { PrismaClient } from "../../prisma/generated/client"; 
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

let prisma: PrismaClient;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

if (typeof window !== "undefined") {
  prisma = new Proxy({} as PrismaClient, {
    get() {
      throw new Error("Критическая ошибка: Попытка вызвать PrismaClient на стороне клиента!");
    }
  });
} else {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      adapter,
      log: ['query', 'info', 'warn', 'error'],
    });
  }
  prisma = globalForPrisma.prisma;
}

export { prisma };