import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const PrismaClientSingleton = () => {
    return new PrismaClient({ adapter });
}

// type declaration
declare global {
    var prisma : undefined | ReturnType<typeof PrismaClientSingleton>;
}

export const prisma = globalThis.prisma ?? PrismaClientSingleton()
export * from "./generated/prisma/client"

if(process.env.NODE_ENV !== "production") globalThis.prisma = prisma;