"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  useDashboardStore,
  type AgentActionLogRecord,
  type ExtractionEventRecord,
  type ExtractionRunRecord,
  type RunMemoryAuditItemRecord,
} from "../../store/use-dashboard-store";
import { isValidationResultView } from "../../types/validation";
import { CoverageAssistantCard } from "./coverage-assistant-card";
import { UserAccountControl } from "../auth/user-account-control";

type WorkspaceTab =
  | "overview"
  | "evidence"
  | "policy"
  | "assistance"
  | "similar"
  | "history";
type AttentionItem = {
  key: string;
  label: string;
  description: string;
  kind: "field" | "evidence" | "conflict";
};

type AgentActionPresentation = {
  title: string;
  description: string;
  label: string;
  icon: IconName;
};

type AgentToolResultPresentation = {
  message: string | null;
  rationale: string | null;
  policyReferences: string[];
  evidence: string[];
  evidenceLabel: "Evidence considered" | "Unresolved evidence";
};

type IconName =
  | "activity"
  | "arrow-left"
  | "bell"
  | "book"
  | "brain"
  | "check"
  | "chevron-left"
  | "chevron-right"
  | "file"
  | "inbox"
  | "menu"
  | "search"
  | "send"
  | "shield"
  | "sparkles"
  | "upload"
  | "user"
  | "warning"
  | "x";

