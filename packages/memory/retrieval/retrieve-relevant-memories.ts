import { MemoryClaimStateSchema, RelevantMemorySchema, type MemoryClaimState, type RelevantMemory } from "../types"
import { getStringArray } from "../utils/json";
import { buildMemoryQuery, type BuildMemoryQuery } from "./build-memory-query";
import { scoreMemory, type WorkflowMemoryLike } from "./score-memory"
import { Prisma, prisma } from "@repo/db";

export type RetrieveRelevantMemoriesResult = {
    memories : RelevantMemory[],
    totalCandidates : number,
    writtenHitCount : number
}

type ScoredMemory = {
    memory : WorkflowMemoryLike,
    score : number;
    matchedOn : RelevantMemory["matchedOn"];
    retrievalReason : string;
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function buildCandidateWhere(
    query : BuildMemoryQuery,
) : Prisma.WorkflowMemoryWhereInput| null {
    const or: Prisma.WorkflowMemoryWhereInput[] = [];

    if(query.claimantId){
        or.push({
            entityType : "CLAIMANT",
            entityId : query.claimantId,
        });
    }

    if(query.policyId){
        or.push({
            entityType : "POLICY",
            entityId : query.policyId,
        });
    }

    if(query.vendorId){
        or.push({
            entityType : "VENDOR",
            entityId : query.vendorId,
        });
    }

    if(query.fieldPaths.length > 0){
        or.push({
            fieldPath : {
                in : query.fieldPaths
            }
        });
    }

    if(or.length === 0){
        return null;
    }

    return {
        status : {
            in : ["ACTIVE","STRENGTHENED","WEAKENED"]
        },
        OR : or
    };
}

async function loadClaimStateFromRun(runId : string) : Promise<MemoryClaimState>{
    const run = await prisma.extractionRun.findUnique({
        where : {
            id : runId
        },
        select : {
            id : true,
            status : true,
            extractedJson : true,
            validationJson : true,
            missingFieldsJson : true,
            reviewTask : {
                select : {
                    status : true
                }
            },
            coverageQuestions : {
                orderBy : {
                    createdAt : "desc"
                },
                take : 1,
                select : {
                    retrievalStatus : true,
                    finalDecision : true,
                }
            }
        }
    });

    if(!run){
        throw new Error(`Extraction run not found ${runId}`);
    }

    const latestCoverageQuestion = run.coverageQuestions[0] ?? null;

    return MemoryClaimStateSchema.parse({
        runId: run.id,
        runStatus: run.status,
        extractedJson: run.extractedJson,
        validationJson: run.validationJson,
        missingFields: getStringArray(run.missingFieldsJson),
        requiredEvidence: [],
        reviewTaskStatus: run.reviewTask?.status ?? null,
        retrievalStatus: latestCoverageQuestion?.retrievalStatus ?? null,
        policyDecision: latestCoverageQuestion?.finalDecision ?? null,
    });
}

function toRelevantMemory(input : {
    scored : ScoredMemory,
    memoryHitId : string | null;
}) : RelevantMemory {
    const { memory, score, matchedOn, retrievalReason } = input.scored;
    return RelevantMemorySchema.parse({
        memoryId: memory.id,
        memoryHitId: input.memoryHitId,
        kind: memory.kind,
        status: memory.status,
        riskLevel: memory.riskLevel,
        confidence: memory.confidence,
        score,
        summary: memory.summary,
        safeUse: memory.safeUse,
        mustNotDo: getStringArray(memory.mustNotDo),
        entityType: memory.entityType,
        entityId: memory.entityId,
        fieldPath: memory.fieldPath,
        matchedOn,
        retrievalReason,
    });
}

async function writeMemoryHits(input : {
    runId : string,
    scoredMemories : ScoredMemory[]
}): Promise<Map<string,string>> {
    const hitIdsByMemoryId = new Map<string, string>();

    await prisma.$transaction(async (tx) => {
        for(const scored of input.scoredMemories){
            const hit = await tx.memoryHit.create({
                data : {
                    memoryId : scored.memory.id,
                    runId : input.runId,
                    score : scored.score,
                    matchedOn: toPrismaJson(scored.matchedOn),
                    retrievalReason: scored.retrievalReason,
                    usedByAgent: false,
                }
            });

            await tx.workflowMemory.update({
                where : {
                    id : scored.memory.id
                },
                data : {
                    lastUsedAt : new Date()
                }
            });

            hitIdsByMemoryId.set(scored.memory.id,hit.id);
        }
    })
    return hitIdsByMemoryId;
}

export async function retrieveRelevantMemories(input: {
  runId?: string;
  claimState?: MemoryClaimState | unknown;
  limit?: number;
  writeHits?: boolean;
}): Promise<RetrieveRelevantMemoriesResult> {
  const claimState = input.runId
    ? await loadClaimStateFromRun(input.runId)
    : MemoryClaimStateSchema.parse(input.claimState ?? {});

  const query = buildMemoryQuery({
    runId: input.runId ?? claimState.runId ?? null,
    claimState,
    canWriteHits: Boolean(input.runId && input.writeHits),
  });

  const where = buildCandidateWhere(query);

  if (!where) {
    return {
      memories: [],
      totalCandidates: 0,
      writtenHitCount: 0,
    };
  }

  const candidates = await prisma.workflowMemory.findMany({
    where,
    orderBy: [
      {
        updatedAt: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
    take: 100,
  });

  const scored = candidates
    .map((memory) => {
      const score = scoreMemory({
        memory,
        query,
      });

      return {
        memory,
        ...score,
      };
    })
    .filter((item) => item.isEligible)
    .sort((left, right) => right.score - left.score)
    .slice(0, input.limit ?? 5)
    .map(
      (item): ScoredMemory => ({
        memory: item.memory,
        score: item.score,
        matchedOn: item.matchedOn,
        retrievalReason: item.retrievalReason,
      }),
    );

  const shouldWriteHits = Boolean(input.writeHits && input.runId);
  const hitIdsByMemoryId = shouldWriteHits
    ? await writeMemoryHits({
        runId: input.runId!,
        scoredMemories: scored,
      })
    : new Map<string, string>();

  return {
    memories: scored.map((item) =>
      toRelevantMemory({
        scored: item,
        memoryHitId: hitIdsByMemoryId.get(item.memory.id) ?? null,
      }),
    ),
    totalCandidates: candidates.length,
    writtenHitCount: hitIdsByMemoryId.size,
  };
}

