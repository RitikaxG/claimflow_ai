"use client";

import axios from "axios";
import { useMemo, useState } from "react";

type CoverageDecision =
  | "COVERED"
  | "NOT_COVERED"
  | "PARTIALLY_COVERED"
  | "NEEDS_REVIEW";

type RetrievalStatus = "ENOUGH_EVIDENCE" | "INSUFFICIENT_EVIDENCE";

type CoverageCitation = {
  clauseId: string;
  chunkId: string;
  quote: string;
  relevance: string;
};

type CoverageRetrievedMatch = {
  chunkId: string;
  policyDocumentId: string;
  policyTitle: string;
  clauseId: string | null;
  sectionTitle: string | null;
  text: string;
  similarity: number;
  bestIntent?: string;
  matchedQueries?: Array<{
    intent: string;
    query: string;
    similarity: number;
  }>;
};

type CoverageQueryPlanItem = {
  intent: string;
  query: string;
  topK: number;
};

type CoverageAnswerResponse = {
  coverageQuestionId: string;
  reused?: boolean;
  decision: CoverageDecision;
  answer: string;
  citedClauses: CoverageCitation[];
  missingEvidence: string[];
  confidence: number;
  retrievalStatus: RetrievalStatus;
  retrievalReason: string;
  queryPlan: CoverageQueryPlanItem[];
  matches: CoverageRetrievedMatch[];
  guardrailReasons: string[];
  forcedNeedsReview: boolean;
  model?: string;
  promptVersion?: string;
};

type CoverageAssistantCardProps = {
  runId: string;
  status: string;
};

type ApiErrorResponse = {
  error?: string;
};

const DEFAULT_QUESTION = "Is this claim covered under the policy?";

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.error ?? error.message ?? fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function getDecisionBadgeClass(decision: CoverageDecision) {
  switch (decision) {
    case "COVERED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "NOT_COVERED":
      return "border-red-200 bg-red-50 text-red-700";
    case "PARTIALLY_COVERED":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "NEEDS_REVIEW":
      return "border-yellow-200 bg-yellow-50 text-yellow-800";
    default:
      return "border-gray-200 bg-gray-50 text-gray-700";
  }
}

