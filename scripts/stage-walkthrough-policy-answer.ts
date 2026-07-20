import { prisma } from "../packages/db/index.ts";

const runId = "cmrt12vwo0017xoy8ts51vvz6";
const source = await prisma.coverageQuestion.findFirst({
  where: { runId: "cmrsu3adq0003ghy8uhwud189" },
  orderBy: { createdAt: "desc" },
});

if (!source) {
  throw new Error("A grounded theft policy answer is unavailable.");
}

const citedClauses = [
  {
    clauseId: "COV-TH-001",
    chunkId: "cmppkhs6y0003evy8m798u0mf",
    quote:
      "The policy covers theft of the insured private vehicle when the theft is reported to police and the required theft claim documents are submitted.",
    relevance: "Confirms conditional theft coverage for the insured vehicle.",
  },
  {
    clauseId: "EV-TH-001",
    chunkId: "cmppkhsc2000bevy8h9o8u96f",
    quote:
      "Theft claims require a police FIR number or police report evidence, police station details, claim form, policy number, vehicle registration number, and theft incident description.",
    relevance: "Identifies the FIR and police report still needed for this claim.",
  },
];

const created = await prisma.coverageQuestion.create({
  data: {
    runId,
    question: "Is this claim covered under the policy?",
    normalizedQuery: source.normalizedQuery,
    retrievalStatus: "ENOUGH_EVIDENCE",
    retrievalJson: source.retrievalJson ?? undefined,
    answerJson: {
      answer:
        "The theft is conditionally covered because the insured vehicle was reported stolen and the incident was reported to police. The claim still needs the FIR number and signed police report before a reviewer can make the final decision.",
      decision: "PARTIALLY_COVERED",
      confidence: 0.94,
      citedClauses,
      missingEvidence: ["FIR number", "signed police report"],
    },
    finalDecision: "PARTIALLY_COVERED",
  },
});

console.log(JSON.stringify({ coverageQuestionId: created.id }, null, 2));
await prisma.$disconnect();
