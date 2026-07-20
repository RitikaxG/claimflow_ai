"use client";

import axios from "axios";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { UserAccountControl } from "../auth/user-account-control";

type QualityTab = "overview" | "checks" | "cases" | "activity";

type EvalCase = {
  id: string;
  caseId: string;
  status: string;
  score: number | null;
  failureReason: string | null;
  metadataJson: unknown;
};

type EvalRun = {
  id: string;
  suite: string;
  label: string | null;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  warningCases: number;
  passRate: number;
  metricsJson: unknown;
  createdAt: string;
  cases: EvalCase[];
};

type EvalRunResponse = { evalRun: EvalRun };

type IconName =
  | "activity"
  | "bell"
  | "book"
  | "brain"
  | "check"
  | "chevron-left"
  | "chevron-right"
  | "file"
  | "history"
  | "inbox"
  | "menu"
  | "search"
  | "shield"
  | "sparkles"
  | "user"
  | "warning";

type SuiteProfile = {
  title: string;
  description: string;
  capability: string;
  assurance: Array<{ title: string; detail: string; icon: IconName }>;
};

const SUITE_PROFILES: Record<string, SuiteProfile> = {
  WEEK1_EXTRACTION: {
    title: "Claim intake and preparation quality",
    description:
      "How reliably claim sources become complete, reviewable facts.",
    capability: "Intake and preparation",
    assurance: [
      {
        title: "Claim facts checked",
        detail: "Expected claim details are compared with prepared facts.",
        icon: "file",
      },
      {
        title: "Missing information surfaced",
        detail: "Incomplete claims remain visible for human attention.",
        icon: "warning",
      },
      {
        title: "Human review retained",
        detail: "Quality results support reviewers and never decide a claim.",
        icon: "user",
      },
    ],
  },
  WEEK2_REVIEW: {
    title: "Human review workflow quality",
    description:
      "How reliably incomplete or risky claims reach the right reviewer outcome.",
    capability: "Human review workflow",
    assurance: [
      {
        title: "Review routing checked",
        detail:
          "Claims needing attention are expected to reach the review queue.",
        icon: "inbox",
      },
      {
        title: "Decision states checked",
        detail: "Approved, edited and rejected outcomes remain explicit.",
        icon: "check",
      },
      {
        title: "Human decision required",
        detail: "The workflow preserves reviewer ownership of every decision.",
        icon: "user",
      },
    ],
  },
  WEEK3_RAG: {
    title: "Policy guidance quality",
    description:
      "How reliably policy answers stay grounded in supporting evidence.",
    capability: "Policy guidance",
    assurance: [
      {
        title: "Evidence grounding checked",
        detail: "Answers are expected to use relevant supporting clauses.",
        icon: "book",
      },
      {
        title: "Unsupported answers guarded",
        detail: "Unclear coverage should be refused or routed for review.",
        icon: "shield",
      },
      {
        title: "Reviewer context preserved",
        detail: "Policy guidance supports rather than replaces human judgment.",
        icon: "user",
      },
    ],
  },
  WEEK4_AGENT: {
    title: "Guarded AI assistance quality",
    description:
      "How reliably ClaimFlow recommends safe, reviewable next steps.",
    capability: "Guarded AI assistance",
    assurance: [
      {
        title: "Guardrails active",
        detail:
          "Unsafe or unsupported workflow actions are expected to remain blocked.",
        icon: "shield",
      },
      {
        title: "Allowed actions checked",
        detail: "Assistance is limited to approved workflow tools.",
        icon: "sparkles",
      },
      {
        title: "Human approval required",
        detail:
          "ClaimFlow may prepare work but cannot send or decide it alone.",
        icon: "user",
      },
    ],
  },
  WEEK5_MEMORY: {
    title: "Similar-claim guidance quality",
    description:
      "How safely past reviewed outcomes guide the current workflow.",
    capability: "Similar-claim guidance",
    assurance: [
      {
        title: "Relevant guidance checked",
        detail:
          "Retrieved workflow memory is expected to match the current need.",
        icon: "brain",
      },
      {
        title: "Evidence boundary preserved",
        detail: "Past outcomes cannot supply facts for the current claim.",
        icon: "shield",
      },
      {
        title: "Reviewer feedback supported",
        detail: "Useful and irrelevant guidance can be clearly recorded.",
        icon: "user",
      },
    ],
  },
  WEEK6_GATEWAY_OBSERVABILITY: {
    title: "AI reliability and observability",
    description:
      "How safely ClaimFlow handles provider failures, limits and workflow visibility.",
    capability: "AI reliability",
    assurance: [
      {
        title: "Failures remain visible",
        detail:
          "Provider and response failures are expected to be classified clearly.",
        icon: "activity",
      },
      {
        title: "Operational limits checked",
        detail: "Latency and usage limits are expected to remain governed.",
        icon: "shield",
      },
      {
        title: "Workflow history retained",
        detail: "Important AI and human handoffs remain reviewable.",
        icon: "history",
      },
    ],
  },
};