function getRetrievalBadgeClass(status: RetrievalStatus) {
  if (status === "ENOUGH_EVIDENCE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-yellow-200 bg-yellow-50 text-yellow-800";
}

function formatSimilarity(value: number) {
  return value.toFixed(4);
}

function formatConfidence(value: number) {
  return `${Math.round(value * 100)}%`;
}

function truncateText(value: string, maxLength = 520) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trim()}...`;
}

function getCitedChunkIds(result: CoverageAnswerResponse) {
  return new Set(result.citedClauses.map((citation) => citation.chunkId));
}

function getPrimaryEvidenceMatches(result: CoverageAnswerResponse) {
  const citedChunkIds = getCitedChunkIds(result);

  const citedMatches = result.matches.filter((match) =>
    citedChunkIds.has(match.chunkId),
  );

  const strongUncitedMatches = result.matches.filter((match) => {
    if (citedChunkIds.has(match.chunkId)) {
      return false;
    }

    return match.similarity >= 0.72;
  });

  return [...citedMatches, ...strongUncitedMatches].slice(0, 4);
}

function canAskCoverage(status: string) {
  return status === "COMPLETED" || status === "NEEDS_REVIEW";
}

export function CoverageAssistantCard({
  runId,
  status,
}: CoverageAssistantCardProps) {
  const [question, setQuestion] = useState(DEFAULT_QUESTION);
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CoverageAnswerResponse | null>(null);
  const [showFullRetrievalTrace, setShowFullRetrievalTrace] = useState(false);
  const [showQueryPlan, setShowQueryPlan] = useState(false);

  const isDisabled = useMemo(() => {
    return isAsking || question.trim().length < 5 || !canAskCoverage(status);
  }, [isAsking, question, status]);

  async function askCoverageQuestion() {
    const trimmedQuestion = question.trim();

    if (trimmedQuestion.length < 5) {
      setError("Question must be at least 5 characters.");
      return;
    }

    setIsAsking(true);
    setError(null);

    try {
      const res = await axios.post<CoverageAnswerResponse>(
        `/api/extraction-runs/${runId}/coverage-answer`,
        {
          question: trimmedQuestion,
        },
      );

      setResult(res.data);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to generate coverage answer."));
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 border-b border-gray-100 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Ask Coverage Question
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Ask a claim-specific coverage question. The answer must be grounded in
              retrieved policy clauses and the current run context.
            </p>
          </div>

          <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
            Week 3 RAG
          </span>
        </div>

        {!canAskCoverage(status) ? (
          <div className="rounded-xl border border-yellow-100 bg-yellow-50 p-3 text-sm text-yellow-800">
            Coverage answering is available after extraction + validation.
            Current run status: <span className="font-semibold">{status}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Coverage question
        </label>

        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          rows={3}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 outline-none ring-0 placeholder:text-gray-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          placeholder="Is this claim covered under the policy?"
          disabled={isAsking || !canAskCoverage(status)}
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void askCoverageQuestion()}
            disabled={isDisabled}
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isAsking ? "Asking..." : "Ask coverage"}
          </button>

          {result ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span>
                Saved as coverage question:{" "}
                <span className="font-mono">{result.coverageQuestionId}</span>
              </span>

              {result.reused ? (
                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600">
                  Reused saved answer
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      {result ? (
    <div className="mt-6 space-y-5">
        <section className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
            <h3 className="text-base font-semibold text-gray-900">
                Coverage Assessment
            </h3>
            <p className="mt-1 text-sm text-gray-500">
                Policy-grounded assessment generated from retrieved clauses. Final approval or
                rejection remains with human review.
            </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
            <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${getDecisionBadgeClass(
                result.decision,
                )}`}
            >
                {result.decision}
            </span>

            <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${getRetrievalBadgeClass(
                result.retrievalStatus,
                )}`}
            >
                {result.retrievalStatus}
            </span>

            <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600">
                Confidence: {formatConfidence(result.confidence)}
            </span>
            </div>
        </div>

        {result.forcedNeedsReview ? (
            <div className="mt-4 rounded-xl border border-yellow-100 bg-yellow-50 p-3 text-sm text-yellow-800">
            This answer was forced to <strong>NEEDS_REVIEW</strong> by a
            guardrail because the system could not fully trust the generated
            decision.
            </div>
        ) : null}

        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-800">
            {result.answer}
        </p>

        {result.missingEvidence.length > 0 ? (
            <div className="mt-4 rounded-xl border border-yellow-100 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Missing / required evidence
            </p>

            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                {result.missingEvidence.map((item) => (
                <li key={item}>{item}</li>
                ))}
            </ul>
            </div>
        ) : null}
        </section>

        <section className="rounded-2xl border border-gray-100 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
            <h3 className="text-base font-semibold text-gray-900">
                Policy Evidence Used
            </h3>
            <p className="mt-1 text-sm text-gray-500">
                These are the exact clauses cited by the coverage answer.
            </p>
            </div>

            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600">
            {result.citedClauses.length} citation
            {result.citedClauses.length === 1 ? "" : "s"}
            </span>
        </div>

        {result.citedClauses.length === 0 ? (
            <div className="mt-4 rounded-xl border border-yellow-100 bg-yellow-50 p-3 text-sm text-yellow-800">
            No valid citations were returned. This usually means the answer was
            forced to NEEDS_REVIEW or retrieval evidence was insufficient.
            </div>
        ) : (
            <div className="mt-4 space-y-3">
            {result.citedClauses.map((citation) => (
                <article
                key={`${citation.chunkId}-${citation.clauseId}`}
                className="rounded-xl border border-gray-100 bg-white p-4"
                >
                <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-gray-900 px-2.5 py-1 text-xs font-semibold text-white">
                    {citation.clauseId}
                    </span>

                    <span className="font-mono text-xs text-gray-500">
                    {citation.chunkId}
                    </span>
                </div>

                <blockquote className="mt-3 border-l-4 border-gray-200 pl-3 text-sm leading-6 text-gray-700">
                    “{citation.quote}”
                </blockquote>

                <p className="mt-3 text-sm text-gray-600">
                    <span className="font-medium text-gray-800">Relevance:</span>{" "}
                    {citation.relevance}
                </p>
                </article>
            ))}
            </div>
        )}
        </section>

        <section className="rounded-2xl border border-gray-100 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
            <h3 className="text-base font-semibold text-gray-900">
                Supporting Retrieval Trace
            </h3>
            <p className="mt-1 text-sm text-gray-500">
                Showing the most relevant retrieved chunks only. Full trace is
                available for debugging.
            </p>
            </div>

            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600">
            {result.matches.length} total retrieved
            </span>
        </div>

        <p className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
            {result.retrievalReason}
        </p>

        <div className="mt-4 space-y-3">
            {getPrimaryEvidenceMatches(result).map((match) => {
            const wasCited = result.citedClauses.some(
                (citation) => citation.chunkId === match.chunkId,
            );

            return (
                <article
                key={match.chunkId}
                className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                >
                <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-800">
                    {match.clauseId ?? "NO_CLAUSE_ID"}
                    </span>

                    <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600">
                    similarity {formatSimilarity(match.similarity)}
                    </span>

                    {match.bestIntent ? (
                    <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700">
                        {match.bestIntent}
                    </span>
                    ) : null}

                    {wasCited ? (
                    <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        cited
                    </span>
                    ) : null}
                </div>

                <p className="mt-3 text-sm font-semibold text-gray-900">
                    {match.sectionTitle ?? "Untitled section"}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                    Source: {match.policyTitle}
                </p>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                    {truncateText(match.text, 360)}
                </p>
                </article>
            );
            })}
        </div>

        {result.matches.length > getPrimaryEvidenceMatches(result).length ? (
            <button
            type="button"
            onClick={() => setShowFullRetrievalTrace((value) => !value)}
            className="mt-4 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
            {showFullRetrievalTrace
                ? "Hide full retrieval trace"
                : `Show full retrieval trace (${result.matches.length} chunks)`}
            </button>
        ) : null}

        {showFullRetrievalTrace ? (
            <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
            {result.matches.map((match, index) => (
                <article
                key={`${match.chunkId}-full-${index}`}
                className="rounded-xl border border-gray-100 bg-white p-4"
                >
                <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-gray-900 px-2.5 py-1 text-xs font-semibold text-white">
                    #{index + 1}
                    </span>

                    <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-800">
                    {match.clauseId ?? "NO_CLAUSE_ID"}
                    </span>

                    <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600">
                    similarity {formatSimilarity(match.similarity)}
                    </span>

                    {match.bestIntent ? (
                    <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700">
                        {match.bestIntent}
                    </span>
                    ) : null}
                </div>

                <p className="mt-3 text-sm font-semibold text-gray-900">
                    {match.sectionTitle ?? "Untitled section"}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                    Source: {match.policyTitle}
                </p>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                    {truncateText(match.text, 420)}
                </p>
                </article>
            ))}
            </div>
        ) : null}
        </section>

        {result.guardrailReasons.length > 0 ? (
        <section className="rounded-2xl border border-yellow-100 bg-yellow-50 p-5">
            <h3 className="text-base font-semibold text-yellow-900">
            Guardrail Checks
            </h3>

            <p className="mt-1 text-sm text-yellow-800">
            These checks explain why the answer may have been forced to
            NEEDS_REVIEW.
            </p>

            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-yellow-800">
            {result.guardrailReasons.map((reason) => (
                <li key={reason}>{reason}</li>
            ))}
            </ul>
        </section>
        ) : null}

        <section className="rounded-2xl border border-gray-100 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
            <h3 className="text-base font-semibold text-gray-900">
                Debug Query Plan
            </h3>
            <p className="mt-1 text-sm text-gray-500">
                Internal retrieval queries generated from the question and claim
                context.
            </p>
            </div>

            <button
            type="button"
            onClick={() => setShowQueryPlan((value) => !value)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
            {showQueryPlan ? "Hide query plan" : "Show query plan"}
            </button>
        </div>

        {showQueryPlan ? (
            <div className="mt-4 space-y-3">
            {result.queryPlan.map((item, index) => (
                <div
                key={`${item.intent}-${index}`}
                className="rounded-xl bg-gray-50 p-4"
                >
                <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-gray-900 px-2.5 py-1 text-xs font-semibold text-white">
                    {item.intent}
                    </span>

                    <span className="text-xs text-gray-500">
                    topK: {item.topK}
                    </span>
                </div>

                <p className="mt-2 text-sm text-gray-700">{item.query}</p>
                </div>
            ))}
            </div>
        ) : null}
        </section>

        {result.model || result.promptVersion ? (
        <div className="text-xs text-gray-400">
            {result.model ? <span>Model: {result.model}</span> : null}
            {result.model && result.promptVersion ? <span> · </span> : null}
            {result.promptVersion ? (
            <span>Prompt: {result.promptVersion}</span>
            ) : null}
        </div>
        ) : null}
    </div>
    ) : null}
    </section>
  );
}