function Icon({
  name,
  className = "h-4 w-4",
}: {
  name: IconName;
  className?: string;
}) {
  const paths: Record<IconName, React.ReactNode> = {
    activity: <path d="M3 12h4l2-7 4 14 2-7h6" />,
    "arrow-left": (
      <>
        <path d="m12 19-7-7 7-7" />
        <path d="M19 12H5" />
      </>
    ),
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
        <path d="M9.5 4.5A3 3 0 0 0 4 6v1.5A3.5 3.5 0 0 0 3 14a3 3 0 0 0 3 3h.5A3.5 3.5 0 0 0 10 20.5V3.8" />
        <path d="M14.5 4.5A3 3 0 0 1 20 6v1.5a3.5 3.5 0 0 1 1 6.5 3 3 0 0 1-3 3h-.5a3.5 3.5 0 0 1-3.5 3.5V3.8" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    "chevron-left": <path d="m15 18-6-6 6-6" />,
    "chevron-right": <path d="m9 18 6-6-6-6" />,
    file: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6M8 13h8M8 17h6" />
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
    send: (
      <>
        <path d="m22 2-7 20-4-9-9-4Z" />
        <path d="M22 2 11 13" />
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
    upload: (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="m17 8-5-5-5 5M12 3v12" />
      </>
    ),
    user: (
      <>
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
    warning: (
      <>
        <path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    ),
    x: <path d="M18 6 6 18M6 6l12 12" />,
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
      <g fill="none" stroke="#85d9c8" strokeLinecap="round">
        <path d="M18 5.5 21 7.2 24 5.5" strokeWidth="1.5" />
        <path d="M21 7.2V3.6" strokeWidth="1.5" />
      </g>
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function memoryFeedbackRelevance(memory: RunMemoryAuditItemRecord) {
  for (const update of memory.updates) {
    if (!isRecord(update.metadata)) continue;
    if (update.metadata.source !== "reviewer_memory_feedback_ui") continue;

    const relevance = update.metadata.relevance;
    if (relevance === "CONFIRMED_RELEVANT" || relevance === "IRRELEVANT") {
      return relevance;
    }
  }

  return null;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      )
    : [];
}

function humanize(value: string) {
  return value
    .split(".")
    .at(-1)!
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function productText(value: string) {
  return value
    .replace(
      /extractedJson\.vehicle\.registrationNumber/gi,
      "the prepared vehicle registration",
    )
    .replace(/extractedJson/gi, "the originally prepared claim")
    .replace(/vehicle\.registrationNumber/gi, "vehicle registration")
    .replace(/vehicleRegistrationNumber/gi, "vehicle registration")
    .replace(/claimantName_or_insuredName/gi, "claimant or insured name")
    .replace(/policyNumber/gi, "policy number")
    .replace(/incident\.incidentDate/gi, "incident date")
    .replace(/incident\.incidentLocation/gi, "incident location")
    .replace(/police\.firNumber/gi, "FIR number")
    .replace(/current the prepared/gi, "the prepared")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeEvidence(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getReceivedFields(events: ExtractionEventRecord[]) {
  const fields = new Set<string>();
  events
    .filter((event) => event.type === "ADDITIONAL_INFORMATION_RECEIVED")
    .forEach((event) => {
      if (
        !isRecord(event.metadata) ||
        !Array.isArray(event.metadata.fieldValues)
      )
        return;
      event.metadata.fieldValues.forEach((item) => {
        if (isRecord(item) && typeof item.field === "string")
          fields.add(item.field.trim());
      });
    });
  return fields;
}

function getReceivedEvidence(events: ExtractionEventRecord[]) {
  const evidence = new Set<string>();
  events
    .filter(
      (event) =>
        event.type === "ADDITIONAL_EVIDENCE_RECEIVED" ||
        event.type === "ADDITIONAL_INFORMATION_RECEIVED",
    )
    .forEach((event) => {
      if (
        !isRecord(event.metadata) ||
        !Array.isArray(event.metadata.evidenceItems)
      )
        return;
      event.metadata.evidenceItems.forEach((item) => {
        if (isRecord(item) && typeof item.label === "string")
          evidence.add(normalizeEvidence(item.label));
      });
    });
  return evidence;
}

function attentionItemsFor(run: ExtractionRunRecord): AttentionItem[] {
  const validation = isValidationResultView(run.validationJson)
    ? run.validationJson
    : null;
  const reason = isRecord(run.reviewTask?.reasonJson)
    ? run.reviewTask.reasonJson
    : null;
  const missingFields =
    validation?.missingFields ??
    stringArray(run.missingFieldsJson).concat(
      stringArray(reason?.missingFields),
    );
  const requiredEvidence =
    validation?.requiredEvidence ?? stringArray(reason?.requiredEvidence);
  const receivedFields = getReceivedFields(run.events);
  const receivedEvidence = getReceivedEvidence(run.events);

  const fields: AttentionItem[] = Array.from(new Set(missingFields))
    .filter((field) => !receivedFields.has(field))
    .map((field) => ({
      key: `field-${field}`,
      label: `${humanize(field)} is missing`,
      description:
        "This required claim detail was not found in the source and needs reviewer confirmation.",
      kind: "field",
    }));

  const evidence: AttentionItem[] = Array.from(new Set(requiredEvidence))
    .filter((item) => !receivedEvidence.has(normalizeEvidence(item)))
    .map((item) => ({
      key: `evidence-${item}`,
      label: `${humanize(item)} is required`,
      description:
        "This supporting evidence is required before the claim can move forward.",
      kind: "evidence",
    }));

  const conflicts: AttentionItem[] = (validation?.conflicts ?? []).map(
    (conflict) => ({
      key: `conflict-${conflict.ruleId}-${conflict.field}`,
      label: `${humanize(conflict.field)} needs review`,
      description: conflict.message,
      kind: "conflict",
    }),
  );

  return [...fields, ...evidence, ...conflicts];
}

function formatDate(value: string | null, fallback = "Not provided") {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function formatCurrency(value: unknown, currency: unknown) {
  if (typeof value !== "number") return null;
  const currencyCode =
    typeof currency === "string" && currency ? currency : "INR";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currencyCode} ${value.toLocaleString("en-IN")}`;
  }
}

function latestGuardedAgentAction(
  logs: AgentActionLogRecord[] | undefined,
): AgentActionLogRecord | null {
  if (!logs?.length) return null;

  return (
    logs.find((log) =>
      ["EXECUTED", "BLOCKED", "FAILED"].includes(log.status),
    ) ??
    logs[0] ??
    null
  );
}

function agentActionPresentation(
  log: AgentActionLogRecord | null,
): AgentActionPresentation {
  if (!log) {
    return {
      title: "Let ClaimFlow recommend the next step",
      description:
        "Run one guarded agent step. ClaimFlow will inspect the prepared claim and choose one safe workflow action. Nothing is sent and no claim decision is made.",
      label: "Run guided next step",
      icon: "sparkles",
    };
  }

  if (log.status === "BLOCKED") {
    return {
      title: "A proposed action was safely held",
      description:
        "ClaimFlow's guardrails stopped the latest action before it could change the workflow. Review the guarded action and continue with human oversight.",
      label: "Review guarded action",
      icon: "shield",
    };
  }

  if (log.status === "FAILED") {
    return {
      title: "The guided step needs another try",
      description:
        "The latest guarded workflow action did not finish. The saved claim is unchanged and the step can be run again safely.",
      label: "Retry guided next step",
      icon: "sparkles",
    };
  }

  const presentations: Record<string, AgentActionPresentation> = {
    DRAFT_INFORMATION_REQUEST: {
      title: "Review the prepared information request",
      description:
        "ClaimFlow prepared one guarded request for the unresolved information and evidence. A reviewer must approve the next step.",
      label: "Review information request",
      icon: "send",
    },
    DRAFT_FOLLOWUP_REQUEST: {
      title: "Review the prepared follow-up",
      description:
        "ClaimFlow prepared a guarded follow-up for the outstanding claim material. It has not been sent.",
      label: "Review prepared follow-up",
      icon: "send",
    },
    REQUEST_MISSING_DOCUMENT: {
      title: "Request the missing document",
      description:
        "The guarded agent identified a document that is still needed before this claim can move forward.",
      label: "Review document request",
      icon: "file",
    },
    MARK_NEEDS_MORE_EVIDENCE: {
      title: "Additional evidence is needed",
      description:
        "The guarded agent routed this claim for more evidence. Review the request before continuing.",
      label: "Review evidence request",
      icon: "file",
    },
    MARK_NEEDS_MORE_INFO: {
      title: "Additional information is needed",
      description:
        "The guarded agent paused the workflow for missing claim information. Review what the claimant needs to provide.",
      label: "Review information request",
      icon: "send",
    },
    CREATE_REVIEW_TASK: {
      title: "Continue to human review",
      description:
        "The guarded agent routed this claim to a reviewer. ClaimFlow has not made a claim decision.",
      label: "Open human review",
      icon: "user",
    },
    ESCALATE_TO_HUMAN: {
      title: "Human review is required",
      description:
        "The guarded agent found a condition that needs reviewer judgment and escalated the claim safely.",
      label: "Open human review",
      icon: "user",
    },
    RETRIEVE_POLICY_CLAUSES: {
      title: "Policy evidence was retrieved",
      description:
        "The latest guarded action retrieved claim-relevant policy clauses for workflow routing. Asking a policy question remains optional.",
      label: "View guarded action",
      icon: "book",
    },
    DRAFT_APPROVAL_NOTE: {
      title: "Review the prepared approval note",
      description:
        "ClaimFlow drafted reviewer guidance from the current claim state. A human reviewer still owns the final decision.",
      label: "Review suggested decision",
      icon: "user",
    },
    DRAFT_DENIAL_REASON: {
      title: "Review the prepared decision rationale",
      description:
        "ClaimFlow prepared guarded rationale for reviewer consideration. It has not rejected the claim.",
      label: "Review suggested decision",
      icon: "user",
    },
    ASK_CLARIFICATION: {
      title: "Clarification is needed",
      description:
        "The guarded agent identified an ambiguity that needs a reviewer or claimant response before the workflow continues.",
      label: "Review clarification",
      icon: "warning",
    },
    NO_ACTION: {
      title: "No additional workflow action is needed",
      description:
        "The guarded agent checked the current claim state and found no safe or necessary automated workflow action.",
      label: "View guided check",
      icon: "check",
    },
  };

  return (
    presentations[log.action] ?? {
      title: "A guarded next step is ready",
      description:
        "ClaimFlow prepared the next workflow action from the current claim state. Review it before continuing.",
      label: "View guarded action",
      icon: "shield",
    }
  );
}

function agentActionReason(log: AgentActionLogRecord | null) {
  if (!log) return null;
  if (log.blockedReason) return productText(log.blockedReason);

  const toolInput = isRecord(log.toolInputJson) ? log.toolInputJson : null;
  const toolRationale = toolInput ? asString(toolInput.rationale) : null;

  if (toolRationale) return productText(toolRationale);
  if (log.rationale && !/^agent proposed tool\b/i.test(log.rationale)) {
    return productText(log.rationale);
  }

  return null;
}

function parseToolResult(value: unknown): Record<string, unknown> | null {
  if (isRecord(value)) return value;
  if (typeof value !== "string") return null;

  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function agentToolResult(
  log: AgentActionLogRecord | null,
): AgentToolResultPresentation | null {
  if (!log || log.status !== "EXECUTED") return null;

  const storedOutput = isRecord(log.toolOutputJson)
    ? log.toolOutputJson.toolOutput
    : log.toolOutputJson;
  const output = parseToolResult(storedOutput);
  if (!output) return null;

  const data = isRecord(output.data) ? output.data : null;
  const rationale = data ? asString(data.rationale) : null;
  const approvalEvidence = data ? stringArray(data.evidenceSummary) : [];
  const unresolvedEvidence = data ? stringArray(data.missingEvidence) : [];
  const evidence = approvalEvidence.length ? approvalEvidence : unresolvedEvidence;
  const message = asString(output.message);
  const policyReferences = data ? stringArray(data.citedClauseIds) : [];

  if (!message && !rationale && !evidence.length && !policyReferences.length) {
    return null;
  }

  return {
    message: message ? productText(message) : null,
    rationale: rationale ? productText(rationale) : null,
    policyReferences: policyReferences.map(productText),
    evidence: evidence.map(productText),
    evidenceLabel: approvalEvidence.length
      ? "Evidence considered"
      : "Unresolved evidence",
  };
}

function friendlyEvent(event: ExtractionEventRecord) {
  const labels: Record<string, { label: string; icon: IconName }> = {
    DOCUMENT_UPLOADED: { label: "Claim source received", icon: "upload" },
    DOCUMENT_SOFT_DELETED: { label: "Claim source archived", icon: "file" },
    DOCUMENT_RESTORED: { label: "Claim source restored", icon: "file" },
    DUPLICATE_UPLOAD_DETECTED: {
      label: "Duplicate claim source identified",
      icon: "warning",
    },
    EXTRACTION_STARTED: {
      label: "Claim preparation started",
      icon: "sparkles",
    },
    MODEL_RESPONSE_RECEIVED: {
      label: "Claim facts prepared",
      icon: "sparkles",
    },
    EXTRACTION_COMPLETED: { label: "Claim facts organized", icon: "sparkles" },
    VALIDATION_STARTED: { label: "Readiness checks started", icon: "activity" },
    VALIDATION_COMPLETED: {
      label: "Completeness checks finished",
      icon: "check",
    },
    MISSING_FIELDS_DETECTED: {
      label: "Missing information identified",
      icon: "warning",
    },
    CONFLICTS_DETECTED: {
      label: "Conflicting information identified",
      icon: "warning",
    },
    MEMORY_RETRIEVED: {
      label: "Relevant workflow memory checked",
      icon: "brain",
    },
    AGENT_ACTION_BLOCKED: {
      label: "Guardrail paused an unsafe action",
      icon: "shield",
    },
    AGENT_TOOL_EXECUTED: {
      label: "Guarded workflow action prepared",
      icon: "shield",
    },
    FOLLOWUP_DRAFT_CREATED: {
      label: "Information request drafted",
      icon: "send",
    },
    ADDITIONAL_INFORMATION_RECEIVED: {
      label: "Additional information recorded",
      icon: "inbox",
    },
    ADDITIONAL_EVIDENCE_RECEIVED: {
      label: "Additional evidence recorded",
      icon: "file",
    },
    RUN_NEEDS_REVIEW: {
      label: "Claim routed for human attention",
      icon: "user",
    },
    RUN_COMPLETED: { label: "Claim ready for decision", icon: "check" },
    RUN_FAILED: { label: "Claim preparation paused", icon: "warning" },
    AGENT_STEP_STARTED: {
      label: "ClaimFlow reviewed the next safe step",
      icon: "shield",
    },
    AGENT_ACTION_PROPOSED: {
      label: "Next workflow step proposed",
      icon: "sparkles",
    },
    MEMORY_FEEDBACK_RECORDED: {
      label: "Similar-claim feedback recorded",
      icon: "brain",
    },
    REVIEW_REOPENED: { label: "Human review reopened", icon: "user" },
  };
  return (
    labels[event.type] ?? {
      label: humanize(event.type),
      icon: "activity" as const,
    }
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
    {
      href: "/dashboard",
      label: "Claims",
      icon: "file" as const,
      active: true,
    },
    { href: "/review", label: "Review queue", icon: "inbox" as const },
    { href: "/review", label: "Resolved", icon: "check" as const },
    { href: "/evals", label: "Operations", icon: "activity" as const },
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

export function NeedsAttentionWorkspace({ run }: { run: ExtractionRunRecord }) {
  const searchParams = useSearchParams();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const requestedTab = searchParams.get("tab");
  const initialTab: WorkspaceTab =
    requestedTab === "evidence" ||
    requestedTab === "policy" ||
    requestedTab === "assistance" ||
    requestedTab === "similar" ||
    requestedTab === "history"
      ? requestedTab
      : "overview";
  const [tab, setTab] = useState<WorkspaceTab>(initialTab);
  const memories = useDashboardStore(
    (state) => state.runMemoriesByRunId[run.id],
  );
  const memoryRetrievalOutcome = useDashboardStore(
    (state) => state.runMemoryRetrievalOutcomeByRunId[run.id],
  );
  const isFetchingMemories = useDashboardStore(
    (state) => state.isFetchingRunMemories,
  );
  const isRetrievingMemories = useDashboardStore(
    (state) => state.isRetrievingRunMemories,
  );
  const memoryFeedbackInFlightId = useDashboardStore(
    (state) => state.memoryFeedbackInFlightId,
  );
  const isRunningAgentStep = useDashboardStore(
    (state) => state.isRunningAgentStep,
  );
  const isExtractingRun = useDashboardStore((state) => state.isExtractingRun);
  const isValidatingRun = useDashboardStore((state) => state.isValidatingRun);
  const error = useDashboardStore((state) => state.error);
  const fetchRunMemories = useDashboardStore((state) => state.fetchRunMemories);
  const retrieveRunMemories = useDashboardStore(
    (state) => state.retrieveRunMemories,
  );
  const submitMemoryFeedback = useDashboardStore(
    (state) => state.submitMemoryFeedback,
  );
  const runAgentStep = useDashboardStore((state) => state.runAgentStep);
  const extractRun = useDashboardStore((state) => state.extractRun);
  const validateRun = useDashboardStore((state) => state.validateRun);

  useEffect(() => {
    void fetchRunMemories(run.id);
  }, [fetchRunMemories, run.id]);
  const extraction = isRecord(run.extractedJson) ? run.extractedJson : {};
  const claimantRecord = isRecord(extraction.claimant)
    ? extraction.claimant
    : {};
  const policy = isRecord(extraction.policy) ? extraction.policy : {};
  const vehicle = isRecord(extraction.vehicle) ? extraction.vehicle : {};
  const incident = isRecord(extraction.incident) ? extraction.incident : {};
  const damage = isRecord(extraction.damage) ? extraction.damage : {};
  const items = useMemo(() => attentionItemsFor(run), [run]);
  const claimant =
    asString(extraction.claimantName) ??
    asString(extraction.insuredName) ??
    asString(claimantRecord.name) ??
    run.document.filename;
  const claimNumber =
    asString(extraction.claimNumber) ??
    `Claim ${run.id.slice(0, 8).toUpperCase()}`;
  const initials =
    claimant
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "CF";
  const vehicleLabel =
    [asString(vehicle.make), asString(vehicle.model)]
      .filter(Boolean)
      .join(" ") ||
    asString(vehicle.registrationNumber) ||
    "Vehicle details pending";
  const lossType = asString(incident.lossType)
    ? humanize(asString(incident.lossType)!)
    : asString(policy.productType)
      ? humanize(asString(policy.productType)!)
      : "Motor claim";
  const incidentDescription =
    asString(incident.description) ??
    "The claim source was organized successfully. Review the missing items before continuing.";
  const damagedParts = stringArray(damage.damagedParts);
  const repairCost = formatCurrency(
    damage.estimatedRepairCost ?? extraction.claimedAmount,
    damage.currency,
  );
  const incidentDate =
    asString(incident.incidentDate) ?? asString(incident.date);
  const incidentLocation =
    asString(incident.incidentLocation) ?? asString(incident.location);
  const policyNumber =
    asString(extraction.policyNumber) ?? asString(policy.policyNumber);
  const policyRetrieved =
    run.agentActionLogs?.some(
      (log) =>
        log.action === "RETRIEVE_POLICY_CLAUSES" && log.status === "EXECUTED",
    ) ?? false;
  const memoryChecked = run.events.some(
    (event) => event.type === "MEMORY_RETRIEVED",
  );
  const guardrailApplied =
    run.agentActionLogs?.some(
      (log) =>
        log.guardrailDecision === "ALLOWED" ||
        log.guardrailDecision === "BLOCKED",
    ) ?? false;
  const draftReady = (run.followupDrafts?.length ?? 0) > 0;
  const needsInformationRequest = items.some(
    (item) => item.kind === "field" || item.kind === "evidence",
  );
  const latestAgentAction = latestGuardedAgentAction(run.agentActionLogs);
  const guidedAction = agentActionPresentation(latestAgentAction);
  const guidedActionReason = agentActionReason(latestAgentAction);
  const latestToolResult = agentToolResult(latestAgentAction);
  const primaryActionLabel = needsInformationRequest
    ? draftReady
      ? "Review information request"
      : "Prepare information request"
    : run.reviewTask?.id
      ? "Open human review"
      : guidedAction.label;
  const primaryActionIcon: IconName = needsInformationRequest
    ? "send"
    : run.reviewTask?.id
      ? "user"
      : guidedAction.icon;
  const visibleEvents = run.events.slice().reverse();
  const reviewStatus = run.reviewTask?.status;
  const isResolved =
    reviewStatus === "APPROVED" ||
    reviewStatus === "EDITED_AND_APPROVED" ||
    reviewStatus === "REJECTED";
  const canStartPreparation = run.status === "UPLOADED";
  const canStartValidation =
    run.status === "VALIDATING" && !isExtractingRun && !isValidatingRun;
  const isPreparationInProgress =
    run.status === "EXTRACTING" || isExtractingRun || isValidatingRun;
  const isPreparing =
    canStartPreparation || canStartValidation || isPreparationInProgress;
  const isPreparationFailed = run.status === "FAILED";
  const workspaceStatus = isResolved
    ? reviewStatus === "REJECTED"
      ? "Rejected"
      : reviewStatus === "EDITED_AND_APPROVED"
        ? "Edited and approved"
        : "Approved"
    : reviewStatus === "NEEDS_MORE_INFO"
      ? "Waiting for information"
      : reviewStatus === "IN_REVIEW"
        ? "In review"
        : run.status === "COMPLETED" || reviewStatus === "PENDING"
          ? items.length
            ? "Needs attention"
            : "Ready for review"
        : canStartPreparation
          ? "Ready to prepare"
          : canStartValidation
            ? "Ready to validate"
            : isPreparationInProgress
              ? "Preparing claim"
          : isPreparationFailed
            ? "Preparation paused"
            : "Needs attention";
  const attentionTitle = canStartPreparation
    ? "Start preparing this claim"
    : canStartValidation
      ? "Validate the prepared claim"
      : isPreparationInProgress
        ? "ClaimFlow is preparing this claim"
    : isPreparationFailed
      ? "Claim preparation needs attention"
      : isResolved
        ? "Claim decision complete"
        : items.length
          ? "What needs your attention"
          : "Claim is ready to move forward";
  const attentionDescription = canStartPreparation
    ? "Extract the claim facts from the received source, then run completeness and evidence checks."
    : canStartValidation
      ? "The claim facts are organized. Run validation to identify missing details, required evidence and conflicts."
      : isPreparationInProgress
        ? "ClaimFlow is organizing the claim facts and running its readiness checks."
    : isPreparationFailed
      ? "ClaimFlow could not finish organizing this source. Retry preparation without uploading the claim again."
      : isResolved
        ? "The final human decision and reviewer notes are available in the decision summary."
      : items.length
          ? `ClaimFlow found ${items.length === 1 ? "one item" : `${items.length} items`} that should be resolved before the claim moves forward.`
          : run.reviewTask?.id
            ? "The claim is ready for its assigned human review task."
            : latestAgentAction
              ? "ClaimFlow prepared a guarded next step from the current claim state."
              : "The claim is ready for ClaimFlow to prepare one guarded workflow recommendation.";
  const attentionBadge = canStartPreparation
    ? "Ready to start"
    : canStartValidation
      ? "Validation ready"
      : isPreparationInProgress
        ? "In progress"
    : isPreparationFailed
      ? "Retry available"
      : items.length
        ? `${items.length} unresolved`
        : isResolved
          ? workspaceStatus
          : "Review required";

  async function prepareClaim() {
    if (run.status === "VALIDATING") {
      await validateRun(run.id);
      return;
    }

    const extracted = await extractRun(run.id);
    if (extracted) await validateRun(run.id);
  }

  async function openNextStep() {
    if (run.reviewTask?.id && !needsInformationRequest) return;
    setTab("assistance");

    if (
      !needsInformationRequest &&
      (!latestAgentAction || latestAgentAction.status === "FAILED")
    ) {
      await runAgentStep(run.id);
    }
  }

  const progressSteps = [
    {
      label: "Claim received",
      detail: run.document.sourceType === "PDF" ? "1 PDF" : "Email text",
      state: "done",
    },
    {
      label: "Facts prepared",
      detail: run.extractedJson
        ? "Claim organized"
        : isPreparationFailed
          ? "Retry needed"
          : canStartPreparation
            ? "Ready to start"
            : "In progress",
      state: run.extractedJson
        ? "done"
        : canStartPreparation
          ? "pending"
          : "current",
    },
    {
      label: "Needs addressed",
      detail:
        canStartPreparation || isPreparationInProgress
          ? "Pending"
          : canStartValidation
            ? "Validation pending"
            : items.length
              ? `${items.length} ${items.length === 1 ? "item" : "items"}`
              : "Complete",
      state:
        isResolved || (!items.length && run.status === "COMPLETED")
          ? "done"
          : canStartValidation
            ? "current"
          : run.extractedJson
            ? "current"
            : "pending",
    },
    {
      label: "Human decision",
      detail: isResolved
        ? workspaceStatus
        : reviewStatus === "IN_REVIEW"
          ? "In review"
          : "Pending",
      state: isResolved
        ? "done"
        : reviewStatus === "IN_REVIEW" ||
            (!items.length && run.status === "COMPLETED")
          ? "current"
          : "pending",
    },
  ];

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
                Search claims
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

          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#667571] transition hover:text-[#155e57]"
            >
              <Icon name="arrow-left" />
              Back to claims
            </Link>
            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#dcefea] text-sm font-semibold text-[#123f3b]">
                  {initials}
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-semibold tracking-tight text-[#123f3b]">
                    {claimNumber} · {claimant}
                  </h1>
                  <p className="mt-1 text-sm text-[#667571]">
                    {lossType} · {vehicleLabel} · Uploaded{" "}
                    {formatDate(run.document.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${isResolved ? (reviewStatus === "REJECTED" ? "bg-red-50 text-red-700" : "bg-[#dcefea] text-[#155e57]") : reviewStatus === "NEEDS_MORE_INFO" ? "bg-[#eef8f5] text-[#4e7d75]" : "bg-[#fff7e8] text-[#674617]"}`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${isResolved ? (reviewStatus === "REJECTED" ? "bg-red-500" : "bg-[#0f766e]") : reviewStatus === "NEEDS_MORE_INFO" ? "bg-[#4e9d7e]" : "bg-[#d68a2f]"}`}
                  />
                  {workspaceStatus}
                </span>
                <button
                  type="button"
                  onClick={() => setTab("evidence")}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#dfe8e3] bg-white px-3 py-2 text-sm font-semibold text-[#667571] transition hover:border-[#b9dfd3] hover:text-[#123f3b]"
                >
                  <Icon name="file" />
                  View evidence
                </button>
              </div>
            </div>

            <section
              className="mt-6 grid gap-3 border-y border-[#dfe8e3] py-4 sm:grid-cols-4"
              aria-label="Claim progress"
            >
              {progressSteps.map((step, index) => (
                <div key={step.label} className="flex items-start gap-2">
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border ${step.state === "done" ? "border-[#85d9c8] bg-[#dcefea] text-[#0f766e]" : step.state === "current" ? "border-[#e4b66c] bg-[#fff7e8] text-[#d68a2f]" : "border-[#dfe8e3] bg-white text-[#87928f]"}`}
                  >
                    {step.state === "done" ? (
                      <Icon name="check" />
                    ) : step.state === "current" ? (
                      <Icon name="warning" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#20302e]">
                      {step.label}
                    </p>
                    <p className="mt-1 text-xs text-[#667571]">{step.detail}</p>
                  </div>
                </div>
              ))}
            </section>

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.75fr)]">
              <div className="min-w-0 space-y-5">
                <section className="rounded-2xl border border-[#ecd3a9] bg-[#fffaf0] p-5 shadow-[0_6px_20px_rgba(18,63,59,0.035)] sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-[#123f3b]">
                        {attentionTitle}
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-[#667571]">
                        {attentionDescription}
                      </p>
                    </div>
                    <span className="w-fit rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-[#674617] ring-1 ring-[#ecd3a9]">
                      {attentionBadge}
                    </span>
                  </div>
                  <div className="mt-4 divide-y divide-[#eadfcf] border-y border-[#eadfcf]">
                    {items.length ? (
                      items.map((item) => (
                        <article
                          key={item.key}
                          className="flex items-start gap-3 py-4"
                        >
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#fff1d5] text-[#c47a18]">
                            <Icon
                              name={
                                item.kind === "evidence" ? "file" : "warning"
                              }
                            />
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-semibold text-[#20302e]">
                                {item.label}
                              </h3>
                              <span className="rounded-md bg-white px-2 py-1 text-[11px] font-medium text-[#667571] ring-1 ring-[#e7ded0]">
                                {item.kind === "field"
                                  ? "Required detail"
                                  : item.kind === "evidence"
                                    ? "Evidence needed"
                                    : "Conflict"}
                              </span>
                            </div>
                            <p className="mt-1 text-sm leading-6 text-[#667571]">
                              {item.description}
                            </p>
                            <p className="mt-2 text-xs text-[#667571]">
                              Found during validation · Human confirmation
                              required
                            </p>
                          </div>
                        </article>
                      ))
                    ) : (
                      <p className="py-4 text-sm text-[#667571]">
                        {canStartPreparation
                          ? "The source has been received and is ready for claim preparation."
                          : canStartValidation
                            ? "The claim facts are prepared and ready for validation."
                            : isPreparationInProgress
                              ? "ClaimFlow is organizing the facts and checking completeness."
                          : isPreparationFailed
                            ? "The claim source is still available and can be prepared again safely."
                            : isResolved
                              ? "No unresolved items remain on this claim."
                              : "No unresolved information or evidence is currently recorded."}
                      </p>
                    )}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    {isPreparing ? (
                      <button
                        type="button"
                        disabled={isPreparationInProgress}
                        onClick={() => void prepareClaim()}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(15,118,110,0.14)] transition hover:bg-[#155e57] disabled:cursor-wait disabled:bg-[#9bb8b1]"
                      >
                        <Icon name="sparkles" />
                        {isPreparationInProgress
                          ? "Preparing and validating…"
                          : canStartValidation
                            ? "Run validation"
                            : "Prepare and validate claim"}
                      </button>
                    ) : isPreparationFailed ? (
                      <button
                        type="button"
                        disabled={isExtractingRun || isValidatingRun}
                        onClick={() => void prepareClaim()}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(15,118,110,0.14)] transition hover:bg-[#155e57] disabled:cursor-wait disabled:bg-[#9bb8b1]"
                      >
                        <Icon name="sparkles" />
                        {isExtractingRun || isValidatingRun
                          ? "Preparing claim…"
                          : "Retry preparation"}
                      </button>
                    ) : run.reviewTask?.id && !needsInformationRequest ? (
                      <Link
                        href={`/review/${run.reviewTask.id}`}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(15,118,110,0.14)] transition hover:bg-[#155e57]"
                      >
                        <Icon name={primaryActionIcon} />
                        {isResolved
                          ? "View decision summary"
                          : primaryActionLabel}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled={isRunningAgentStep}
                        onClick={() => void openNextStep()}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(15,118,110,0.14)] transition hover:bg-[#155e57] disabled:cursor-wait disabled:bg-[#9bb8b1]"
                      >
                        <Icon name={primaryActionIcon} />
                        {isRunningAgentStep
                          ? "Preparing next step…"
                          : primaryActionLabel}
                      </button>
                    )}
                    {!isPreparing && !isPreparationFailed ? (
                      <button
                        type="button"
                        onClick={() => setTab("evidence")}
                        className="inline-flex items-center gap-2 rounded-xl border border-[#dfe8e3] bg-white px-4 py-2.5 text-sm font-semibold text-[#667571] transition hover:border-[#b9dfd3] hover:text-[#123f3b]"
                      >
                        <Icon name="inbox" />
                        Review evidence
                      </button>
                    ) : null}
                    {needsInformationRequest && run.reviewTask?.id ? (
                      <Link
                        href={`/review/${run.reviewTask.id}`}
                        className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-[#667571] transition hover:bg-white hover:text-[#123f3b]"
                      >
                        <Icon name="user" />
                        Open review task
                      </Link>
                    ) : null}
                  </div>
                  {needsInformationRequest ? (
                    <p className="mt-3 flex items-center gap-2 text-xs text-[#667571]">
                      <Icon name="shield" />
                      Nothing is sent without human approval.
                    </p>
                  ) : null}
                </section>

                <section className="rounded-2xl border border-[#dfe8e3] bg-white p-5 shadow-[0_6px_20px_rgba(18,63,59,0.035)] sm:p-6">
                  {error ? (
                    <div
                      role="alert"
                      className="mb-4 rounded-xl border border-[#ead5b5] bg-[#fff8ec] px-4 py-3 text-sm leading-6 text-[#7a5522]"
                    >
                      {error === "Workflow memory not found."
                        ? "This similar-claim guidance is no longer available. Refresh the guidance before recording feedback."
                        : error}
                    </div>
                  ) : null}
                  <div
                    className="flex flex-wrap gap-2 border-b border-[#dfe8e3] pb-4"
                    aria-label="Claim workspace sections"
                  >
                    {(
                      [
                        "overview",
                        "evidence",
                        "policy",
                        "assistance",
                        "similar",
                        "history",
                      ] as WorkspaceTab[]
                    ).map((value) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={tab === value}
                        onClick={() => setTab(value)}
                        className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${tab === value ? "border-[#85d9c8] bg-[#dcefea] text-[#123f3b]" : "border-transparent text-[#667571] hover:bg-[#eef8f5] hover:text-[#155e57]"}`}
                      >
                        {value === "policy"
                          ? "Policy guidance"
                          : value === "assistance"
                            ? "AI assistance"
                            : value === "similar"
                              ? "Similar claims"
                              : value === "history"
                                ? "History"
                                : value[0]!.toUpperCase() + value.slice(1)}
                      </button>
                    ))}
                  </div>

                  {tab === "overview" ? (
                    <div className="pt-5">
                      <p className="text-sm leading-6 text-[#667571]">
                        {incidentDescription}
                      </p>
                      <dl className="mt-5 divide-y divide-[#dfe8e3] border-y border-[#dfe8e3] text-sm">
                        {[
                          ["Claimant", claimant],
                          ["Policy number", policyNumber ?? "Not provided"],
                          ["Vehicle", vehicleLabel],
                          [
                            "Registration",
                            asString(vehicle.registrationNumber) ??
                              "Not provided",
                          ],
                          ["Incident", lossType],
                          ["Incident date", formatDate(incidentDate)],
                          ["Location", incidentLocation ?? "Not provided"],
                          [
                            "Reported damage",
                            damagedParts.length
                              ? damagedParts.map(humanize).join(", ")
                              : asString(damage.damageSeverity)
                                ? humanize(asString(damage.damageSeverity)!)
                                : "Not provided",
                          ],
                          [
                            "Estimated repair cost",
                            repairCost ?? "Not provided",
                          ],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5"
                          >
                            <dt className="text-[#667571]">{label}</dt>
                            <dd className="font-semibold text-[#20302e] sm:text-right">
                              {value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ) : null}

                  {tab === "evidence" ? (
                    <div className="pt-5">
                      <div className="divide-y divide-[#dfe8e3] border-y border-[#dfe8e3]">
                        {" "}
                        <div className="flex items-start justify-between gap-4 py-4">
                          <div>
                            <p className="text-sm font-semibold text-[#20302e]">
                              {run.document.filename}
                            </p>
                            <p className="mt-1 text-xs text-[#667571]">
                              {run.document.sourceType === "PDF"
                                ? "Source PDF"
                                : "Original email text"}{" "}
                              · Used to create this claim
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-[#0f766e]">
                            Received
                          </span>
                        </div>
                        {items
                          .filter((item) => item.kind === "evidence")
                          .map((item) => (
                            <div
                              key={item.key}
                              className="flex items-start justify-between gap-4 py-4"
                            >
                              <div>
                                <p className="text-sm font-semibold text-[#20302e]">
                                  {item.label.replace(/ is required$/i, "")}
                                </p>
                                <p className="mt-1 text-xs text-[#667571]">
                                  Required by validation and not recorded as
                                  received
                                </p>
                              </div>
                              <span className="text-sm font-semibold text-[#c47a18]">
                                Missing
                              </span>
                            </div>
                          ))}
                      </div>
                      {run.document.sourceType === "EMAIL_TEXT" &&
                      run.document.contentText ? (
                        <div className="mt-5">
                          <p className="text-sm font-semibold text-[#123f3b]">
                            Original email
                          </p>
                          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-[#fbfaf6] p-4 text-sm leading-6 text-[#667571]">
                            {run.document.contentText}
                          </pre>
                        </div>
                      ) : (
                        <p className="mt-4 text-xs leading-5 text-[#667571]">
                          The PDF is stored by the existing document pipeline.
                          File preview is not exposed by the current backend.
                        </p>
                      )}
                    </div>
                  ) : null}

                  {tab === "policy" ? (
                    <div className="pt-5">
                      <CoverageAssistantCard
                        runId={run.id}
                        status={run.status}
                      />
                    </div>
                  ) : null}

                  {tab === "assistance" ? (
                    <div className="pt-5">
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#eef8f5] px-4 py-3">
                        <p className="flex items-center gap-2 text-sm font-semibold text-[#155e57]">
                          <Icon name="shield" />
                          Guardrails active
                        </p>
                        <span className="text-xs font-semibold text-[#4e7d75]">
                          Guarded result recorded
                        </span>
                      </div>
                      <div className="mt-5">
                        <h2 className="text-lg font-semibold text-[#123f3b]">
                          {guidedAction.title}
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-[#667571]">
                          {needsInformationRequest
                            ? "Prepare one clear request for the unresolved information and evidence. ClaimFlow will draft it, but cannot send it or decide the claim."
                            : guidedAction.description}
                        </p>
                      </div>
                      <div className="mt-4 divide-y divide-[#dfe8e3] border-y border-[#dfe8e3]">
                        <div className="flex items-start gap-3 py-4">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#dcefea] text-[#0f766e]">
                            <Icon name="check" />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-[#20302e]">
                              Claim checked
                            </p>
                            <p className="mt-1 text-xs leading-5 text-[#667571]">
                              Missing details and evidence were confirmed
                              against the prepared claim.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 py-4">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#dcefea] text-[#0f766e]">
                            <Icon name="book" />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-[#20302e]">
                              Policy considered
                            </p>
                            <p className="mt-1 text-xs leading-5 text-[#667571]">
                              Only claim-relevant policy requirements can guide
                              the next step.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 py-4">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#dcefea] text-[#0f766e]">
                            <Icon name="shield" />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-[#20302e]">
                              Action safely limited
                            </p>
                            <p className="mt-1 text-xs leading-5 text-[#667571]">
                              ClaimFlow may prepare a draft, but cannot send it
                              or make a claim decision.
                            </p>
                          </div>
                        </div>
                      </div>
                      {latestAgentAction ? (
                        <div className="mt-5 rounded-xl border border-[#b9dfd3] bg-[#eef8f5] px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-[#0f766e]">
                              <Icon name={guidedAction.icon} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-[#123f3b]">
                                Latest guarded action
                              </p>
                              <p className="mt-0.5 text-xs text-[#4e7d75]">
                                {guidedAction.title} · {latestAgentAction.status === "EXECUTED" ? "Completed" : latestAgentAction.status === "BLOCKED" ? "Held by guardrails" : latestAgentAction.status === "FAILED" ? "Needs retry" : "Prepared"}
                              </p>
                            </div>
                          </div>
                          {guidedActionReason ? (
                            <div className="mt-3 border-t border-[#b9dfd3] pt-3">
                              <p className="text-xs font-semibold text-[#123f3b]">
                                {latestAgentAction.status === "BLOCKED"
                                  ? "Why the action was held"
                                  : "Why ClaimFlow recommended this"}
                              </p>
                              <p className="mt-1 text-sm leading-6 text-[#4e6965]">
                                {guidedActionReason}
                              </p>
                            </div>
                          ) : null}
                          {latestToolResult ? (
                            <div className="mt-3 border-t border-[#b9dfd3] pt-3">
                              <p className="text-xs font-semibold text-[#123f3b]">
                                What ClaimFlow returned
                              </p>
                              {latestToolResult.message ? (
                                <p className="mt-1 text-sm leading-6 text-[#4e6965]">
                                  {latestToolResult.message}
                                </p>
                              ) : null}
                              {latestToolResult.rationale ? (
                                <div className="mt-3 rounded-lg bg-white/80 px-3 py-3">
                                  <p className="text-xs font-semibold text-[#155e57]">
                                    Prepared rationale
                                  </p>
                                  <p className="mt-1 text-sm leading-6 text-[#4e6965]">
                                    {latestToolResult.rationale}
                                  </p>
                                </div>
                              ) : null}
                              {latestToolResult.policyReferences.length ? (
                                <div className="mt-3">
                                  <p className="text-xs font-semibold text-[#155e57]">
                                    Policy references
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {latestToolResult.policyReferences.map((reference) => (
                                      <span key={reference} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-[#4e6965]">
                                        {reference}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                              {latestToolResult.evidence.length ? (
                                <div className="mt-3">
                                  <p className="text-xs font-semibold text-[#155e57]">
                                    {latestToolResult.evidenceLabel}
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {latestToolResult.evidence.map((item) => (
                                      <span key={item} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-[#4e6965]">
                                        {item}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      {(run.followupDrafts ?? []).slice(0, 1).map((draft) => (
                        <section
                          key={draft.id}
                          className="mt-5 rounded-xl border border-[#b9dfd3] bg-[#eef8f5] p-4"
                        >
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4e7d75]">
                            Prepared information request
                          </p>
                          <h3 className="mt-2 text-sm font-semibold text-[#123f3b]">
                            {draft.subject}
                          </h3>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#667571]">
                            {draft.body}
                          </p>
                        </section>
                      ))}
                      {needsInformationRequest && !draftReady ? (
                        <button
                          type="button"
                          disabled={isRunningAgentStep}
                          onClick={() => void runAgentStep(run.id)}
                          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#155e57] disabled:cursor-wait disabled:bg-[#9bb8b1]"
                        >
                          <Icon name="sparkles" />
                          {isRunningAgentStep
                            ? "Preparing request…"
                            : "Prepare information request"}
                        </button>
                      ) : null}
                      {!needsInformationRequest &&
                      (!latestAgentAction ||
                        latestAgentAction.status === "FAILED") ? (
                        <button
                          type="button"
                          disabled={isRunningAgentStep}
                          onClick={() => void runAgentStep(run.id)}
                          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#155e57] disabled:cursor-wait disabled:bg-[#9bb8b1]"
                        >
                          <Icon name="sparkles" />
                          {isRunningAgentStep
                            ? "Preparing next step…"
                            : latestAgentAction?.status === "FAILED"
                              ? "Retry guided next step"
                              : "Run guided next step"}
                        </button>
                      ) : null}
                      {draftReady && run.reviewTask?.id ? (
                        <Link
                          href={`/review/${run.reviewTask.id}`}
                          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#155e57]"
                        >
                          <Icon name="user" />
                          Review prepared request
                        </Link>
                      ) : null}
                    </div>
                  ) : null}

                  {tab === "similar" ? (
                    <div className="pt-5">
                      <div>
                        <h2 className="text-lg font-semibold text-[#123f3b]">
                          Guidance from similar reviewed claims
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-[#667571]">
                          Past outcomes guide the workflow only. They never
                          supply facts or decide this claim.
                        </p>
                      </div>
                      {isFetchingMemories ? (
                        <p className="mt-5 text-sm text-[#667571]">
                          Checking similar reviewed claims…
                        </p>
                      ) : null}
                      {!isFetchingMemories && !memories?.memories.length ? (
                        <div className="mt-5 rounded-xl border border-[#dfe8e3] bg-[#fbfaf6] p-4">
                          <p className="text-sm font-semibold text-[#123f3b]">
                            {memoryRetrievalOutcome?.status === "none"
                              ? "No matching reviewed claims found"
                              : "No guidance has been retrieved yet"}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-[#667571]">
                            {memoryRetrievalOutcome?.status === "none"
                              ? `ClaimFlow checked${memoryRetrievalOutcome.totalCandidates === null ? " the available" : ` ${memoryRetrievalOutcome.totalCandidates}`} reviewed-claim ${memoryRetrievalOutcome.totalCandidates === 1 ? "record" : "records"} and found no sufficiently similar guidance for this claim. This does not change the claim or its decision.`
                              : "ClaimFlow can check approved workflow memory for safe, relevant guidance."}
                          </p>
                          <button
                            type="button"
                            disabled={isRetrievingMemories}
                            onClick={() => void retrieveRunMemories(run.id)}
                            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#155e57] disabled:cursor-wait disabled:bg-[#9bb8b1]"
                          >
                            <Icon name="brain" />
                            {isRetrievingMemories
                              ? "Checking similar claims…"
                              : memoryRetrievalOutcome?.status === "none"
                                ? "Refresh similar claim guidance"
                                : "Find similar claim guidance"}
                          </button>
                        </div>
                      ) : null}
                      {memories?.memories.length ? (
                        <div className="mt-4 divide-y divide-[#dfe8e3] border-y border-[#dfe8e3]">
                          {memories.memories.map((memory) => {
                            const feedback = memoryFeedbackRelevance(memory);
                            return (
                              <article key={memory.memoryId} className="py-5">
                                <div className="flex items-start gap-3">
                                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#dcefea] text-[#0f766e]">
                                    <Icon name="brain" />
                                  </span>
                                  <div className="min-w-0">
                                    <h3 className="text-sm font-semibold text-[#20302e]">
                                      {productText(memory.summary)}
                                    </h3>
                                    <p className="mt-2 text-sm leading-6 text-[#667571]">
                                      {productText(memory.safeUse)}
                                    </p>
                                    {memory.retrievalCount > 1 ? (
                                      <p className="mt-2 text-xs font-semibold text-[#39756e]">
                                        Pattern confirmed across {memory.retrievalCount} similar approved reviews
                                      </p>
                                    ) : null}
                                    {memory.mustNotDo.length ? (
                                      <p className="mt-2 text-xs leading-5 text-[#667571]">
                                        Safety boundary:{" "}
                                        {memory.mustNotDo
                                          .map(productText)
                                          .join(" · ")}
                                      </p>
                                    ) : null}
                                    {!isResolved ? (
                                      feedback ? (
                                        <p
                                          className={`mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${feedback === "CONFIRMED_RELEVANT" ? "bg-[#dcefea] text-[#155e57]" : "bg-[#f4f1ea] text-[#667571]"}`}
                                        >
                                          <Icon
                                            name={
                                              feedback === "CONFIRMED_RELEVANT"
                                                ? "check"
                                                : "x"
                                            }
                                          />
                                          {feedback === "CONFIRMED_RELEVANT"
                                            ? "Marked useful · future matching improved"
                                            : "Marked not relevant · future matching reduced"}
                                        </p>
                                      ) : (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                          <button
                                            type="button"
                                            disabled={
                                              memoryFeedbackInFlightId ===
                                              memory.memoryId
                                            }
                                            onClick={() =>
                                              void submitMemoryFeedback(
                                                run.id,
                                                {
                                                  memoryId: memory.memoryId,
                                                  memoryHitId:
                                                    memory.memoryHitId,
                                                  relevance:
                                                    "CONFIRMED_RELEVANT",
                                                },
                                              )
                                            }
                                            className="rounded-lg border border-[#b9dfd3] bg-[#eef8f5] px-3 py-2 text-xs font-semibold text-[#155e57] transition hover:bg-[#dcefea] disabled:opacity-50"
                                          >
                                            Useful
                                          </button>
                                          <button
                                            type="button"
                                            disabled={
                                              memoryFeedbackInFlightId ===
                                              memory.memoryId
                                            }
                                            onClick={() =>
                                              void submitMemoryFeedback(
                                                run.id,
                                                {
                                                  memoryId: memory.memoryId,
                                                  memoryHitId:
                                                    memory.memoryHitId,
                                                  relevance: "IRRELEVANT",
                                                },
                                              )
                                            }
                                            className="rounded-lg px-3 py-2 text-xs font-semibold text-[#667571] transition hover:bg-[#eef8f5] hover:text-[#123f3b] disabled:opacity-50"
                                          >
                                            Not relevant
                                          </button>
                                        </div>
                                      )
                                    ) : null}
                                  </div>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {tab === "history" ? (
                    <div className="pt-5">
                      <div>
                        <h2 className="text-lg font-semibold text-[#123f3b]">
                          Claim history
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-[#667571]">
                          A reviewer-friendly record of how this claim moved
                          forward.
                        </p>
                      </div>
                      <div className="mt-4 divide-y divide-[#dfe8e3] border-y border-[#dfe8e3]">
                        {visibleEvents.map((event) => {
                          const display = friendlyEvent(event);
                          return (
                            <div
                              key={event.id}
                              className="flex items-start gap-3 py-4"
                            >
                              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#dcefea] text-[#0f766e]">
                                <Icon name={display.icon} />
                              </span>
                              <div>
                                <p className="text-sm font-semibold text-[#20302e]">
                                  {display.label}
                                </p>
                                <p className="mt-1 text-xs text-[#667571]">
                                  {new Intl.DateTimeFormat("en-IN", {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  }).format(new Date(event.createdAt))}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </section>
              </div>

              <aside className="min-w-0 space-y-5">
                <section className="rounded-2xl bg-[#123f3b] p-5 text-white shadow-[0_8px_24px_rgba(18,63,59,0.12)]">
                  <h2 className="text-lg font-semibold">
                    {latestToolResult
                      ? "Latest agent result"
                      : "Recommended next step"}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    {latestToolResult?.message ??
                      latestToolResult?.rationale ??
                      (canStartPreparation
                        ? "Prepare the received source and run validation to start processing this claim."
                        : canStartValidation
                          ? "Run validation to check missing details, required evidence and conflicts."
                          : isPreparationInProgress
                            ? "ClaimFlow is organizing the source and running its readiness checks."
                        : isPreparationFailed
                          ? "Retry preparation using the saved claim source. The claim does not need to be uploaded again."
                          : isResolved
                            ? "The human decision is complete. Open the decision summary for the final outcome and reviewer notes."
                            : needsInformationRequest
                              ? draftReady
                                ? "A guarded information request draft is ready for human review."
                                : `Prepare one clear request covering ${items.filter((item) => item.kind === "field" || item.kind === "evidence").length === 1 ? "the unresolved item" : "the unresolved information and evidence"}.`
                              : run.reviewTask?.id
                                ? "Continue to the assigned human review task and verify the claim details."
                                : guidedAction.description)}
                  </p>
                  {latestToolResult ? (
                    <button
                      type="button"
                      onClick={() => setTab("assistance")}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#123f3b] transition hover:bg-[#eef8f5]"
                    >
                      <Icon name="shield" />
                      View agent result
                    </button>
                  ) : isPreparing ? (
                    <button
                      type="button"
                      disabled={isPreparationInProgress}
                      onClick={() => void prepareClaim()}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#123f3b] transition hover:bg-[#eef8f5] disabled:cursor-wait disabled:opacity-70"
                    >
                      <Icon name="sparkles" />
                      {isPreparationInProgress
                        ? "Preparing and validating…"
                        : canStartValidation
                          ? "Run validation"
                          : "Prepare and validate claim"}
                    </button>
                  ) : isPreparationFailed ? (
                    <button
                      type="button"
                      disabled={isExtractingRun || isValidatingRun}
                      onClick={() => void prepareClaim()}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#123f3b] transition hover:bg-[#eef8f5] disabled:cursor-wait disabled:opacity-70"
                    >
                      <Icon name="sparkles" />
                      {isExtractingRun || isValidatingRun
                        ? "Preparing claim…"
                        : "Retry preparation"}
                    </button>
                  ) : run.reviewTask?.id &&
                    (!needsInformationRequest || isResolved) ? (
                    <Link
                      href={`/review/${run.reviewTask.id}`}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#123f3b] transition hover:bg-[#eef8f5]"
                    >
                      <Icon name="user" />
                      {isResolved
                        ? "View decision summary"
                        : primaryActionLabel}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled={isRunningAgentStep}
                      onClick={() => void openNextStep()}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#123f3b] transition hover:bg-[#eef8f5] disabled:cursor-wait disabled:opacity-70"
                    >
                      <Icon name={primaryActionIcon} />
                      {isRunningAgentStep
                        ? "Preparing next step…"
                        : needsInformationRequest && draftReady
                          ? "Review draft"
                          : primaryActionLabel}
                    </button>
                  )}
                  {!isPreparing &&
                  !isPreparationFailed &&
                  !isResolved &&
                  !needsInformationRequest &&
                  latestAgentAction &&
                  latestAgentAction.status !== "FAILED" &&
                  !run.reviewTask?.id &&
                  !latestToolResult ? (
                    <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-white/65">
                      <Icon name="shield" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      This recommendation comes from the latest guarded agent
                      tool action. Policy questions remain available separately.
                    </p>
                  ) : null}
                </section>

                <section className="rounded-2xl border border-[#dfe8e3] bg-white p-5 shadow-[0_6px_20px_rgba(18,63,59,0.035)]">
                  <h2 className="text-lg font-semibold text-[#123f3b]">
                    How ClaimFlow prepared this
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-[#667571]">
                    A clear record of the checks supporting this workspace.
                  </p>
                  <div className="mt-5 space-y-4">
                    {[
                      {
                        icon: "sparkles" as const,
                        title: "Facts organized",
                        detail: run.extractedJson
                          ? `Claim details structured from ${run.document.sourceType === "PDF" ? "1 PDF" : "the source email"}`
                          : "Claim extraction is not available",
                      },
                      {
                        icon: "book" as const,
                        title: "Policy grounding",
                        detail: policyRetrieved
                          ? "Policy retrieval was executed and recorded"
                          : "Available through the coverage assessment",
                      },
                      {
                        icon: "brain" as const,
                        title: "Memory checked",
                        detail: memoryChecked
                          ? "Relevant workflow memory was retrieved"
                          : "No memory retrieval recorded for this run",
                      },
                      {
                        icon: "shield" as const,
                        title: "Guarded action",
                        detail:
                          guardrailApplied || draftReady
                            ? "The prepared agent result is recorded"
                            : "No outbound action has been taken",
                      },
                    ].map((signal) => (
                      <div
                        key={signal.title}
                        className="flex items-start gap-3"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#dcefea] text-[#0f766e]">
                          <Icon name={signal.icon} />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-[#20302e]">
                            {signal.title}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[#667571]">
                            {signal.detail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 grid gap-2">
                    <button
                      type="button"
                      onClick={() => setTab("history")}
                      className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#155e57] transition hover:bg-[#eef8f5]"
                    >
                      <Icon name="activity" />
                      View claim history
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab("similar")}
                      className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#155e57] transition hover:bg-[#eef8f5]"
                    >
                      <Icon name="brain" />
                      View similar claims
                    </button>
                  </div>
                </section>
              </aside>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