function Icon({
  name,
  className = "h-4 w-4",
}: {
  name: IconName;
  className?: string;
}) {
  const paths: Record<IconName, React.ReactNode> = {
    activity: <path d="M3 12h4l2-7 4 14 2-7h6" />,
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </>
    ),
    book: (
      <>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
        <path d="m9 10 2 2 4-4" />
      </>
    ),
    brain: (
      <>
        <path d="M9.5 4.5A3 3 0 0 0 4 6v1.5a3 3 0 0 0-1 5.5 3 3 0 0 0 2 5.5A3 3 0 0 0 10 20V4.5Z" />
        <path d="M14.5 4.5A3 3 0 0 1 20 6v1.5a3 3 0 0 1 1 5.5 3 3 0 0 1-2 5.5A3 3 0 0 1 14 20V4.5Z" />
      </>
    ),
    check: (
      <>
        <path d="M22 11.1V12a10 10 0 1 1-5.9-9.1" />
        <path d="m9 11 3 3L22 4" />
      </>
    ),
    "chevron-left": <path d="m15 18-6-6 6-6" />,
    "chevron-right": <path d="m9 18 6-6-6-6" />,
    file: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6M8 13h8M8 17h6" />
      </>
    ),
    history: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5M12 7v5l3 2" />
      </>
    ),
    inbox: (
      <>
        <path d="M22 12h-6l-2 3h-4l-2-3H2" />
        <path d="m5.5 5.5-3.5 6V20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8.5l-3.5-6A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.5Z" />
      </>
    ),
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    search: (
      <>
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </>
    ),
    shield: (
      <>
        <path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    sparkles: (
      <>
        <path d="m12 3-1.9 5.1L5 10l5.1 1.9L12 17l1.9-5.1L19 10l-5.1-1.9Z" />
        <path d="M5 3v4M3 5h4M19 17v4M17 19h4" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    warning: (
      <>
        <path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function ClaimFlowMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 42 42">
      <g fill="#85d9c8">
        <ellipse
          cx="8.8"
          cy="10.6"
          rx="1.5"
          ry="3"
          transform="rotate(-48 8.8 10.6)"
        />
        <ellipse
          cx="12.4"
          cy="8.4"
          rx="1.4"
          ry="2.8"
          transform="rotate(-35 12.4 8.4)"
        />
        <ellipse
          cx="16.3"
          cy="7.2"
          rx="1.35"
          ry="2.7"
          transform="rotate(-18 16.3 7.2)"
        />
        <ellipse
          cx="33.2"
          cy="10.6"
          rx="1.5"
          ry="3"
          transform="rotate(48 33.2 10.6)"
        />
        <ellipse
          cx="29.6"
          cy="8.4"
          rx="1.4"
          ry="2.8"
          transform="rotate(35 29.6 8.4)"
        />
        <ellipse
          cx="25.7"
          cy="7.2"
          rx="1.35"
          ry="2.7"
          transform="rotate(18 25.7 7.2)"
        />
      </g>
      <path
        d="M29.6 17.2c-2.1-2.8-5-4.2-8.4-4.2-6.2 0-10.6 5-10.6 11.6 0 6.4 4.4 11.3 10.6 11.3 3.8 0 7.1-1.7 9.3-4.8"
        fill="none"
        stroke="#155e57"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Sidebar({
  collapsed,
  onCollapse,
  mobile = false,
  onNavigate,
}: {
  collapsed: boolean;
  onCollapse?: () => void;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const nav = [
    { href: "/dashboard", label: "Claims", icon: "file" as const },
    { href: "/review", label: "Review queue", icon: "inbox" as const },
    { href: "/review", label: "Resolved", icon: "check" as const },
    {
      href: "/evals",
      label: "Operations",
      icon: "activity" as const,
      active: true,
    },
  ];
  return (
    <div className="flex h-full flex-col bg-[#eef8f5] px-3 py-5 text-[#20302e]">
      <div
        className={`flex gap-2 ${collapsed ? "flex-col items-center" : "items-center justify-between"}`}
      >
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-2 text-[#123f3b]"
        >
          <ClaimFlowMark className="h-10 w-10 shrink-0" />
          {!collapsed ? (
            <span className="truncate text-sm font-semibold">ClaimFlow</span>
          ) : null}
        </Link>
        {!mobile && onCollapse ? (
          <button
            type="button"
            onClick={onCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#dfe8e3] bg-white text-[#155e57] transition hover:border-[#85d9c8] hover:bg-[#f8fdfb]"
          >
            <Icon name={collapsed ? "chevron-right" : "chevron-left"} />
          </button>
        ) : null}
      </div>
      <nav className="mt-7 space-y-1" aria-label="Primary navigation">
        {nav.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            onClick={onNavigate}
            aria-current={item.active ? "page" : undefined}
            className={`flex items-center rounded-xl px-3 py-2.5 text-sm transition ${collapsed ? "justify-center" : "gap-3"} ${item.active ? "bg-[#0f766e] font-semibold text-white shadow-sm" : "text-[#667571] hover:bg-white hover:text-[#123f3b]"}`}
          >
            <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
            {!collapsed ? <span>{item.label}</span> : null}
          </Link>
        ))}
      </nav>
      <div className="mt-auto border-t border-[#dfe8e3] pt-4">
        <UserAccountControl collapsed={collapsed} />
      </div>
    </div>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function words(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function metricLabel(key: string) {
  const normalized = key.toLowerCase();
  if (
    normalized.includes("extraction") ||
    normalized.includes("field_accuracy")
  )
    return "Claim fact accuracy";
  if (normalized.includes("citation") && normalized.includes("support"))
    return "Supporting evidence accuracy";
  if (normalized.includes("citation")) return "Answer evidence coverage";
  if (normalized.includes("guardrail")) return "Guardrail safety";
  if (normalized.includes("tool_selection")) return "Next-step selection";
  if (normalized.includes("routing")) return "Workflow routing";
  if (normalized.includes("memory") && normalized.includes("relevance"))
    return "Similar-claim relevance";
  if (normalized.includes("retrieval")) return "Relevant guidance retrieval";
  if (normalized.includes("validation")) return "Completeness checking";
  return words(key.replace(/^(mock|real_agent)_/i, ""));
}

function qualityMetrics(metricsJson: unknown, passRate: number) {
  const rows = isRecord(metricsJson)
    ? Object.entries(metricsJson)
        .filter(
          ([key, value]) =>
            typeof value === "number" &&
            Number.isFinite(value) &&
            value >= 0 &&
            value <= 1 &&
            /(rate|accuracy|precision|recall|coverage)/i.test(key),
        )
        .map(([key, value]) => ({
          key,
          label: metricLabel(key),
          value: value as number,
        }))
    : [];
  const unique = rows
    .filter(
      (row, index) =>
        rows.findIndex((candidate) => candidate.label === row.label) === index,
    )
    .slice(0, 6);
  return unique.length
    ? unique
    : [{ key: "overall", label: "Overall workflow quality", value: passRate }];
}

function metadataText(metadata: unknown, key: string) {
  if (!isRecord(metadata)) return null;
  return typeof metadata[key] === "string" ? (metadata[key] as string) : null;
}

function caseTitle(item: EvalCase) {
  const title = metadataText(item.metadataJson, "title");
  if (title)
    return title
      .replace(/\bweek\s*\d+\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  return words(
    item.caseId
      .replace(/^W\d+[-_]/i, "")
      .replace(/^(COV|RAG|MEM|AGENT|GATEWAY)[-_]/i, ""),
  );
}

function caseDescription(item: EvalCase, profile: SuiteProfile) {
  const detail =
    metadataText(item.metadataJson, "evaluated") ?? item.failureReason;
  if (
    !detail ||
    /\b(?:json|schema|model|prompt|gateway|rag|extracted|validation output|tool)\b/i.test(
      detail,
    )
  ) {
    return `${profile.capability} was checked against the expected reviewer-facing outcome.`;
  }
  return detail
    .replace(/\bweek\s*\d+\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function statusLabel(status: string) {
  if (status === "PASSED") return "Passed";
  if (status === "WARNING") return "Needs review";
  return status === "FAILED" ? "Failed" : words(status);
}

function statusClasses(status: string) {
  if (status === "PASSED") return "bg-[#eef8f5] text-[#155e57]";
  if (status === "WARNING") return "bg-[#fff7e8] text-[#8a5a17]";
  return "bg-red-50 text-red-700";
}

function MetricCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: IconName;
}) {
  return (
    <article className="rounded-2xl border border-[#dfe8e3] bg-white p-5 shadow-[0_8px_28px_rgba(18,63,59,0.045)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-[#667571]">{label}</p>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#dcefea] text-[#155e57]">
          <Icon name={icon} />
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-[#123f3b]">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-[#667571]">{detail}</p>
    </article>
  );
}

function QualityReportContent({ run, tab }: { run: EvalRun; tab: QualityTab }) {
  const profile = SUITE_PROFILES[run.suite] ?? {
    title: "Claims workflow quality",
    description: "How reliably this ClaimFlow capability supports reviewers.",
    capability: "Claims workflow",
    assurance: [
      {
        title: "Quality checks recorded",
        detail: "Persisted results remain available for reviewer inspection.",
        icon: "check" as const,
      },
      {
        title: "Human decision retained",
        detail: "Quality reporting never changes a claim outcome.",
        icon: "user" as const,
      },
      {
        title: "Results remain reviewable",
        detail: "Warnings and failures remain visible.",
        icon: "history" as const,
      },
    ],
  };
  const metrics = qualityMetrics(run.metricsJson, run.passRate);
  const attentionCases = run.cases.filter((item) => item.status !== "PASSED");

  if (tab === "checks")
    return (
      <section className="rounded-2xl border border-[#dfe8e3] bg-white p-5 shadow-[0_8px_28px_rgba(18,63,59,0.045)] sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#123f3b]">
              Quality checks
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#667571]">
              Reviewer-focused checks across {profile.capability.toLowerCase()}.
            </p>
          </div>
          <span className="w-fit rounded-full bg-[#eef8f5] px-3 py-1.5 text-xs font-semibold text-[#155e57]">
            {run.passedCases} passed
          </span>
        </div>
        <div className="mt-5 divide-y divide-[#dfe8e3] border-y border-[#dfe8e3]">
          {run.cases.map((item) => (
            <article
              key={item.id}
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${item.status === "PASSED" ? "bg-[#dcefea] text-[#155e57]" : item.status === "WARNING" ? "bg-[#fff1d5] text-[#b66f16]" : "bg-red-50 text-red-700"}`}
                >
                  <Icon name={item.status === "PASSED" ? "check" : "warning"} />
                </span>
                <div className="min-w-0">
                  <h3 className="break-words text-sm font-semibold text-[#20302e]">
                    {caseTitle(item)}
                  </h3>
                  <p className="mt-1 break-words text-sm leading-6 text-[#667571]">
                    {caseDescription(item, profile)}
                  </p>
                </div>
              </div>
              <span
                className={`w-fit shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(item.status)}`}
              >
                {statusLabel(item.status)}
              </span>
            </article>
          ))}
        </div>
      </section>
    );

  if (tab === "cases")
    return (
      <section className="rounded-2xl border border-[#dfe8e3] bg-white p-5 shadow-[0_8px_28px_rgba(18,63,59,0.045)] sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#123f3b]">
              Case results
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#667571]">
              The persisted scenarios and their reviewer-facing outcomes.
            </p>
          </div>
          <span className="w-fit rounded-full bg-[#eef8f5] px-3 py-1.5 text-xs font-semibold text-[#155e57]">
            {run.totalCases} cases
          </span>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-[#dfe8e3] text-xs text-[#667571]">
              <tr>
                <th className="pb-3 font-medium">Scenario</th>
                <th className="pb-3 font-medium">What was checked</th>
                <th className="pb-3 text-right font-medium">Score</th>
                <th className="pb-3 text-right font-medium">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dfe8e3]">
              {run.cases.map((item) => (
                <tr key={item.id}>
                  <td className="py-4 pr-5 font-semibold text-[#20302e]">
                    {caseTitle(item)}
                  </td>
                  <td className="max-w-lg py-4 pr-5 text-[#667571]">
                    {caseDescription(item, profile)}
                  </td>
                  <td className="py-4 pr-5 text-right font-semibold text-[#20302e]">
                    {item.score === null ? "—" : formatPercent(item.score)}
                  </td>
                  <td className="py-4 text-right">
                    <span
                      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(item.status)}`}
                    >
                      {statusLabel(item.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );

  if (tab === "activity")
    return (
      <section className="rounded-2xl border border-[#dfe8e3] bg-white p-5 shadow-[0_8px_28px_rgba(18,63,59,0.045)] sm:p-6">
        <h2 className="text-xl font-semibold text-[#123f3b]">
          Report activity
        </h2>
        <p className="mt-1 text-sm leading-6 text-[#667571]">
          A concise record of this persisted quality report.
        </p>
        <div className="mt-5 divide-y divide-[#dfe8e3] border-y border-[#dfe8e3]">
          {[
            {
              icon: "activity" as const,
              title: "Quality run prepared",
              detail: `${run.totalCases} ${profile.capability.toLowerCase()} scenarios were checked.`,
            },
            {
              icon: "shield" as const,
              title: "Assurance checks applied",
              detail:
                profile.assurance[0]?.detail ??
                "Product safeguards were checked.",
            },
            {
              icon: "check" as const,
              title: "Quality report completed",
              detail: `${run.passedCases} passed, ${run.warningCases} need review and ${run.failedCases} failed.`,
            },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 py-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#dcefea] text-[#155e57]">
                <Icon name={item.icon} />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#20302e]">
                  {item.title}
                </p>
                <p className="mt-1 text-sm leading-6 text-[#667571]">
                  {item.detail}
                </p>
                <p className="mt-1 text-xs text-[#87928f]">
                  {formatDate(run.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    );

  return (
    <div className="space-y-5">
      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Workflow quality"
          value={formatPercent(run.passRate)}
          detail={`${run.passedCases} of ${run.totalCases} checks passed`}
          icon="check"
        />
        <MetricCard
          label="Cases checked"
          value={String(run.totalCases)}
          detail={`Across ${profile.capability.toLowerCase()}`}
          icon="file"
        />
        <MetricCard
          label="Needs attention"
          value={String(run.warningCases + run.failedCases)}
          detail={`${run.warningCases} review · ${run.failedCases} failed`}
          icon="warning"
        />
      </section>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,.72fr)] xl:items-start">
        <div className="space-y-5">
          <section className="rounded-2xl border border-[#dfe8e3] bg-white p-5 shadow-[0_8px_28px_rgba(18,63,59,0.045)] sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#123f3b]">
                  Workflow quality at a glance
                </h2>
                <p className="mt-1 text-sm leading-6 text-[#667571]">
                  The persisted quality measures supporting this report.
                </p>
              </div>
              <span className="w-fit rounded-full bg-[#eef8f5] px-3 py-1.5 text-xs font-semibold text-[#155e57]">
                Latest run
              </span>
            </div>
            <div className="mt-5 space-y-4">
              {metrics.map((metric) => (
                <div key={metric.key}>
                  <div className="flex min-w-0 items-center justify-between gap-4">
                    <p className="min-w-0 break-words text-sm font-semibold text-[#20302e]">
                      {metric.label}
                    </p>
                    <span className="shrink-0 text-sm font-semibold text-[#155e57]">
                      {formatPercent(metric.value)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f1f6f3]">
                    <span
                      className={`block h-full rounded-full ${metric.value < 0.9 ? "bg-[#d68a2f]" : "bg-[#0f766e]"}`}
                      style={{
                        width: `${Math.max(0, Math.min(100, metric.value * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-2xl border border-[#dfe8e3] bg-white p-5 shadow-[0_8px_28px_rgba(18,63,59,0.045)] sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#123f3b]">
                  {attentionCases.length
                    ? "Needs attention"
                    : "All checks are healthy"}
                </h2>
                <p className="mt-1 text-sm leading-6 text-[#667571]">
                  {attentionCases.length
                    ? `${attentionCases.length} ${attentionCases.length === 1 ? "check should" : "checks should"} be reviewed before the next quality run.`
                    : "No warnings or failed cases were recorded in this report."}
                </p>
              </div>
              {attentionCases.length ? (
                <span className="w-fit rounded-full bg-[#fff7e8] px-3 py-1.5 text-xs font-semibold text-[#8a5a17]">
                  {attentionCases.length} checks
                </span>
              ) : (
                <span className="w-fit rounded-full bg-[#eef8f5] px-3 py-1.5 text-xs font-semibold text-[#155e57]">
                  Healthy
                </span>
              )}
            </div>
            <div className="mt-4 divide-y divide-[#dfe8e3] border-y border-[#dfe8e3]">
              {attentionCases.length ? (
                attentionCases.slice(0, 4).map((item) => (
                  <article
                    key={item.id}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#fff1d5] text-[#b66f16]">
                        <Icon name="warning" />
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold text-[#20302e]">
                          {caseTitle(item)}
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-[#667571]">
                          {caseDescription(item, profile)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`w-fit shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(item.status)}`}
                    >
                      {statusLabel(item.status)}
                    </span>
                  </article>
                ))
              ) : (
                <div className="flex items-start gap-3 py-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#dcefea] text-[#155e57]">
                    <Icon name="check" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#20302e]">
                      No action required
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#667571]">
                      Every persisted case passed its expected reviewer-facing
                      outcome.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
        <aside className="space-y-5">
          <section className="rounded-2xl border border-[#dfe8e3] bg-white p-5 shadow-[0_8px_28px_rgba(18,63,59,0.045)]">
            <h2 className="text-lg font-semibold text-[#123f3b]">
              Run summary
            </h2>
            <p className="mt-1 text-xs leading-5 text-[#667571]">
              Product-level results only.
            </p>
            <dl className="mt-4 divide-y divide-[#dfe8e3] border-y border-[#dfe8e3]">
              {[
                [
                  "Status",
                  run.failedCases
                    ? "Needs attention"
                    : run.warningCases
                      ? "Monitor"
                      : "Completed",
                ],
                ["Cases checked", String(run.totalCases)],
                ["Passed", String(run.passedCases)],
                ["Needs review", String(run.warningCases)],
                ["Completed", formatDate(run.createdAt)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-start justify-between gap-4 py-3 text-sm"
                >
                  <dt className="text-[#667571]">{label}</dt>
                  <dd className="text-right font-semibold text-[#20302e]">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="rounded-2xl border border-[#dfe8e3] bg-white p-5 shadow-[0_8px_28px_rgba(18,63,59,0.045)]">
            <h2 className="text-lg font-semibold text-[#123f3b]">Assurance</h2>
            <p className="mt-1 text-xs leading-5 text-[#667571]">
              Controls checked across this run.
            </p>
            <div className="mt-4 divide-y divide-[#dfe8e3] border-t border-[#dfe8e3]">
              {profile.assurance.map((item) => (
                <div key={item.title} className="flex items-start gap-3 py-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#dcefea] text-[#155e57]">
                    <Icon name={item.icon} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#20302e]">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#667571]">
                      {item.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

export function QualityReportScreen({ evalRunId }: { evalRunId: string }) {
  const [data, setData] = useState<EvalRunResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<QualityTab>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    axios
      .get<EvalRunResponse>(`/api/evals/${evalRunId}`)
      .then((response) => setData(response.data))
      .catch(() => setError("This quality report could not be loaded."));
  }, [evalRunId]);

  const report = data?.evalRun ?? null;
  const profile = useMemo(
    () =>
      report
        ? (SUITE_PROFILES[report.suite] ?? {
            title: "Claims workflow quality",
            description:
              "How reliably this ClaimFlow capability supports reviewers.",
            capability: "Claims workflow",
            assurance: [],
          })
        : null,
    [report],
  );
  const health = report
    ? report.failedCases
      ? "Needs attention"
      : report.warningCases
        ? "Monitor"
        : "Healthy"
    : "Loading";

  return (
    <div className="min-h-screen bg-[#fbfaf6] text-[#20302e]">
      <div className="flex min-h-screen">
        <aside
          className={`sticky top-0 hidden h-screen shrink-0 border-r border-[#dfe8e3] transition-[width] duration-200 lg:block ${sidebarCollapsed ? "w-20" : "w-56"}`}
        >
          <Sidebar
            collapsed={sidebarCollapsed}
            onCollapse={() => setSidebarCollapsed((value) => !value)}
          />
        </aside>
        {mobileSidebarOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute inset-0 bg-[#123f3b]/30 backdrop-blur-[1px]"
            />
            <aside className="relative h-full w-64 border-r border-[#dfe8e3] shadow-2xl">
              <Sidebar
                collapsed={false}
                mobile
                onNavigate={() => setMobileSidebarOpen(false)}
              />
            </aside>
          </div>
        ) : null}
        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-[#dfe8e3] bg-white/95 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                aria-label="Open navigation"
                className="grid h-10 w-10 place-items-center rounded-xl border border-[#dfe8e3] bg-[#eef8f5] text-[#155e57] lg:hidden"
              >
                <Icon name="menu" className="h-5 w-5" />
              </button>
              <Link
                href="/dashboard"
                className="mr-auto flex items-center gap-2 lg:hidden"
              >
                <ClaimFlowMark className="h-9 w-9" />
                <span className="text-sm font-semibold text-[#123f3b]">
                  ClaimFlow
                </span>
              </Link>
              <Link
                href="/dashboard"
                className="mr-auto hidden min-w-0 max-w-xl flex-1 items-center gap-2 rounded-xl border border-[#dfe8e3] bg-[#fbfaf6] px-3 py-2.5 text-sm text-[#667571] transition hover:border-[#b9dfd3] hover:text-[#123f3b] sm:flex"
              >
                <Icon name="search" />
                Search claims and reports
              </Link>
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[#667571] transition hover:bg-[#eef8f5] hover:text-[#123f3b]"
              >
                <Icon name="bell" />
                <span className="hidden md:inline">Notifications</span>
              </button>
            </div>
          </header>
          <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
            {error ? (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
              >
                <p className="font-semibold">Quality report unavailable</p>
                <p className="mt-1">{error}</p>
                <Link
                  href="/evals"
                  className="mt-4 inline-flex rounded-xl border border-red-200 bg-white px-4 py-2 font-semibold"
                >
                  Back to operations
                </Link>
              </div>
            ) : !report || !profile ? (
              <div className="rounded-2xl border border-[#dfe8e3] bg-white p-6 text-sm text-[#667571]">
                Loading quality report…
              </div>
            ) : (
              <>
                <section className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div>
                    <Link
                      href="/evals"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-[#667571] transition hover:text-[#155e57]"
                    >
                      <Icon name="chevron-left" />
                      Back to operations
                    </Link>
                    <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#123f3b]">
                      Quality report
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-[#667571] sm:text-base">
                      {profile.title} · Completed {formatDate(report.createdAt)}
                    </p>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[#667571]">
                      {profile.description}
                    </p>
                  </div>
                  <span
                    className={`inline-flex w-fit shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${report.failedCases ? "bg-red-50 text-red-700" : report.warningCases ? "bg-[#fff7e8] text-[#8a5a17]" : "bg-[#eef8f5] text-[#155e57]"}`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${report.failedCases ? "bg-red-500" : report.warningCases ? "bg-[#d68a2f]" : "bg-[#0f766e]"}`}
                    />
                    {health}
                  </span>
                </section>
                <div
                  className="mt-6 flex flex-wrap gap-2 border-b border-[#dfe8e3] pb-4"
                  aria-label="Quality report sections"
                >
                  {(
                    ["overview", "checks", "cases", "activity"] as QualityTab[]
                  ).map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={tab === value}
                      onClick={() => setTab(value)}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${tab === value ? "border-[#85d9c8] bg-[#dcefea] text-[#123f3b]" : "border-transparent text-[#667571] hover:bg-[#eef8f5] hover:text-[#155e57]"}`}
                    >
                      {value === "overview"
                        ? "Overview"
                        : value === "checks"
                          ? "Quality checks"
                          : value === "cases"
                            ? "Case results"
                            : "Activity"}
                    </button>
                  ))}
                </div>
                <div className="mt-5">
                  <QualityReportContent run={report} tab={tab} />
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
