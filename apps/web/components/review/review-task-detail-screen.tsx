"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  useDashboardStore,
  type ReviewTaskRecord,
} from "../../store/use-dashboard-store";
import { ReviewTaskStatusBadge } from "./review-task-status-badge";
import { RunStatusBadge } from "../dashboard/run-status-badge";

type ReviewTaskDetailScreenProps = {
  taskId: string;
};

type ReviewIssueView = {
  field?: string;
  message?: string;
  severity?: string;
  ruleId?: string;
};

type ReviewReasonView = {
  missingFields?: string[];
  conflicts?: ReviewIssueView[];
  warnings?: ReviewIssueView[];
  requiredEvidence?: string[];
  sourceFinalStatus?: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function prettyJson(value: unknown) {
  return JSON.stringify(value ?? null, null, 2);
}

function getReason(reasonJson: unknown): ReviewReasonView {
  if (typeof reasonJson !== "object" || reasonJson === null) {
    return {};
  }

  return reasonJson as ReviewReasonView;
}

function isTerminalReviewStatus(status: ReviewTaskRecord["status"]) {
  return (
    status === "APPROVED" ||
    status === "EDITED_AND_APPROVED" ||
    status === "REJECTED" ||
    status === "NEEDS_MORE_INFO"
  );
}

function JsonPanel({
  title,
  value,
}: {
  title: string;
  value: unknown;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-950">{title}</h2>

      <pre className="mt-4 max-h-[520px] overflow-auto rounded-xl bg-gray-950 p-4 text-xs text-gray-100">
        {prettyJson(value)}
      </pre>
    </section>
  );
}

function ReviewReasonCard({ task }: { task: ReviewTaskRecord }) {
  const reason = useMemo(() => getReason(task.reasonJson), [task.reasonJson]);

  const missingFields = Array.isArray(reason.missingFields)
    ? reason.missingFields
    : [];

  const conflicts = Array.isArray(reason.conflicts) ? reason.conflicts : [];
  const warnings = Array.isArray(reason.warnings) ? reason.warnings : [];

  const requiredEvidence = Array.isArray(reason.requiredEvidence)
    ? reason.requiredEvidence
    : [];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-950">Review reasons</h2>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-gray-950">
            Missing fields
          </h3>

          {missingFields.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
              {missingFields.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-gray-500">No missing fields.</p>
          )}
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-gray-950">
            Required evidence
          </h3>

          {requiredEvidence.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
              {requiredEvidence.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-gray-500">No required evidence.</p>
          )}
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-gray-950">Conflicts</h3>

          {conflicts.length > 0 ? (
            <div className="mt-2 space-y-2">
              {conflicts.map((conflict, index) => (
                <div
                  key={`${conflict.ruleId ?? "conflict"}-${index}`}
                  className="rounded-lg border border-red-100 bg-white p-3"
                >
                  <p className="text-sm font-medium text-red-700">
                    {conflict.field ?? "Unknown field"}
                  </p>
                  <p className="mt-1 text-sm text-gray-700">
                    {conflict.message ?? "No message provided."}
                  </p>
                  {conflict.ruleId ? (
                    <p className="mt-1 text-xs text-gray-500">
                      Rule: {conflict.ruleId}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-500">No conflicts.</p>
          )}
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-gray-950">Warnings</h3>

          {warnings.length > 0 ? (
            <div className="mt-2 space-y-2">
              {warnings.map((warning, index) => (
                <div
                  key={`${warning.ruleId ?? "warning"}-${index}`}
                  className="rounded-lg border border-yellow-100 bg-white p-3"
                >
                  <p className="text-sm font-medium text-yellow-700">
                    {warning.field ?? "Unknown field"}
                  </p>
                  <p className="mt-1 text-sm text-gray-700">
                    {warning.message ?? "No message provided."}
                  </p>
                  {warning.ruleId ? (
                    <p className="mt-1 text-xs text-gray-500">
                      Rule: {warning.ruleId}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-500">No warnings.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function TimelineCard({
  title,
  items,
}: {
  title: string;
  items: {
    id: string;
    type: string;
    message: string;
    createdAt: string;
  }[];
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-950">{title}</h2>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">No events yet.</p>
        ) : (
          items.map((event) => (
            <div
              key={event.id}
              className="rounded-xl border border-gray-100 bg-gray-50 p-3"
            >
              <p className="text-sm font-medium text-gray-950">
                {event.type.replaceAll("_", " ")}
              </p>
              <p className="mt-1 text-sm text-gray-600">{event.message}</p>
              <p className="mt-1 text-xs text-gray-500">
                {formatDate(event.createdAt)}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function DecisionPanel({ task }: { task: ReviewTaskRecord }) {
  const [reviewerName, setReviewerName] = useState("");
  const [approveNotes, setApproveNotes] = useState("");
  const [rejectNotes, setRejectNotes] = useState("");
  const [moreInfoNotes, setMoreInfoNotes] = useState("");

  const [editApproveNotes, setEditApproveNotes] = useState("");
  const [correctedJsonText, setCorrectedJsonText] = useState("");
  const [correctedJsonError, setCorrectedJsonError] = useState<string | null>(
    null,
  );

  const actionInFlight = useDashboardStore(
    (state) => state.reviewTaskActionInFlight,
  );

  const startReviewTask = useDashboardStore((state) => state.startReviewTask);
  const approveReviewTask = useDashboardStore((state) => state.approveReviewTask);
  const rejectReviewTask = useDashboardStore((state) => state.rejectReviewTask);

  const requestMoreInfoReviewTask = useDashboardStore(
    (state) => state.requestMoreInfoReviewTask,
  );

  const editAndApproveReviewTask = useDashboardStore(
    (state) => state.editAndApproveReviewTask,
  );

  const isBusy = actionInFlight !== null;

  useEffect(() => {
    if (task.status !== "IN_REVIEW") {
      return;
    }

    setCorrectedJsonText(JSON.stringify(task.run.extractedJson ?? {}, null, 2));
    setCorrectedJsonError(null);
  }, [task.id, task.status, task.run.extractedJson]);

  const handleStart = () => {
    void startReviewTask(task.id);
  };

  const handleApprove = () => {
    void approveReviewTask(task.id, {
      reviewerName,
      notes: approveNotes,
    });
  };

  const handleEditAndApprove = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const correctedJson = JSON.parse(correctedJsonText);

      setCorrectedJsonError(null);

      void editAndApproveReviewTask(task.id, {
        correctedJson,
        reviewerName,
        notes: editApproveNotes,
      });
    } catch {
      setCorrectedJsonError(
        "Corrected JSON is not valid JSON. Fix the syntax and try again.",
      );
    }
  };

  const handleReject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    void rejectReviewTask(task.id, {
      reviewerName,
      notes: rejectNotes,
    });
  };

  const handleRequestMoreInfo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    void requestMoreInfoReviewTask(task.id, {
      reviewerName,
      notes: moreInfoNotes,
    });
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-950">Decision panel</h2>

      <p className="mt-1 text-sm text-gray-600">
        Start review first, then approve, edit and approve, reject, or request
        more information.
      </p>

      {task.status === "PENDING" ? (
        <button
          type="button"
          disabled={isBusy}
          onClick={handleStart}
          className="mt-4 rounded-lg bg-gray-950 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {actionInFlight === "start" ? "Starting..." : "Start review"}
        </button>
      ) : null}

      {task.status === "IN_REVIEW" ? (
        <div className="mt-4 space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Reviewer name
            </span>
            <input
              value={reviewerName}
              onChange={(event) => setReviewerName(event.target.value)}
              placeholder="Ritika"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-950 placeholder:text-gray-400 outline-none focus:border-gray-400"
            />
          </label>

          <div className="rounded-xl border border-green-100 bg-green-50 p-4">
            <h3 className="text-sm font-semibold text-green-800">
              Approve as-is
            </h3>

            <p className="mt-1 text-sm text-green-700">
              Use this when the extracted JSON is acceptable without edits.
            </p>

            <textarea
              value={approveNotes}
              onChange={(event) => setApproveNotes(event.target.value)}
              placeholder="Optional approval notes..."
              className="mt-3 min-h-20 w-full rounded-lg border border-green-200 bg-white px-3 py-2 text-sm text-gray-950 placeholder:text-gray-400 outline-none focus:border-green-400"
            />

            <button
              type="button"
              disabled={isBusy}
              onClick={handleApprove}
              className="mt-3 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {actionInFlight === "approve" ? "Approving..." : "Approve as-is"}
            </button>
          </div>

          <form
            onSubmit={handleEditAndApprove}
            className="rounded-xl border border-blue-100 bg-blue-50 p-4"
          >
            <h3 className="text-sm font-semibold text-blue-800">
              Edit and approve
            </h3>

            <p className="mt-1 text-sm text-blue-700">
              Edit the extracted JSON below. The original AI output stays
              unchanged; your correction is stored as a review decision.
            </p>

            <textarea
              value={correctedJsonText}
              onChange={(event) => {
                setCorrectedJsonText(event.target.value);
                setCorrectedJsonError(null);
              }}
              spellCheck={false}
              className="mt-3 min-h-[420px] w-full rounded-lg border border-blue-200 bg-white px-3 py-2 font-mono text-xs text-gray-950 placeholder:text-gray-400 outline-none focus:border-blue-400"
            />

            {correctedJsonError ? (
              <div className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                {correctedJsonError}
              </div>
            ) : null}

            <textarea
              value={editApproveNotes}
              onChange={(event) => setEditApproveNotes(event.target.value)}
              placeholder="Optional correction notes..."
              className="mt-3 min-h-20 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-gray-950 placeholder:text-gray-400 outline-none focus:border-blue-400"
            />

            <button
              type="submit"
              disabled={isBusy}
              className="mt-3 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {actionInFlight === "edit_and_approve"
                ? "Saving correction..."
                : "Edit & approve"}
            </button>
          </form>

          <form
            onSubmit={handleReject}
            className="rounded-xl border border-red-100 bg-red-50 p-4"
          >
            <h3 className="text-sm font-semibold text-red-800">Reject</h3>

            <p className="mt-1 text-sm text-red-700">
              Reject when the extraction cannot be accepted. Notes are required.
            </p>

            <textarea
              required
              value={rejectNotes}
              onChange={(event) => setRejectNotes(event.target.value)}
              placeholder="Explain why this extraction is rejected..."
              className="mt-3 min-h-24 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-gray-950 placeholder:text-gray-400 outline-none focus:border-red-400"
            />

            <button
              type="submit"
              disabled={isBusy}
              className="mt-3 rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {actionInFlight === "reject" ? "Rejecting..." : "Reject"}
            </button>
          </form>

          <form
            onSubmit={handleRequestMoreInfo}
            className="rounded-xl border border-orange-100 bg-orange-50 p-4"
          >
            <h3 className="text-sm font-semibold text-orange-800">
              Request more info
            </h3>

            <p className="mt-1 text-sm text-orange-700">
              Use this when the claim needs missing evidence or clarification.
              Notes are required.
            </p>

            <textarea
              required
              value={moreInfoNotes}
              onChange={(event) => setMoreInfoNotes(event.target.value)}
              placeholder="Example: Please provide FIR number and police report."
              className="mt-3 min-h-24 w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm text-gray-950 placeholder:text-gray-400 outline-none focus:border-orange-400"
            />

            <button
              type="submit"
              disabled={isBusy}
              className="mt-3 rounded-lg bg-orange-700 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {actionInFlight === "request_more_info"
                ? "Requesting..."
                : "Request more info"}
            </button>
          </form>
        </div>
      ) : null}

      {isTerminalReviewStatus(task.status) ? (
        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-950">
            This review task is completed.
          </p>

          {task.decisions[0] ? (
            <div className="mt-3 text-sm text-gray-700">
              <p>
                Latest decision:{" "}
                <span className="font-semibold">
                  {task.decisions[0].decision.replaceAll("_", " ")}
                </span>
              </p>

              {task.decisions[0].reviewerName ? (
                <p className="mt-1">
                  Reviewer: {task.decisions[0].reviewerName}
                </p>
              ) : null}

              {task.decisions[0].notes ? (
                <p className="mt-1">Notes: {task.decisions[0].notes}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function ReviewTaskDetailScreen({ taskId }: ReviewTaskDetailScreenProps) {
  const selectedReviewTask = useDashboardStore(
    (state) => state.selectedReviewTask,
  );

  const isFetchingReviewTask = useDashboardStore(
    (state) => state.isFetchingReviewTask,
  );

  const error = useDashboardStore((state) => state.error);
  const successMessage = useDashboardStore((state) => state.successMessage);
  const fetchReviewTask = useDashboardStore((state) => state.fetchReviewTask);

  useEffect(() => {
    void fetchReviewTask(taskId);
  }, [fetchReviewTask, taskId]);

  const task =
    selectedReviewTask && selectedReviewTask.id === taskId
      ? selectedReviewTask
      : null;

  const latestDecision = task?.decisions[0] ?? null;

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-500">
              Week 2 Day 6 · Edit and Approve
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">
              Review Task
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Open a validation failure, inspect the AI output, correct the JSON,
              and store a human-reviewed decision.
            </p>
          </div>

          <nav className="flex flex-wrap gap-3 text-sm">
            <Link
              href="/review"
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Back to Review Queue
            </Link>

            {task ? (
              <Link
                href={`/runs/${task.run.id}`}
                className="rounded-lg bg-gray-950 px-4 py-2 font-medium text-white shadow-sm"
              >
                View Extraction Run
              </Link>
            ) : null}
          </nav>
        </header>

        {error ? (
          <div className="rounded-xl border border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-xl border border-green-100 bg-green-50 px-5 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        ) : null}

        {isFetchingReviewTask ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-500 shadow-sm">
            Loading review task...
          </div>
        ) : null}

        {!isFetchingReviewTask && !task ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-500 shadow-sm">
            Review task not found.
          </div>
        ) : null}

        {task ? (
          <>
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-950">
                    {task.run.document.filename}
                  </h2>

                  <div className="mt-3 grid gap-2 text-sm text-gray-600 md:grid-cols-2">
                    <p>Source type: {task.run.document.sourceType}</p>
                    <p>Priority: {task.priority}</p>
                    <p>Task created: {formatDate(task.createdAt)}</p>
                    <p>Run status: {task.run.status.replaceAll("_", " ")}</p>

                    {task.startedAt ? (
                      <p>Started: {formatDate(task.startedAt)}</p>
                    ) : null}

                    {task.completedAt ? (
                      <p>Completed: {formatDate(task.completedAt)}</p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <ReviewTaskStatusBadge status={task.status} />
                  <RunStatusBadge status={task.run.status} />
                </div>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
              <div className="space-y-6">
                <ReviewReasonCard task={task} />

                <JsonPanel
                  title="Original AI extracted JSON"
                  value={task.run.extractedJson}
                />

                {latestDecision?.correctedJson ? (
                  <JsonPanel
                    title="Final human-corrected JSON"
                    value={latestDecision.correctedJson}
                  />
                ) : null}

                <JsonPanel
                  title="Original AI validation JSON"
                  value={task.run.validationJson}
                />

                {latestDecision?.correctedValidationJson ? (
                  <JsonPanel
                    title="Corrected validation JSON"
                    value={latestDecision.correctedValidationJson}
                  />
                ) : null}
              </div>

              <div className="space-y-6">
                <DecisionPanel task={task} />

                <TimelineCard title="Review timeline" items={task.events} />

                <TimelineCard
                  title="AI Extraction timeline"
                  items={task.run.events}
                />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}