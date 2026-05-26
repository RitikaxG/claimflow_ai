import type { Prisma } from "@repo/db";

export function toPrismaJson(value : unknown) : Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}