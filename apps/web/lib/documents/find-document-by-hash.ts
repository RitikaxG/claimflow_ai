import { prisma, type DocumentSourceType } from "@repo/db";

const documentWithLatestRunInclude = {
  runs: {
    orderBy: {
      createdAt: "desc" as const,
    },
    take: 1,
    include: {
      document: true,
      events: {
        orderBy: {
          createdAt: "asc" as const,
        },
      },
    },
  },
};

export async function findDocumentByHash(params: {
  sourceType: DocumentSourceType;
  contentHash: string;
}) {
  const activeDocument = await prisma.document.findFirst({
    where: {
      sourceType: params.sourceType,
      contentHash: params.contentHash,
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: documentWithLatestRunInclude,
  });

  if (activeDocument) {
    return activeDocument;
  }

  return prisma.document.findFirst({
    where: {
      sourceType: params.sourceType,
      contentHash: params.contentHash,
      deletedAt: {
        not: null,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    include: documentWithLatestRunInclude,
  });
}