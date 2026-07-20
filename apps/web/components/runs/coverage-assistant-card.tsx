"use client";

import axios from "axios";
import { useMemo, useState } from "react";

type CoverageDecision = "COVERED" | "NOT_COVERED" | "PARTIALLY_COVERED" | "NEEDS_REVIEW";
type RetrievalStatus = "ENOUGH_EVIDENCE" | "INSUFFICIENT_EVIDENCE";

type CoverageCitation = {
  clauseId: string;
  chunkId: string;
  quote: string;
  relevance: string;
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
  guardrailReasons: string[];
  forcedNeedsReview: boolean;
};

type ApiErrorResponse = { error?: string };

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.error ?? error.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

function canAskCoverage(status: string) {
  return status === "COMPLETED" || status === "NEEDS_REVIEW";
}

function decisionLabel(decision: CoverageDecision) {
  const labels: Record<CoverageDecision, string> = {
    COVERED: "Coverage supported",
    NOT_COVERED: "Coverage not supported",
    PARTIALLY_COVERED: "Partial coverage indicated",
    NEEDS_REVIEW: "Reviewer confirmation needed",
  };
  return labels[decision];
}

export function CoverageAssistantCard({ runId, status }: { runId: string; status: string }) {
  const [question, setQuestion] = useState("Is this claim covered under the policy?");
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CoverageAnswerResponse | null>(null);

  const disabled = useMemo(
    () => isAsking || question.trim().length < 5 || !canAskCoverage(status),
    [isAsking, question, status],
  );

  async function askCoverageQuestion() {
    const trimmedQuestion = question.trim();
    if (trimmedQuestion.length < 5) return;

    setIsAsking(true);
    setError(null);
    try {
      const response = await axios.post<CoverageAnswerResponse>(
        `/api/extraction-runs/${runId}/coverage-answer`,
        { question: trimmedQuestion },
      );
      setResult(response.data);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "ClaimFlow could not answer this policy question."));
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#123f3b]">Policy guidance</h2>
            <p className="mt-1 text-sm leading-6 text-[#667571]">
              Ask a question about this claim. ClaimFlow answers only from relevant policy evidence.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-lg bg-[#dcefea] px-3 py-1.5 text-xs font-semibold text-[#155e57]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0f766e]" /> Policy-grounded
          </span>
        </div>

        {!canAskCoverage(status) ? (
          <div className="mt-4 rounded-xl border border-[#ecd3a9] bg-[#fffaf0] px-4 py-3 text-sm text-[#674617]">
            Policy guidance becomes available after ClaimFlow finishes preparing the claim.
          </div>
        ) : null}

        <label htmlFor="coverage-question" className="mt-5 block text-sm font-semibold text-[#20302e]">
          Ask about this claim
        </label>
        <textarea
          id="coverage-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          rows={3}
          disabled={isAsking || !canAskCoverage(status)}
          className="mt-2 w-full resize-y rounded-xl border border-[#dfe8e3] bg-[#fbfaf6] px-4 py-3 text-sm leading-6 text-[#20302e] outline-none transition placeholder:text-[#98a29f] focus:border-[#0f766e] focus:ring-4 focus:ring-[#dcefea] disabled:cursor-not-allowed disabled:opacity-60"
          placeholder="Ask a coverage or evidence question"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void askCoverageQuestion()}
            disabled={disabled}
            className="rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#155e57] disabled:cursor-not-allowed disabled:bg-[#9bb8b1]"
          >
            {isAsking ? "Checking the policy…" : "Ask ClaimFlow"}
          </button>
          <p className="text-xs text-[#667571]">Final claim decisions always remain with a reviewer.</p>
        </div>
        {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
      </div>

      {result ? (
        <div className="space-y-5 border-t border-[#dfe8e3] pt-5">
          <section className="rounded-2xl border border-[#b9dfd3] bg-[#eef8f5] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#155e57] ring-1 ring-[#b9dfd3]">
                {decisionLabel(result.decision)}
              </span>
              <span className="text-xs font-semibold text-[#4e7d75]">
                {result.citedClauses.length} supporting {result.citedClauses.length === 1 ? "clause" : "clauses"}
              </span>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#20302e]">{result.answer}</p>
            {result.forcedNeedsReview || result.retrievalStatus === "INSUFFICIENT_EVIDENCE" ? (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-white px-4 py-3 text-sm leading-6 text-[#674617] ring-1 ring-[#ecd3a9]">
                ClaimFlow paused for reviewer confirmation because the available policy evidence was not sufficient for a reliable conclusion.
              </p>
            ) : null}
          </section>

          {result.citedClauses.length ? (
            <section>
              <h3 className="text-sm font-semibold text-[#123f3b]">Supporting policy clauses</h3>
              <div className="mt-3 divide-y divide-[#dfe8e3] border-y border-[#dfe8e3]">
                {result.citedClauses.map((citation) => (
                  <article key={`${citation.chunkId}-${citation.clauseId}`} className="py-4">
                    <p className="text-sm font-semibold text-[#20302e]">{citation.clauseId}</p>
                    <blockquote className="mt-2 border-l-2 border-[#85d9c8] pl-3 text-sm leading-6 text-[#667571]">
                      “{citation.quote}”
                    </blockquote>
                    <p className="mt-2 text-xs leading-5 text-[#4e7d75]">{citation.relevance}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {result.missingEvidence.length ? (
            <section className="rounded-xl border border-[#ecd3a9] bg-[#fffaf0] p-4">
              <h3 className="text-sm font-semibold text-[#674617]">Evidence still needed</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-[#674617]">
                {result.missingEvidence.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
          ) : null}

          {result.guardrailReasons.length ? (
            <section>
              <h3 className="text-sm font-semibold text-[#123f3b]">Why ClaimFlow limited the answer</h3>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-[#667571]">
                {result.guardrailReasons.map((reason) => <li key={reason}>• {reason}</li>)}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
