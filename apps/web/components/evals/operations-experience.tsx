"use client";

import { ClaimExtractionSchema } from "@repo/shared/schemas";
import axios from "axios";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type {
  ExtractionRunRecord,
  ReviewTaskRecord,
} from "../../store/use-dashboard-store";
import type {
  RunTraceResponse,
  RunTraceSource,
  RunTraceTimelineItem,
} from "../../lib/runs/run-trace-types";
import { UserAccountControl } from "../auth/user-account-control";

type OperationsView = "overview" | "traces" | "evaluations";

type EvalRun = {
  id: string;
  passRate: number;
  passedCases: number;
  failedCases: number;
  warningCases: number;
  totalCases: number;
  createdAt: string;
  metricsJson: unknown;
};

type EvalSuite = {
  suite: string;
  title: string;
  description: string;
  latestRun: EvalRun | null;
};

type EvalSuiteResponse = { suites: EvalSuite[] };
type RunsResponse = { runs: ExtractionRunRecord[] };
type ReviewTasksResponse = { reviewTasks: ReviewTaskRecord[] };

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
  | "user";

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

function formatPercentage(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function claimIdentity(run: ExtractionRunRecord) {
  const parsed = ClaimExtractionSchema.safeParse(run.extractedJson);
  const claim = parsed.success ? parsed.data : null;
  const claimant =
    claim?.claimantName ??
    claim?.insuredName ??
    run.document.filename.replace(/\.[^.]+$/, "").replaceAll("-", " ");
  const claimNumber =
    claim?.claimNumber ?? `Claim ${run.id.slice(0, 8).toUpperCase()}`;
  return { claimant, claimNumber };
}

function sourceIcon(source: RunTraceSource): IconName {
  if (source === "memory") return "brain";
  if (source === "review") return "user";
  if (source === "rag") return "book";
  if (source === "agent") return "shield";
  if (source === "gateway" || source === "extraction") return "sparkles";
  return "file";
}

function sourceLabel(source: RunTraceSource) {
  if (source === "rag") return "Policy guidance";
  if (source === "gateway") return "AI assistance";
  if (source === "extraction") return "Claim preparation";
  if (source === "memory") return "Similar-claim guidance";
  if (source === "agent") return "Guarded assistance";
  if (source === "review") return "Human review";
  if (source === "followup") return "Information request";
  if (source === "document") return "Claim intake";
  return titleCase(source);
}

function metadataValue(step: RunTraceTimelineItem, key: string) {
  if (
    typeof step.metadata !== "object" ||
    step.metadata === null ||
    Array.isArray(step.metadata)
  ) {
    return null;
  }

  return (step.metadata as Record<string, unknown>)[key] ?? null;
}

const eventActivity: Record<string, { title: string; description: string }> = {
  DOCUMENT_UPLOADED: {
    title: "Claim source logged",
    description: "The uploaded claim material was recorded for processing.",
  },
  DOCUMENT_SOFT_DELETED: {
    title: "Claim source archived",
    description: "The source was removed from the active workflow.",
  },
  DOCUMENT_RESTORED: {
    title: "Claim source restored",
    description: "The source was returned to the active workflow.",
  },
  DUPLICATE_UPLOAD_DETECTED: {
    title: "Duplicate claim source identified",
    description: "ClaimFlow detected material that had already been received.",
  },
  EXTRACTION_STARTED: {
    title: "Claim preparation started",
    description: "ClaimFlow began reading the submitted claim material.",
  },
  MODEL_RESPONSE_RECEIVED: {
    title: "Claim details extracted",
    description: "Key claim facts were identified from the source.",
  },
  EXTRACTION_COMPLETED: {
    title: "Claim facts organized",
    description: "The extracted facts were saved and prepared for checks.",
  },
  VALIDATION_STARTED: {
    title: "Readiness checks started",
    description:
      "ClaimFlow began checking the claim for completeness and consistency.",
  },
  VALIDATION_COMPLETED: {
    title: "Readiness checks completed",
    description:
      "The claim completed its required completeness and consistency checks.",
  },
  MISSING_FIELDS_DETECTED: {
    title: "Missing information identified",
    description: "Required claim details were found to be missing.",
  },
  CONFLICTS_DETECTED: {
    title: "Conflicting information identified",
    description:
      "Claim details requiring reviewer clarification were identified.",
  },
  RUN_COMPLETED: {
    title: "Claim ready for decision",
    description: "The claim passed preparation and readiness checks.",
  },
  RUN_NEEDS_REVIEW: {
    title: "Claim routed for human attention",
    description: "The claim was sent to a reviewer for the next decision.",
  },
  RUN_FAILED: {
    title: "Claim preparation paused",
    description: "Claim preparation could not finish and needs attention.",
  },
  REVIEW_TASK_CREATED: {
    title: "Review task created",
    description: "A reviewer task was opened for this claim.",
  },
  REVIEW_STARTED: {
    title: "Human review started",
    description: "A reviewer began assessing the claim.",
  },
  REVIEW_RESUMED: {
    title: "Human review resumed",
    description:
      "A reviewer continued assessment after the claim was reopened.",
  },
  REVIEW_APPROVED_AS_IS: {
    title: "Claim approved",
    description: "The reviewer approved the claim without changes.",
  },
  REVIEW_EDITED_AND_APPROVED: {
    title: "Claim corrected and approved",
    description:
      "The reviewer corrected claim details and approved the result.",
  },
  REVIEW_REJECTED: {
    title: "Claim rejected",
    description: "The reviewer completed the claim with a rejection decision.",
  },
  REVIEW_MORE_INFO_REQUESTED: {
    title: "More information requested",
    description:
      "The reviewer paused the decision until more information is received.",
  },
  ADDITIONAL_INFORMATION_RECEIVED: {
    title: "Additional information recorded",
    description: "New claim details were added for the reviewer.",
  },
  ADDITIONAL_EVIDENCE_RECEIVED: {
    title: "Additional evidence recorded",
    description: "New supporting evidence was added to the claim.",
  },
  REVIEW_REOPENED: {
    title: "Human review reopened",
    description:
      "The claim returned to review after new information was recorded.",
  },
  MEMORY_RETRIEVED: {
    title: "Similar-claim guidance searched",
    description:
      "ClaimFlow searched approved prior outcomes for relevant guidance.",
  },
  MEMORY_FEEDBACK_RECORDED: {
    title: "Guidance feedback recorded",
    description:
      "The reviewer marked whether the similar-claim guidance was useful.",
  },
  AGENT_STEP_STARTED: {
    title: "Next-step assessment started",
    description: "ClaimFlow began assessing a safe next workflow step.",
  },
  AGENT_ACTION_PROPOSED: {
    title: "Next workflow step proposed",
    description: "A proposed next step was prepared for guardrail checks.",
  },
  AGENT_ACTION_BLOCKED: {
    title: "Unsafe action blocked",
    description: "A guardrail stopped an action that required human control.",
  },
  AGENT_TOOL_EXECUTED: {
    title: "Guarded action completed",
    description: "An allowed workflow action was completed under guardrails.",
  },
  FOLLOWUP_DRAFT_CREATED: {
    title: "Information request drafted",
    description:
      "A reviewer-ready request for missing information was prepared.",
  },
};

const gatewayActivity: Record<string, { title: string; description: string }> =
  {
    EXTRACTION: {
      title: "Source reading completed",
      description:
        "AI assistance finished reading the submitted claim material.",
    },
    VALIDATION_ASSIST: {
      title: "Readiness check assisted",
      description: "AI assistance supported the claim readiness checks.",
    },
    RAG_QUERY_REWRITE: {
      title: "Policy question clarified",
      description:
        "The claim question was prepared for a focused policy search.",
    },
    RAG_ANSWER: {
      title: "Policy answer generated",
      description:
        "A policy-grounded answer was prepared from retrieved evidence.",
    },
    AGENT_PLANNER: {
      title: "Next-step plan prepared",
      description:
        "A possible next workflow step was prepared for guardrail review.",
    },
    MEMORY_WRITER: {
      title: "Reviewed outcome prepared for memory",
      description:
        "The completed human outcome was prepared for safe future reference.",
    },
    MEMORY_SUMMARIZER: {
      title: "Similar-claim guidance summarized",
      description:
        "Approved prior guidance was summarized for the current claim.",
    },
  };

const agentActionActivity: Record<string, string> = {
  RETRIEVE_POLICY_CLAUSES: "Policy evidence search",
  CREATE_REVIEW_TASK: "Human review routing",
  REQUEST_MISSING_DOCUMENT: "Missing document request",
  MARK_NEEDS_MORE_EVIDENCE: "Evidence requirement",
  MARK_NEEDS_MORE_INFO: "Information requirement",
  DRAFT_FOLLOWUP_REQUEST: "Follow-up request",
  DRAFT_INFORMATION_REQUEST: "Information request",
  DRAFT_APPROVAL_NOTE: "Approval note",
  DRAFT_DENIAL_REASON: "Rejection rationale",
  ESCALATE_TO_HUMAN: "Human escalation",
  ASK_CLARIFICATION: "Clarification request",
  NO_ACTION: "No further action",
};

function friendlyActivity(step: RunTraceTimelineItem) {
  const status = step.status?.toUpperCase() ?? "";
  if (status === "MEMORY_RETRIEVED") {
    const writtenHitCount = metadataValue(step, "writtenHitCount");
    const count = typeof writtenHitCount === "number" ? writtenHitCount : 0;
    return count > 0
      ? {
          title: `${count} similar-claim ${count === 1 ? "match" : "matches"} found`,
          description:
            "Approved prior outcomes were found for reviewer consideration.",
        }
      : {
          title: "No similar-claim guidance found",
          description:
            "The search completed without a relevant approved prior outcome.",
        };
  }

  const exactEvent = eventActivity[status];
  if (exactEvent) return exactEvent;

  if (step.source === "document") {
    return {
      title: "Claim source received",
      description: "The claim material entered the ClaimFlow workspace.",
    };
  }

  if (step.source === "memory") {
    const used = metadataValue(step, "usedByAgent") === true;
    const updateType = metadataValue(step, "updateType");
    const kind = metadataValue(step, "kind");
    if (typeof updateType === "string") {
      const guidanceKind: Record<string, string> = {
        HUMAN_CORRECTION: "Prior human correction",
        PRIOR_REJECTION: "Prior rejection guidance",
        PRIOR_REVIEW_DECISION: "Prior review decision",
        CLAIMANT_PATTERN: "Claimant pattern guidance",
        VENDOR_PATTERN: "Vendor pattern guidance",
        POLICY_HISTORY: "Prior policy guidance",
        RECURRING_ERROR_PATTERN: "Recurring issue guidance",
      };
      const subject =
        typeof kind === "string"
          ? (guidanceKind[kind] ?? "Similar-claim guidance")
          : "Similar-claim guidance";
      return {
        title: `${subject} ${titleCase(updateType).toLowerCase()}`,
        description:
          "The approved guidance record was updated from reviewer feedback.",
      };
    }
    const guidanceKind: Record<string, string> = {
      HUMAN_CORRECTION: "Prior human correction",
      PRIOR_REJECTION: "Prior rejection guidance",
      PRIOR_REVIEW_DECISION: "Prior review decision",
      CLAIMANT_PATTERN: "Claimant pattern guidance",
      VENDOR_PATTERN: "Vendor pattern guidance",
      POLICY_HISTORY: "Prior policy guidance",
      RECURRING_ERROR_PATTERN: "Recurring issue guidance",
    };
    const subject =
      typeof kind === "string"
        ? (guidanceKind[kind] ?? "Similar-claim guidance")
        : "Similar-claim guidance";
    return {
      title: used ? `${subject} used` : `${subject} retrieved`,
      description: used
        ? "Relevant approved guidance informed the guarded next-step assessment."
        : "Relevant approved guidance was made available for review.",
    };
  }

  if (step.source === "rag") {
    return {
      title: "Policy evidence retrieved",
      description:
        "Supporting policy evidence was retrieved for the claim question.",
    };
  }

  if (step.source === "agent") {
    const action = metadataValue(step, "action");
    const actionSubject =
      typeof action === "string" ? agentActionActivity[action] : undefined;
    const recordedStatus = metadataValue(step, "status");
    const actionStatus =
      typeof recordedStatus === "string" ? recordedStatus : status;
    const blocked = actionStatus === "BLOCKED";
    const actionVerb =
      actionStatus === "PROPOSED"
        ? "proposed"
        : actionStatus === "EXECUTED"
          ? "completed"
          : actionStatus === "BLOCKED"
            ? "blocked"
            : "reviewed";
    return {
      title:
        (actionSubject ? `${actionSubject} ${actionVerb}` : undefined) ??
        (blocked
          ? "Guardrail blocked next step"
          : "Guarded next step completed"),
      description: blocked
        ? "The proposed step was stopped because it required human control."
        : "The proposed step passed its guardrail review.",
    };
  }

  if (step.source === "followup") {
    return {
      title: "Information request prepared",
      description:
        "A reviewer-ready follow-up was prepared for human approval.",
    };
  }

  if (step.source === "review") {
    const decisionTitle: Record<string, string> = {
      APPROVE_AS_IS: "Claim approved",
      EDIT_AND_APPROVE: "Claim corrected and approved",
      REJECT: "Claim rejected",
      REQUEST_MORE_INFO: "More information requested",
    };
    return {
      title: decisionTitle[status] ?? "Human review updated",
      description: "The reviewer-owned claim decision workflow was updated.",
    };
  }

  if (step.source === "gateway") {
    const kind = step.title
      .replace(/^AI Call:\s*/i, "")
      .toUpperCase()
      .replaceAll(" ", "_");
    return (
      gatewayActivity[kind] ?? {
        title: "AI-assisted step completed",
        description: "ClaimFlow completed an assisted workflow step.",
      }
    );
  }

  if (step.source === "extraction") {
    return {
      title: titleCase(step.title),
      description: "The claim workflow recorded this preparation milestone.",
    };
  }

  return { title: step.title, description: step.description };
}

function displayTimeline(timeline: RunTraceTimelineItem[]) {
  const reviewDecisionIds = new Set(
    timeline
      .filter((step) => step.id.startsWith("review-event:"))
      .map((step) => metadataValue(step, "decisionId"))
      .filter((value): value is string => typeof value === "string"),
  );

  const hasNearbyRecord = (
    step: RunTraceTimelineItem,
    prefix: string,
    windowMs = 5_000,
  ) =>
    timeline.some(
      (candidate) =>
        candidate.id.startsWith(prefix) &&
        Math.abs(
          new Date(candidate.timestamp).getTime() -
            new Date(step.timestamp).getTime(),
        ) <= windowMs,
    );

  const memorySearchSignature = (step: RunTraceTimelineItem) =>
    JSON.stringify({
      memoryIds: metadataValue(step, "memoryIds"),
      totalCandidates: metadataValue(step, "totalCandidates"),
      writtenHitCount: metadataValue(step, "writtenHitCount"),
    });

  const mirroredAgentEvent: Record<string, string> = {
    AGENT_ACTION_PROPOSED: "PROPOSED",
    AGENT_ACTION_BLOCKED: "BLOCKED",
    AGENT_TOOL_EXECUTED: "EXECUTED",
  };

  const visibleTimeline = timeline.filter((step) => {
    // The document row and upload event describe the same intake action.
    if (step.id.startsWith("event:") && step.status === "DOCUMENT_UPLOADED") {
      return false;
    }

    // Follow-up drafts are represented both by a workflow event and the draft record.
    if (
      step.id.startsWith("event:") &&
      step.status === "FOLLOWUP_DRAFT_CREATED" &&
      hasNearbyRecord(step, "followup:")
    ) {
      return false;
    }

    const agentStatus = step.status
      ? mirroredAgentEvent[step.status]
      : undefined;
    if (
      step.id.startsWith("event:") &&
      agentStatus &&
      timeline.some(
        (candidate) =>
          candidate.id.startsWith("agent:") &&
          metadataValue(candidate, "status") === agentStatus &&
          Math.abs(
            new Date(candidate.timestamp).getTime() -
              new Date(step.timestamp).getTime(),
          ) <= 5_000,
      )
    ) {
      return false;
    }

    // A decision produces an audit event and a decision row; show the user action once.
    if (step.id.startsWith("review-decision:")) {
      return !reviewDecisionIds.has(step.id.replace("review-decision:", ""));
    }

    // Re-running an unchanged memory search should not create duplicate user-facing steps.
    if (step.status === "MEMORY_RETRIEVED") {
      const signature = memorySearchSignature(step);
      return !timeline.some(
        (candidate) =>
          candidate.status === "MEMORY_RETRIEVED" &&
          new Date(candidate.timestamp).getTime() >
            new Date(step.timestamp).getTime() &&
          memorySearchSignature(candidate) === signature,
      );
    }

    return true;
  });

  return visibleTimeline.map((step, index) => {
    let visibleStep = step;
    if (step.id.startsWith("memory-update:")) {
      const memoryId = metadataValue(step, "memoryId");
      const relatedHit = visibleTimeline.find(
        (candidate) =>
          candidate.id.startsWith("memory-hit:") &&
          metadataValue(candidate, "memoryId") === memoryId,
      );
      const kind = relatedHit ? metadataValue(relatedHit, "kind") : null;
      if (typeof kind === "string") {
        const metadata =
          typeof step.metadata === "object" &&
          step.metadata !== null &&
          !Array.isArray(step.metadata)
            ? step.metadata
            : {};
        visibleStep = { ...step, metadata: { ...metadata, kind } };
      }
    }

    const reviewWasReopened = visibleTimeline
      .slice(0, index)
      .some((candidate) => candidate.status === "REVIEW_REOPENED");

    return visibleStep.status === "REVIEW_STARTED" && reviewWasReopened
      ? { ...visibleStep, status: "REVIEW_RESUMED" }
      : visibleStep;
  });
}

function activityStatusLabel(status: string) {
  const normalized = status.toUpperCase();
  if (normalized.includes("EDITED_AND_APPROVED"))
    return "Corrected and approved";
  if (normalized.includes("APPROVED")) return "Approved";
  if (normalized.includes("REJECTED")) return "Rejected";
  if (normalized.includes("NEEDS_MORE_INFO")) return "Waiting for information";
  if (normalized.includes("BLOCKED")) return "Paused by guardrail";
  if (normalized.includes("FAILED")) return "Needs attention";
  if (normalized.includes("RETRIEVED")) return "Checked";
  if (
    normalized.includes("SUCCEEDED") ||
    normalized.includes("COMPLETED") ||
    normalized.includes("EXECUTED")
  )
    return "Completed";
  return titleCase(status.replace(/^REVIEW_/, ""));
}

function friendlyRunEvent(
  event: { type: string; message: string } | undefined,
) {
  if (!event) return "Claim received";
  const labels: Record<string, string> = {
    DOCUMENT_UPLOADED: "Claim source received",
    DUPLICATE_UPLOAD_DETECTED: "Duplicate claim source identified",
    EXTRACTION_STARTED: "Claim preparation started",
    MODEL_RESPONSE_RECEIVED: "Claim facts prepared",
    EXTRACTION_COMPLETED: "Claim facts organized",
    VALIDATION_STARTED: "Readiness checks started",
    VALIDATION_COMPLETED: "Completeness checks finished",
    MISSING_FIELDS_DETECTED: "Missing information identified",
    CONFLICTS_DETECTED: "Conflicting information identified",
    RUN_NEEDS_REVIEW: "Claim routed for human attention",
    RUN_COMPLETED: "Claim ready for decision",
    RUN_FAILED: "Claim preparation paused",
    MEMORY_RETRIEVED: "Similar-claim guidance checked",
    MEMORY_FEEDBACK_RECORDED: "Similar-claim feedback recorded",
    AGENT_STEP_STARTED: "Guarded next step reviewed",
    AGENT_ACTION_PROPOSED: "Next workflow step proposed",
    AGENT_ACTION_BLOCKED: "Guardrail paused an unsafe action",
    AGENT_TOOL_EXECUTED: "Guarded workflow action prepared",
    FOLLOWUP_DRAFT_CREATED: "Information request prepared",
    ADDITIONAL_INFORMATION_RECEIVED: "Additional information recorded",
    ADDITIONAL_EVIDENCE_RECEIVED: "Additional evidence recorded",
    REVIEW_REOPENED: "Human review reopened",
  };
  return labels[event.type] ?? titleCase(event.type);
}

function runStatusLabel(status: string) {
  if (status === "NEEDS_REVIEW") return "Needs attention";
  if (
    status === "UPLOADED" ||
    status === "EXTRACTING" ||
    status === "EXTRACTED" ||
    status === "VALIDATING"
  )
    return "Preparing";
  if (status === "COMPLETED") return "Ready";
  if (status === "FAILED") return "Needs attention";
  return titleCase(status);
}

function operationalStatus(run: ExtractionRunRecord) {
  const reviewStatus = run.reviewTask?.status;
  if (reviewStatus === "EDITED_AND_APPROVED") return "Corrected and approved";
  if (reviewStatus === "APPROVED") return "Approved";
  if (reviewStatus === "REJECTED") return "Rejected";
  if (reviewStatus === "NEEDS_MORE_INFO") return "Waiting for information";
  if (reviewStatus === "IN_REVIEW") return "In human review";
  if (reviewStatus === "PENDING") return "Needs attention";
  return runStatusLabel(run.status);
}

function latestMeaningfulStep(run: ExtractionRunRecord) {
  const reviewStatus = run.reviewTask?.status;
  if (reviewStatus === "EDITED_AND_APPROVED")
    return "Corrections reviewed and approved";
  if (reviewStatus === "APPROVED") return "Claim approved by a human reviewer";
  if (reviewStatus === "REJECTED") return "Claim rejected by a human reviewer";
  if (reviewStatus === "NEEDS_MORE_INFO")
    return "Waiting for requested information";
  if (reviewStatus === "IN_REVIEW") return "Human review in progress";
  return friendlyRunEvent(run.events.at(-1));
}

function operationalUpdatedAt(run: ExtractionRunRecord) {
  return (
    run.reviewTask?.completedAt ?? run.reviewTask?.updatedAt ?? run.updatedAt
  );
}

function OperationsOverview({
  suites,
  runs,
  trace,
  loading,
  onOpenTrace,
  onViewEvaluations,
}: {
  suites: EvalSuite[];
  runs: ExtractionRunRecord[];
  trace: RunTraceResponse | null;
  loading: boolean;
  onOpenTrace: (runId: string) => void;
  onViewEvaluations: () => void;
}) {
  const latestRuns = suites
    .map((suite) => suite.latestRun)
    .filter((run): run is EvalRun => Boolean(run));
  const totals = latestRuns.reduce(
    (result, run) => ({
      total: result.total + run.totalCases,
      passed: result.passed + run.passedCases,
    }),
    { total: 0, passed: 0 },
  );
  const aggregateRate = totals.total ? totals.passed / totals.total : 0;
  const signals = trace?.timeline.slice(-4).reverse() ?? [];

  return (
    <div className="space-y-5">
      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Latest quality pass rate"
          value={totals.total ? formatPercentage(aggregateRate) : "No runs"}
          context={
            totals.total
              ? `${totals.passed} of ${totals.total} cases passed`
              : "Run a quality check to populate this metric"
          }
        />
        <MetricCard
          label="Cases evaluated"
          value={totals.total || "—"}
          context="Across the latest workflow checks"
        />
        <MetricCard
          label="Workflow coverage"
          value={`${latestRuns.length}/${suites.length || 6} quality areas`}
          context="Across the complete claim journey"
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,.72fr)] xl:items-start">
        <section className="rounded-2xl border border-[#dfe8e3] bg-white p-5 shadow-[0_8px_28px_rgba(18,63,59,0.045)] sm:p-6">
          <SectionHeader
            title="Reliability by capability"
            description="Latest quality result for each part of the claim workflow."
            trailing={
              <span className="rounded-full bg-[#eef8f5] px-3 py-1.5 text-xs font-semibold text-[#155e57]">
                Latest runs
              </span>
            }
          />
          <div className="mt-5 divide-y divide-[#dfe8e3] border-t border-[#dfe8e3]">
            {loading ? (
              <p className="py-5 text-sm text-[#667571]">
                Loading evaluation results…
              </p>
            ) : null}
            {!loading && suites.length === 0 ? (
              <p className="py-5 text-sm text-[#667571]">
                No workflow quality results are available.
              </p>
            ) : null}
            {suites.map((suite) => {
              const rate = suite.latestRun?.passRate ?? 0;
              return (
                <div key={suite.suite} className="py-4">
                  <div className="flex min-w-0 items-center justify-between gap-4">
                    <p className="min-w-0 break-words text-sm font-semibold text-[#20302e]">
                      {suite.title}
                    </p>
                    <span className="shrink-0 text-sm font-semibold text-[#155e57]">
                      {suite.latestRun ? formatPercentage(rate) : "No run"}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f1f6f3]">
                    <span
                      className={`block h-full rounded-full ${rate < 0.95 ? "bg-[#d68a2f]" : "bg-[#0f766e]"}`}
                      style={{
                        width: `${Math.max(0, Math.min(100, rate * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-[#dfe8e3] bg-white p-5 shadow-[0_8px_28px_rgba(18,63,59,0.045)] sm:p-6">
          <SectionHeader
            title="Latest signals"
            description="Human-readable events from the selected claim activity."
          />
          <div className="mt-4 divide-y divide-[#dfe8e3] border-t border-[#dfe8e3]">
            {signals.length === 0 ? (
              <p className="py-5 text-sm text-[#667571]">
                {runs.length
                  ? "Loading the latest claim activity…"
                  : "No claim activity is available."}
              </p>
            ) : (
              signals.map((signal) => {
                const display = friendlyActivity(signal);
                return (
                  <div key={signal.id} className="flex items-start gap-3 py-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#dcefea] text-[#155e57]">
                      <Icon
                        name={sourceIcon(signal.source)}
                        className="h-[18px] w-[18px]"
                      />
                    </span>
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-[#20302e]">
                        {display.title}
                      </p>
                      <p className="mt-1 break-words text-xs leading-5 text-[#667571]">
                        {display.description}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-[#dfe8e3] bg-white p-5 shadow-[0_8px_28px_rgba(18,63,59,0.045)] sm:p-6">
        <SectionHeader
          title="Recent claim activity"
          description="Open one claim to understand its AI, guardrail and human handoffs."
          trailing={
            <button
              type="button"
              onClick={() => runs[0] && onOpenTrace(runs[0].id)}
              disabled={!runs.length}
              className="rounded-xl border border-[#b9dfd3] bg-white px-3 py-2 text-sm font-semibold text-[#155e57] transition hover:bg-[#eef8f5] disabled:opacity-50"
            >
              Explore latest activity
            </button>
          }
        />
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-[#dfe8e3] text-xs text-[#667571]">
              <tr>
                <th className="pb-3 font-medium">Claim</th>
                <th className="pb-3 font-medium">Latest meaningful step</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 text-right font-medium">Updated</th>
                <th className="pb-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dfe8e3]">
              {runs.slice(0, 5).map((run) => {
                const identity = claimIdentity(run);
                return (
                  <tr key={run.id}>
                    <td className="py-4 pr-4">
                      <p className="font-semibold text-[#20302e]">
                        {identity.claimant}
                      </p>
                      <p className="mt-1 text-xs text-[#667571]">
                        {identity.claimNumber}
                      </p>
                    </td>
                    <td className="py-4 pr-4 text-[#4e5e5a]">
                      {latestMeaningfulStep(run)}
                    </td>
                    <td className="py-4 pr-4">
                      <span className="inline-flex whitespace-nowrap rounded-full bg-[#eef8f5] px-2.5 py-1 text-xs font-semibold text-[#155e57]">
                        {operationalStatus(run)}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-right text-xs text-[#667571]">
                      {formatDate(operationalUpdatedAt(run))}
                    </td>
                    <td className="py-4 text-right">
                      <button
                        type="button"
                        onClick={() => onOpenTrace(run.id)}
                        className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-[#0f766e] transition hover:bg-[#eef8f5]"
                      >
                        Open activity
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && runs.length === 0 ? (
          <p className="py-5 text-sm text-[#667571]">
            No active claim runs are available.
          </p>
        ) : null}
      </section>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onViewEvaluations}
          className="rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#155e57]"
        >
          View quality reports
        </button>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  context,
}: {
  label: string;
  value: string | number;
  context: string;
}) {
  return (
    <article className="rounded-2xl border border-[#dfe8e3] bg-white p-5 shadow-[0_8px_28px_rgba(18,63,59,0.045)]">
      <p className="text-xs text-[#667571]">{label}</p>
      <p className="mt-2 break-words text-2xl font-semibold tracking-tight text-[#123f3b]">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-[#667571]">{context}</p>
    </article>
  );
}

function SectionHeader({
  title,
  description,
  trailing,
}: {
  title: string;
  description: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-xl font-semibold text-[#123f3b]">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-[#667571]">{description}</p>
      </div>
      {trailing}
    </div>
  );
}

function TraceExplorer({
  trace,
  loading,
  selectedStep,
  onSelectStep,
}: {
  trace: RunTraceResponse | null;
  loading: boolean;
  selectedStep: RunTraceTimelineItem | null;
  onSelectStep: (step: RunTraceTimelineItem) => void;
}) {
  if (loading)
    return (
      <section className="rounded-2xl border border-[#dfe8e3] bg-white p-6 text-sm text-[#667571]">
        Loading claim activity…
      </section>
    );
  if (!trace)
    return (
      <section className="rounded-2xl border border-[#dfe8e3] bg-white p-6 text-sm text-[#667571]">
        Select a recent claim from the overview to inspect its workflow
        activity.
      </section>
    );

  const action =
    selectedStep?.source === "agent"
      ? (trace.agentActions.find(
          (item) =>
            Math.abs(
              new Date(item.createdAt).getTime() -
                new Date(selectedStep.timestamp).getTime(),
            ) < 5000,
        ) ?? trace.agentActions.at(-1))
      : null;
  const memory =
    selectedStep?.source === "memory"
      ? (trace.memoryHits.find((item) => item.usedByAgent) ??
        trace.memoryHits[0])
      : null;
  const selectedDisplay = selectedStep ? friendlyActivity(selectedStep) : null;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(300px,.82fr)_minmax(0,1.35fr)] xl:items-start">
      <section className="rounded-2xl border border-[#dfe8e3] bg-white p-5 shadow-[0_8px_28px_rgba(18,63,59,0.045)] sm:p-6">
        <SectionHeader
          title={trace.document.filename}
          description={`${trace.timeline.length} recorded workflow events`}
          trailing={
            <span className="whitespace-nowrap rounded-full bg-[#eef8f5] px-3 py-1.5 text-xs font-semibold text-[#155e57]">
              Activity captured
            </span>
          }
        />
        <ol className="mt-5">
          {trace.timeline.map((step, index) => {
            const active = selectedStep?.id === step.id;
            const display = friendlyActivity(step);
            return (
              <li
                key={step.id}
                className="relative flex items-start gap-3 pb-5 last:pb-0"
              >
                {index < trace.timeline.length - 1 ? (
                  <span className="absolute bottom-0 left-[13px] top-7 w-px bg-[#dfe8e3]" />
                ) : null}
                <span
                  className={`relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full ${active ? "bg-[#0f766e] text-white" : "bg-[#eef8f5] text-[#155e57]"}`}
                >
                  <Icon
                    name={sourceIcon(step.source)}
                    className="h-3.5 w-3.5"
                  />
                </span>
                <button
                  type="button"
                  onClick={() => onSelectStep(step)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span
                    className={`block break-words text-sm font-semibold ${active ? "text-[#0f766e]" : "text-[#20302e]"}`}
                  >
                    {display.title}
                  </span>
                  <span className="mt-1 block break-words text-xs leading-5 text-[#667571]">
                    {sourceLabel(step.source)} · {formatDate(step.timestamp)}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>
      <section className="rounded-2xl border border-[#dfe8e3] bg-white p-5 shadow-[0_8px_28px_rgba(18,63,59,0.045)] sm:p-6 xl:sticky xl:top-24">
        <p className="text-xs text-[#667571]">Selected step</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h2 className="text-xl font-semibold text-[#123f3b]">
            {selectedDisplay?.title ?? "Choose an activity step"}
          </h2>
          {selectedStep?.status ? (
            <span className="w-fit whitespace-nowrap rounded-full bg-[#eef8f5] px-3 py-1.5 text-xs font-semibold text-[#155e57]">
              {activityStatusLabel(selectedStep.status)}
            </span>
          ) : null}
        </div>
        <p className="mt-3 text-sm leading-6 text-[#667571]">
          {selectedDisplay?.description ??
            "Select a workflow event to see its human-readable operational context."}
        </p>
        {selectedStep ? (
          <dl className="mt-5 divide-y divide-[#dfe8e3] border-y border-[#dfe8e3]">
            <TraceFact
              label="Source"
              value={sourceLabel(selectedStep.source)}
            />
            <TraceFact
              label="Recorded"
              value={formatDate(selectedStep.timestamp)}
            />
          </dl>
        ) : null}
        {action ? (
          <div className="mt-5 rounded-xl border-l-4 border-[#0f766e] bg-[#eef8f5] px-4 py-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-[#123f3b]">
              <Icon name="shield" />
              Guardrail decision
            </p>
            <p className="mt-2 text-sm leading-6 text-[#4e6b66]">
              {action.guardrailDecision
                ? titleCase(action.guardrailDecision)
                : "Allowed workflow action"}
              {action.blockedReason
                ? `: ${action.blockedReason}`
                : ". The action and tool execution remain auditable."}
            </p>
          </div>
        ) : null}
        {memory ? (
          <div className="mt-5 rounded-xl border-l-4 border-[#0f766e] bg-[#eef8f5] px-4 py-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-[#123f3b]">
              <Icon name="brain" />
              Memory boundary
            </p>
            <p className="mt-2 text-sm leading-6 text-[#4e6b66]">
              {memory.safeUse}
            </p>
            <p className="mt-2 text-xs leading-5 text-[#667571]">
              Must not:{" "}
              {memory.mustNotDo.join("; ") || "replace current claim evidence"}
            </p>
          </div>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={`/runs/${trace.run.id}?tab=history`}
            className="rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#155e57]"
          >
            Open claim history
          </Link>
          <Link
            href={`/runs/${trace.run.id}?tab=similar`}
            className="rounded-xl border border-[#b9dfd3] bg-white px-4 py-2.5 text-sm font-semibold text-[#155e57] transition hover:bg-[#eef8f5]"
          >
            View similar claims
          </Link>
        </div>
      </section>
    </div>
  );
}

function TraceFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <dt className="text-sm text-[#667571]">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-semibold text-[#20302e] sm:max-w-[62%] sm:text-right">
        {value}
      </dd>
    </div>
  );
}

function EvaluationsView({
  suites,
  loading,
}: {
  suites: EvalSuite[];
  loading: boolean;
}) {
  const latestRuns = suites
    .map((suite) => suite.latestRun)
    .filter((run): run is EvalRun => Boolean(run));
  const total = latestRuns.reduce((sum, run) => sum + run.totalCases, 0);
  const passed = latestRuns.reduce((sum, run) => sum + run.passedCases, 0);
  const rate = total ? passed / total : 0;
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,.72fr)] xl:items-start">
        <section className="rounded-2xl border border-[#dfe8e3] bg-white p-5 shadow-[0_8px_28px_rgba(18,63,59,0.045)] sm:p-6">
          <SectionHeader
            title="Workflow quality coverage"
            description="Quality checks cover each part of the ClaimFlow workflow."
            trailing={
              <span className="whitespace-nowrap rounded-full bg-[#eef8f5] px-3 py-1.5 text-xs font-semibold text-[#155e57]">
                Latest · {total ? formatPercentage(rate) : "No run"}
              </span>
            }
          />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {loading ? (
              <p className="text-sm text-[#667571]">Loading quality results…</p>
            ) : (
              suites.map((suite) => {
                const run = suite.latestRun;
                return (
                  <article
                    key={suite.suite}
                    className="rounded-xl border border-[#dfe8e3] bg-[#fbfaf6] p-4"
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <h3 className="min-w-0 break-words text-base font-semibold text-[#123f3b]">
                        {suite.title}
                      </h3>
                      <span className="shrink-0 text-sm font-semibold text-[#155e57]">
                        {run ? formatPercentage(run.passRate) : "No run"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#667571]">
                      {suite.description}
                    </p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f1f6f3]">
                      <span
                        className={`block h-full rounded-full ${(run?.passRate ?? 0) < 0.95 ? "bg-[#d68a2f]" : "bg-[#0f766e]"}`}
                        style={{ width: `${(run?.passRate ?? 0) * 100}%` }}
                      />
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
        <section className="rounded-2xl border border-[#dfe8e3] bg-white p-5 shadow-[0_8px_28px_rgba(18,63,59,0.045)] sm:p-6">
          <SectionHeader
            title="What this proves"
            description="A clear explanation of the protections behind the workflow."
          />
          <div className="mt-4 divide-y divide-[#dfe8e3] border-t border-[#dfe8e3]">
            <ProofItem
              title="Grounded"
              description="Policy answers stay connected to supporting clauses and evidence."
            />
            <ProofItem
              title="Guarded"
              description="ClaimFlow suggestions stay within approved actions and human approval boundaries."
            />
            <ProofItem
              title="Memory-safe"
              description="Prior patterns guide routing, never current claim facts."
            />
            <ProofItem
              title="Observable"
              description="Important AI and human workflow steps remain reviewable."
            />
          </div>
        </section>
      </div>
      <section className="rounded-2xl border border-[#dfe8e3] bg-white p-5 shadow-[0_8px_28px_rgba(18,63,59,0.045)] sm:p-6">
        <SectionHeader
          title="Latest quality reports"
          description="Warnings and failures remain visible instead of being hidden by the overall score."
        />
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-[#dfe8e3] text-xs text-[#667571]">
              <tr>
                <th className="pb-3 font-medium">Capability</th>
                <th className="pb-3 text-right font-medium">Passed</th>
                <th className="pb-3 text-right font-medium">Warnings</th>
                <th className="pb-3 text-right font-medium">Failed</th>
                <th className="pb-3 text-right font-medium">Pass rate</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dfe8e3]">
              {suites.map((suite) => (
                <tr key={suite.suite}>
                  <td className="py-4 pr-4">
                    <p className="font-semibold text-[#20302e]">
                      {suite.title}
                    </p>
                    <p className="mt-1 text-xs text-[#667571]">
                      {suite.latestRun
                        ? formatDate(suite.latestRun.createdAt)
                        : "No quality run"}
                    </p>
                  </td>
                  <td className="py-4 text-right">
                    {suite.latestRun?.passedCases ?? "—"}
                  </td>
                  <td className="py-4 text-right">
                    {suite.latestRun?.warningCases ?? "—"}
                  </td>
                  <td className="py-4 text-right">
                    {suite.latestRun?.failedCases ?? "—"}
                  </td>
                  <td className="py-4 text-right font-semibold text-[#155e57]">
                    {suite.latestRun
                      ? formatPercentage(suite.latestRun.passRate)
                      : "—"}
                  </td>
                  <td className="py-4 text-right">
                    {suite.latestRun ? (
                      <Link
                        href={`/evals/${suite.latestRun.id}`}
                        className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-[#0f766e] transition hover:bg-[#eef8f5]"
                      >
                        View report
                      </Link>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ProofItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="py-4">
      <p className="text-sm font-semibold text-[#20302e]">{title}</p>
      <p className="mt-1 text-sm leading-6 text-[#667571]">{description}</p>
    </div>
  );
}

export function OperationsExperience() {
  const searchParams = useSearchParams();
  const requestedRunId = searchParams.get("runId");
  const [view, setView] = useState<OperationsView>("overview");
  const [suites, setSuites] = useState<EvalSuite[]>([]);
  const [runs, setRuns] = useState<ExtractionRunRecord[]>([]);
  const [trace, setTrace] = useState<RunTraceResponse | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<RunTraceTimelineItem | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [traceLoading, setTraceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get<EvalSuiteResponse>("/api/evals/latest"),
      axios.get<RunsResponse>("/api/extraction-runs"),
      axios.get<ReviewTasksResponse>("/api/review-tasks"),
    ])
      .then(([evalResponse, runsResponse, reviewResponse]) => {
        const latestTaskByRun = new Map<string, ReviewTaskRecord>();
        for (const task of reviewResponse.data.reviewTasks) {
          const current = latestTaskByRun.get(task.runId);
          if (
            !current ||
            new Date(task.updatedAt).getTime() >
              new Date(current.updatedAt).getTime()
          ) {
            latestTaskByRun.set(task.runId, task);
          }
        }
        const enrichedRuns = runsResponse.data.runs.map((run) => ({
          ...run,
          reviewTask: latestTaskByRun.get(run.id) ?? run.reviewTask,
        }));
        setSuites(evalResponse.data.suites);
        setRuns(enrichedRuns);
        const selectedRunId =
          requestedRunId && enrichedRuns.some((run) => run.id === requestedRunId)
            ? requestedRunId
            : enrichedRuns[0]?.id ?? null;
        setSelectedRunId(selectedRunId);
        if (requestedRunId && selectedRunId === requestedRunId) {
          setView("traces");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load operations data.");
        setLoading(false);
      });
  }, [requestedRunId]);

  useEffect(() => {
    if (!selectedRunId) return;
    setTraceLoading(true);
    setSelectedStep(null);
    axios
      .get<RunTraceResponse>(`/api/extraction-runs/${selectedRunId}/trace`)
      .then((response) => {
        const timeline = displayTimeline(response.data.timeline);
        setTrace({ ...response.data, timeline });
        const preferred =
          [...timeline].reverse().find((item) => item.source === "agent") ??
          timeline.at(-1) ??
          null;
        setSelectedStep(preferred);
        setTraceLoading(false);
      })
      .catch(() => {
        setTrace(null);
        setTraceLoading(false);
      });
  }, [selectedRunId]);

  const selectedIdentity = useMemo(() => {
    const run = runs.find((item) => item.id === selectedRunId);
    return run ? claimIdentity(run) : null;
  }, [runs, selectedRunId]);

  const openTrace = (runId: string) => {
    setSelectedRunId(runId);
    setView("traces");
  };

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
              <label className="hidden min-w-0 max-w-xl flex-1 items-center gap-2 rounded-xl border border-[#dfe8e3] bg-[#fbfaf6] px-3 py-2.5 text-[#667571] sm:flex lg:mr-auto">
                <Icon name="search" />
                <span className="sr-only">Search claims</span>
                <input
                  type="search"
                  placeholder="Search claims"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#87928f]"
                />
              </label>
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
            <section className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-[#123f3b]">
                  AI operations
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#667571] sm:text-base">
                  See whether ClaimFlow is reliable, understand how an
                  individual claim moved through AI and human steps, and inspect
                  quality results when something needs investigation.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <span className="inline-flex min-h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-[#eef8f5] px-3 py-2 text-xs font-semibold text-[#155e57]">
                  <Icon name="shield" className="h-4 w-4 shrink-0" />
                  <span>Guardrails active</span>
                </span>
                <button
                  type="button"
                  onClick={() => setView("evaluations")}
                  className="whitespace-nowrap rounded-xl border border-[#b9dfd3] bg-white px-3 py-2 text-sm font-semibold text-[#155e57] transition hover:bg-[#eef8f5]"
                >
                  View latest quality report
                </button>
              </div>
            </section>
            {error ? (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            ) : null}
            <div
              className="mt-6 flex flex-col gap-2 border-b border-[#dfe8e3] pb-2 sm:flex-row"
              role="tablist"
              aria-label="Operations views"
            >
              {(
                [
                  ["overview", "Overview"],
                  ["traces", "Claim activity"],
                  ["evaluations", "Quality reports"],
                ] as Array<[OperationsView, string]>
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={view === value}
                  onClick={() => setView(value)}
                  className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${view === value ? "border-[#0f766e] bg-[#0f766e] text-white" : "border-[#dfe8e3] bg-white text-[#667571] hover:border-[#85d9c8] hover:text-[#155e57]"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-5">
              {view === "overview" ? (
                <OperationsOverview
                  suites={suites}
                  runs={runs}
                  trace={trace}
                  loading={loading}
                  onOpenTrace={openTrace}
                  onViewEvaluations={() => setView("evaluations")}
                />
              ) : null}
              {view === "traces" ? (
                <>
                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <label className="block min-w-0 text-sm font-semibold text-[#344441]">
                      <span>Claim activity</span>
                      <select
                        value={selectedRunId ?? ""}
                        onChange={(event) =>
                          setSelectedRunId(event.target.value)
                        }
                        className="mt-2 w-full min-w-0 rounded-xl border border-[#dfe8e3] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0f766e] focus:ring-4 focus:ring-[#dcefea] sm:min-w-80"
                      >
                        {runs.map((run) => {
                          const identity = claimIdentity(run);
                          return (
                            <option key={run.id} value={run.id}>
                              {identity.claimant} · {identity.claimNumber}
                            </option>
                          );
                        })}
                      </select>
                    </label>
                    {selectedIdentity ? (
                      <p className="text-sm text-[#667571]">
                        Inspecting {selectedIdentity.claimant}
                      </p>
                    ) : null}
                  </div>
                  <TraceExplorer
                    trace={trace}
                    loading={traceLoading}
                    selectedStep={selectedStep}
                    onSelectStep={setSelectedStep}
                  />
                </>
              ) : null}
              {view === "evaluations" ? (
                <EvaluationsView suites={suites} loading={loading} />
              ) : null}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
