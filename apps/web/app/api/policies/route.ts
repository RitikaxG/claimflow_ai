import { prisma } from "@repo/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type PolicyDocumentRow = {
  id: string;
  title: string;
  insurerName: string | null;
  productType: string;
  version: string;
  sourcePath: string | null;
  sourceType: string;
  contentHash: string | null;
  createdAt: Date;
  updatedAt: Date;
  chunkCount: number | bigint | string;
  embeddedChunkCount: number | bigint | string;
};

export async function GET() {
  try {
    const rows = await prisma.$queryRawUnsafe<PolicyDocumentRow[]>(`
      SELECT
        pd.id,
        pd.title,
        pd."insurerName",
        pd."productType",
        pd.version,
        pd."sourcePath",
        pd."sourceType"::text AS "sourceType",
        pd."contentHash",
        pd."createdAt",
        pd."updatedAt",
        COUNT(pc.id) AS "chunkCount",
        COUNT(pc.embedding) AS "embeddedChunkCount"
      FROM policy_documents pd
      LEFT JOIN policy_chunks pc
        ON pc."policyDocumentId" = pd.id
      GROUP BY pd.id
      ORDER BY pd."createdAt" DESC;
    `);

    const policies = rows.map((row) => ({
      id: row.id,
      title: row.title,
      insurerName: row.insurerName,
      productType: row.productType,
      version: row.version,
      sourcePath: row.sourcePath,
      sourceType: row.sourceType,
      contentHash: row.contentHash,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      chunkCount: Number(row.chunkCount),
      embeddedChunkCount: Number(row.embeddedChunkCount),
    }));

    return NextResponse.json(
      {
        count: policies.length,
        policies,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("List policies API failed.", error);

    return NextResponse.json(
      {
        error: "Failed to list policy documents.",
      },
      { status: 500 },
    );
  }
}