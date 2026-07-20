"use client";

import {
  ClaimExtractionSchema,
  type ClaimExtraction,
} from "@repo/shared/schemas";
import { validateClaimExtraction } from "@repo/shared/validation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  ReviewTaskRecord,
  ReviewTaskStatus,
} from "../../store/use-dashboard-store";
import { useDashboardStore } from "../../store/use-dashboard-store";
import { AdditionalInformationPanel } from "./additional-information-panel";
import { ResolvedClaimSummary } from "./resolved-claim-summary";
import { UserAccountControl } from "../auth/user-account-control";

type ReviewTab = "facts" | "evidence" | "support";
type DecisionKind = "approve" | "correct" | "request" | "reject";
type IconName =
  | "activity"
  | "alert"
  | "bell"
  | "book"
  | "brain"
  | "check"
  | "chevron-left"
  | "chevron-right"
  | "file"
  | "file-check"
  | "file-warning"
  | "flag"
  | "history"
  | "inbox"
  | "menu"
  | "pencil"
  | "search"
  | "send"
  | "shield"
  | "sparkles"
  | "user"
  | "x";

type ReviewReason = {
  missingFields?: string[];
  conflicts?: Array<{
    field?: string;
    message?: string;
    severity?: string;
    ruleId?: string;
  }>;
  warnings?: Array<{
    field?: string;
    message?: string;
    severity?: string;
    ruleId?: string;
  }>;
  requiredEvidence?: string[];
};

type ReceivedFieldValue = {
  field: string;
  label: string;
  value: string;
  note: string | null;
};

type ReceivedEvidenceItem = {
  label: string;
  note: string | null;
};

type ReceivedConsistencyCheck = {
  field: string;
  submittedValue: string;
  evidenceLabels: string[];
  status: "MATCHED" | "REVIEW_REQUIRED";
};

type ReceivedInformation = {
  fieldValues: ReceivedFieldValue[];
  evidenceItems: ReceivedEvidenceItem[];
  consistencyChecks: ReceivedConsistencyCheck[];
  receivedAt: string | null;
};

const DEFAULT_DRAFT: ClaimExtraction = {
  documentType: "unknown",
  claimNumber: null,
  policyNumber: null,
  insuredName: null,
  claimantName: null,
  contactEmail: null,
  contactPhone: null,
  vehicle: {
    registrationNumber: null,
    make: null,
    model: null,
    year: null,
    engineNumber: null,
    chassisNumber: null,
  },
  incident: {
    incidentDate: null,
    incidentTime: null,
    incidentLocation: null,
    lossType: "unknown",
    description: null,
  },
  damage: {
    damagedParts: [],
    damageSeverity: "unknown",
    estimatedRepairCost: null,
    currency: null,
  },
  police: {
    wasReportedToPolice: null,
    policeStation: null,
    firNumber: null,
    reportDate: null,
  },
  supportingDocuments: {
    claimForm: false,
    damagePhoto: false,
    repairEstimate: false,
    policeReport: false,
  },
  missingEvidence: [],
  overallConfidence: 1,
};

const terminalStatuses = new Set<ReviewTaskStatus>([
  "APPROVED",
  "EDITED_AND_APPROVED",
  "REJECTED",
]);

function Icon({
  name,
  className = "h-4 w-4",
}: {
  name: IconName;
  className?: string;
}) {
  const paths: Record<IconName, React.ReactNode> = {
    activity: <path d="M3 12h4l2-7 4 14 2-7h6" />,
    alert: (
      <>
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z" />
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
    "file-check": (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6m-11 7 2 2 4-4" />
      </>
    ),
    "file-warning": (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6M12 12v3M12 18h.01" />
      </>
    ),
    flag: (
      <>
        <path d="M5 22V4" />
        <path d="M5 4h11l-1 5 1 5H5" />
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
    pencil: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </>
    ),
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
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
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
  active = "review",
}: {
  collapsed: boolean;
  onCollapse?: () => void;
  mobile?: boolean;
  onNavigate?: () => void;
  active?: "review" | "resolved";
}) {
  const nav = [
    { href: "/dashboard", label: "Claims", icon: "file" as const },
    {
      href: "/review",
      label: "Review queue",
      icon: "inbox" as const,
      active: active === "review",
    },
    {
      href: "/review",
      label: "Resolved",
      icon: "check" as const,
      active: active === "resolved",
    },
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

function cloneClaim(value: ClaimExtraction): ClaimExtraction {
  return JSON.parse(JSON.stringify(value)) as ClaimExtraction;
}
function parseClaim(value: unknown) {
  const parsed = ClaimExtractionSchema.safeParse(value);
  return parsed.success ? cloneClaim(parsed.data) : cloneClaim(DEFAULT_DRAFT);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeReceivedKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeReceivedIdentifier(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

function receivedEvidenceContainsIdentifier(
  note: string,
  identifier: string,
) {
  const normalizedIdentifier = normalizeReceivedIdentifier(identifier);
  const candidates = note.match(/[a-z0-9][a-z0-9/_-]{3,}/gi) ?? [];

  return candidates.some(
    (candidate) =>
      normalizeReceivedIdentifier(candidate) === normalizedIdentifier,
  );
}

function getReceivedInformation(task: ReviewTaskRecord): ReceivedInformation {
  const requestCheckpoint = task.decisions
    .filter((decision) => decision.decision === "REQUEST_MORE_INFO")
    .map((decision) => new Date(decision.createdAt).getTime())
    .sort((left, right) => right - left)[0];

  const fieldValues = new Map<string, ReceivedFieldValue>();
  const evidenceItems = new Map<string, ReceivedEvidenceItem>();
  const consistencyChecks = new Map<string, ReceivedConsistencyCheck>();
  let receivedAt: string | null = null;

  task.run.events
    .filter((event) => event.type === "ADDITIONAL_INFORMATION_RECEIVED")
    .filter(
      (event) =>
        requestCheckpoint === undefined ||
        new Date(event.createdAt).getTime() > requestCheckpoint,
    )
    .forEach((event) => {
      if (!isRecord(event.metadata)) {
        return;
      }

      receivedAt = event.createdAt;

      if (Array.isArray(event.metadata.fieldValues)) {
        event.metadata.fieldValues.forEach((item) => {
          if (!isRecord(item)) return;
          const field = typeof item.field === "string" ? item.field.trim() : "";
          const value = typeof item.value === "string" ? item.value.trim() : "";
          if (!field || !value) return;

          fieldValues.set(normalizeReceivedKey(field), {
            field,
            label:
              typeof item.label === "string" && item.label.trim()
                ? item.label.trim()
                : humanFieldLabel(field),
            value,
            note:
              typeof item.note === "string" && item.note.trim()
                ? item.note.trim()
                : null,
          });
        });
      }

      if (Array.isArray(event.metadata.evidenceItems)) {
        event.metadata.evidenceItems.forEach((item) => {
          if (!isRecord(item)) return;
          const label = typeof item.label === "string" ? item.label.trim() : "";
          if (!label) return;

          evidenceItems.set(normalizeReceivedKey(label), {
            label,
            note:
              typeof item.note === "string" && item.note.trim()
                ? item.note.trim()
                : null,
          });
        });
      }

      if (Array.isArray(event.metadata.consistencyChecks)) {
        event.metadata.consistencyChecks.forEach((item) => {
          if (!isRecord(item)) return;
          const field = typeof item.field === "string" ? item.field.trim() : "";
          const submittedValue =
            typeof item.submittedValue === "string"
              ? item.submittedValue.trim()
              : "";
          const status =
            item.status === "MATCHED" ? "MATCHED" : "REVIEW_REQUIRED";
          if (!field || !submittedValue) return;

          consistencyChecks.set(normalizeReceivedKey(field), {
            field,
            submittedValue,
            evidenceLabels: Array.isArray(item.evidenceLabels)
              ? item.evidenceLabels.filter(
                  (label): label is string => typeof label === "string",
                )
              : [],
            status,
          });
        });
      }
    });

  return {
    fieldValues: Array.from(fieldValues.values()),
    evidenceItems: Array.from(evidenceItems.values()),
    consistencyChecks: Array.from(consistencyChecks.values()),
    receivedAt,
  };
}

function applyReceivedInformation(
  original: ClaimExtraction,
  received: ReceivedInformation,
): ClaimExtraction {
  const claim = cloneClaim(original);

  received.fieldValues.forEach((item) => {
    const field = normalizeReceivedKey(item.field);

    if (field === "claimnumber") claim.claimNumber = item.value;
    if (field === "policynumber") claim.policyNumber = item.value;
    if (field === "claimantname") claim.claimantName = item.value;
    if (field === "insuredname") claim.insuredName = item.value;
    if (field === "vehicleregistrationnumber") {
      claim.vehicle.registrationNumber = item.value;
    }
    if (field === "incidentincidentdate")
      claim.incident.incidentDate = item.value;
    if (field === "incidentincidentlocation") {
      claim.incident.incidentLocation = item.value;
    }
    if (field === "incidentdescription")
      claim.incident.description = item.value;
    if (field === "policefirnumber" || field === "firnumber") {
      claim.police.firNumber = item.value;
      claim.police.wasReportedToPolice = true;
    }
    if (field === "policepolicestation")
      claim.police.policeStation = item.value;
    if (field === "policereportdate") claim.police.reportDate = item.value;
    if (field === "damageestimatedrepaircost") {
      const amount = Number(item.value);
      if (Number.isFinite(amount)) claim.damage.estimatedRepairCost = amount;
    }
    if (field === "damagecurrency") claim.damage.currency = item.value;
  });

  received.evidenceItems.forEach((item) => {
    const label = normalizeReceivedKey(item.label);
    if (label.includes("claimform")) claim.supportingDocuments.claimForm = true;
    if (label.includes("damagephoto"))
      claim.supportingDocuments.damagePhoto = true;
    if (label.includes("repairestimate")) {
      claim.supportingDocuments.repairEstimate = true;
    }
    if (label.includes("policereport") || label.includes("fircopy")) {
      claim.supportingDocuments.policeReport = true;
    }
  });

  return claim;
}
function getReason(value: unknown): ReviewReason {
  return typeof value === "object" && value !== null
    ? (value as ReviewReason)
    : {};
}
function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
function titleCase(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function friendlyFilename(value: string) {
  return value
    .replace(/\.[^.]+$/, "")
    .replaceAll("-", " ")
    .replaceAll("_", " ");
}

function humanFieldLabel(field: string) {
  const labels: Record<string, string> = {
    policyNumber: "Policy number",
    claimantName_or_insuredName: "Claimant or insured name",
    "vehicle.registrationNumber": "Vehicle registration",
    "incident.incidentDate": "Incident date",
    "incident.incidentLocation": "Incident location",
    "incident.description": "Incident description",
    "incident.lossType": "Loss type",
    "police.firNumber": "FIR number",
    "damage.estimatedRepairCost": "Repair estimate",
    "damage.currency": "Currency",
  };
  return labels[field] ?? titleCase(field.split(".").at(-1) ?? field);
}

function statusLabel(status: ReviewTaskStatus) {
  if (status === "PENDING") return "Ready for review";
  if (status === "IN_REVIEW") return "In review";
  if (status === "NEEDS_MORE_INFO") return "Waiting for information";
  if (status === "EDITED_AND_APPROVED") return "Corrected and approved";
  if (status === "APPROVED") return "Approved";
  return "Not approved";
}

function normalizeClaim(claim: ClaimExtraction): ClaimExtraction {
  const clean = (value: string | null) => value?.trim() || null;
  return {
    ...claim,
    claimNumber: clean(claim.claimNumber),
    policyNumber: clean(claim.policyNumber),
    insuredName: clean(claim.insuredName),
    claimantName: clean(claim.claimantName),
    contactEmail: clean(claim.contactEmail),
    contactPhone: clean(claim.contactPhone),
    vehicle: {
      ...claim.vehicle,
      registrationNumber: clean(claim.vehicle.registrationNumber),
      make: clean(claim.vehicle.make),
      model: clean(claim.vehicle.model),
      year: clean(claim.vehicle.year),
      engineNumber: clean(claim.vehicle.engineNumber),
      chassisNumber: clean(claim.vehicle.chassisNumber),
    },
    incident: {
      ...claim.incident,
      incidentDate: clean(claim.incident.incidentDate),
      incidentTime: clean(claim.incident.incidentTime),
      incidentLocation: clean(claim.incident.incidentLocation),
      description: clean(claim.incident.description),
    },
    damage: { ...claim.damage, currency: clean(claim.damage.currency) },
    police: {
      ...claim.police,
      policeStation: clean(claim.police.policeStation),
      firNumber: clean(claim.police.firNumber),
      reportDate: clean(claim.police.reportDate),
    },
    missingEvidence: [],
  };
}

function hasBlockingIssues(claim: ClaimExtraction) {
  const result = validateClaimExtraction(claim);
  return (
    result.missingFields.length > 0 ||
    result.requiredEvidence.length > 0 ||
    result.conflicts.some((issue) => issue.severity === "error")
  );
}

function HumanDecisionWorkspace({ task }: { task: ReviewTaskRecord }) {
  const reason = useMemo(() => getReason(task.reasonJson), [task.reasonJson]);
  const receivedInformation = useMemo(
    () => getReceivedInformation(task),
    [task],
  );
  const originalClaim = useMemo(
    () => parseClaim(task.run.extractedJson),
    [task.run.extractedJson],
  );
  const preparedClaim = useMemo(
    () => applyReceivedInformation(originalClaim, receivedInformation),
    [originalClaim, receivedInformation],
  );
  const [draft, setDraft] = useState<ClaimExtraction>(() =>
    cloneClaim(preparedClaim),
  );
  const [tab, setTab] = useState<ReviewTab>("facts");
  const [decision, setDecision] = useState<DecisionKind>("correct");
  const [reviewerName, setReviewerName] = useState("Claims reviewer");
  const [notes, setNotes] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const actionInFlight = useDashboardStore(
    (state) => state.reviewTaskActionInFlight,
  );
  const startReviewTask = useDashboardStore((state) => state.startReviewTask);
  const approveReviewTask = useDashboardStore(
    (state) => state.approveReviewTask,
  );
  const rejectReviewTask = useDashboardStore((state) => state.rejectReviewTask);
  const requestMoreInfoReviewTask = useDashboardStore(
    (state) => state.requestMoreInfoReviewTask,
  );
  const editAndApproveReviewTask = useDashboardStore(
    (state) => state.editAndApproveReviewTask,
  );
  const fetchRunMemories = useDashboardStore((state) => state.fetchRunMemories);
  const memoryAudit = useDashboardStore(
    (state) => state.runMemoriesByRunId[task.run.id],
  );
  const isBusy = actionInFlight !== null;
  const editable = task.status === "IN_REVIEW";
  const missingFields = Array.isArray(reason.missingFields)
    ? reason.missingFields
    : [];
  const conflicts = Array.isArray(reason.conflicts) ? reason.conflicts : [];
  const warnings = Array.isArray(reason.warnings) ? reason.warnings : [];
  const requiredEvidence = Array.isArray(reason.requiredEvidence)
    ? reason.requiredEvidence
    : [];
  const issueCount =
    missingFields.length + conflicts.length + requiredEvidence.length;
  const displayedIssueCount = issueCount || warnings.length;
  const canApproveAsIs = !hasBlockingIssues(originalClaim);
  const receivedFirNumber = receivedInformation.fieldValues.find((item) => {
    const field = normalizeReceivedKey(item.field);
    return field === "firnumber" || field === "policefirnumber";
  });
  const receivedPoliceEvidence = receivedInformation.evidenceItems.filter(
    (item) => {
      const label = normalizeReceivedKey(item.label);
      return label.includes("fir") || label.includes("policereport");
    },
  );
  const recordedFirConsistency = receivedInformation.consistencyChecks.find(
    (item) => {
      const field = normalizeReceivedKey(item.field);
      return field === "firnumber" || field === "policefirnumber";
    },
  );
  const firConsistency =
    recordedFirConsistency ??
    (receivedFirNumber
      ? {
          field: receivedFirNumber.field,
          submittedValue: receivedFirNumber.value,
          evidenceLabels: receivedPoliceEvidence.map((item) => item.label),
          status: receivedPoliceEvidence.some((item) =>
            receivedEvidenceContainsIdentifier(
              item.note ?? "",
              receivedFirNumber.value,
            ),
          )
            ? ("MATCHED" as const)
            : ("REVIEW_REQUIRED" as const),
        }
      : undefined);
  const memory =
    memoryAudit?.memories.find((item) => item.usedByAgent) ??
    memoryAudit?.memories[0] ??
    null;

  useEffect(() => {
    void fetchRunMemories(task.run.id);
  }, [fetchRunMemories, task.run.id]);
  useEffect(() => {
    let active = true;
    void fetch("/api/auth/session")
      .then((response) => response.json())
      .then((body: { user?: { name?: string } | null }) => {
        if (active && body.user?.name) setReviewerName(body.user.name);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    setDraft(cloneClaim(preparedClaim));
    setLocalError(null);
  }, [preparedClaim, task.id]);

  const needsField = (field: string) =>
    missingFields.includes(field) ||
    conflicts.some((item) => item.field === field);
  const updateTop = (
    field: "claimNumber" | "policyNumber" | "claimantName" | "insuredName",
    value: string,
  ) => setDraft((current) => ({ ...current, [field]: emptyToNull(value) }));
  const updateVehicle = (
    field: "registrationNumber" | "make" | "model",
    value: string,
  ) =>
    setDraft((current) => ({
      ...current,
      vehicle: { ...current.vehicle, [field]: emptyToNull(value) },
    }));
  const updateIncident = (
    field: "incidentDate" | "incidentLocation" | "description",
    value: string,
  ) =>
    setDraft((current) => ({
      ...current,
      incident: { ...current.incident, [field]: emptyToNull(value) },
    }));
  const updatePolice = (
    field: "firNumber" | "policeStation" | "reportDate",
    value: string,
  ) =>
    setDraft((current) => ({
      ...current,
      police: {
        ...current.police,
        [field]: emptyToNull(value),
        wasReportedToPolice:
          field === "firNumber" && value.trim()
            ? true
            : current.police.wasReportedToPolice,
      },
    }));
  const updateEvidence = (
    field: keyof ClaimExtraction["supportingDocuments"],
    checked: boolean,
  ) =>
    setDraft((current) => ({
      ...current,
      supportingDocuments: { ...current.supportingDocuments, [field]: checked },
    }));

  const decisionHelp: Record<DecisionKind, string> = {
    approve: canApproveAsIs
      ? "The original claim facts will be approved without changes."
      : "Approval is unavailable while required fields or evidence are missing.",
    correct: "Your corrections will be validated before the claim is approved.",
    request:
      "ClaimFlow will record your notes and move the claim to waiting for information.",
    reject: "Reviewer notes are required to reject this review task.",
  };

  const actionLabel: Record<DecisionKind, string> = {
    approve: "Approve as-is",
    correct: "Validate & approve corrections",
    request: "Request more information",
    reject: "Reject review task",
  };

  const submitDecision = () => {
    setLocalError(null);
    if (decision === "approve") {
      if (!canApproveAsIs) {
        setLocalError(
          "This claim still has blocking issues. Correct them or request more information.",
        );
        return;
      }
      void approveReviewTask(task.id, { reviewerName, notes });
      return;
    }
    if (decision === "correct") {
      const normalized = normalizeClaim(draft);
      if (hasBlockingIssues(normalized)) {
        setLocalError(
          "Required fields, conflicts, or evidence are still unresolved. Review the highlighted facts and evidence.",
        );
        return;
      }
      void editAndApproveReviewTask(task.id, {
        correctedJson: normalized,
        reviewerName,
        notes,
      });
      return;
    }
    if (!notes.trim()) {
      setLocalError(
        decision === "request"
          ? "Add notes describing the information required."
          : "Add notes explaining why this review is rejected.",
      );
      return;
    }
    if (decision === "request")
      void requestMoreInfoReviewTask(task.id, { reviewerName, notes });
    else void rejectReviewTask(task.id, { reviewerName, notes });
  };

  if (task.status === "NEEDS_MORE_INFO") {
    return <AdditionalInformationPanel task={task} />;
  }

  if (terminalStatuses.has(task.status)) {
    return (
      <ResolvedClaimSummary
        task={task}
        memorySummary={memory?.summary ?? null}
        memoryUsed={Boolean(memory?.usedByAgent)}
      />
    );
  }

  return (
    <>
      {receivedInformation.fieldValues.length > 0 ||
      receivedInformation.evidenceItems.length > 0 ? (
        <section className="mt-5 overflow-hidden rounded-2xl border border-[#9ed7ca] bg-white shadow-[0_8px_28px_rgba(18,63,59,0.045)]">
          <div className="flex flex-col gap-3 border-b border-[#cde8e1] bg-[#eef8f5] px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-base font-semibold text-[#123f3b]">
                <Icon name="inbox" /> Information received from claimant
              </p>
              <p className="mt-1 text-sm leading-6 text-[#4e6b66]">
                These submitted values are prefilled into the correction draft.
                Confirm them against the received evidence before deciding.
              </p>
            </div>
            <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#155e57]">
              <Icon name="history" /> Audit recorded
            </span>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-2">
            {receivedInformation.fieldValues.map((item) => {
              const isFir = ["firnumber", "policefirnumber"].includes(
                normalizeReceivedKey(item.field),
              );
              const consistency = isFir ? firConsistency : null;

              return (
                <div
                  key={item.field}
                  className="min-w-0 rounded-xl border border-[#dfe8e3] bg-[#fbfdfc] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#667571]">
                        {item.label}
                      </p>
                      <p className="mt-2 break-words text-lg font-semibold text-[#123f3b]">
                        {item.value}
                      </p>
                    </div>
                    {consistency ? (
                      <span
                        className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${consistency.status === "MATCHED" ? "bg-[#dcefea] text-[#155e57]" : "bg-[#fff2df] text-[#8c5b1c]"}`}
                      >
                        <Icon
                          name={
                            consistency.status === "MATCHED"
                              ? "file-check"
                              : "file-warning"
                          }
                        />
                        {consistency.status === "MATCHED"
                          ? "Linked to received evidence"
                          : "Verify with evidence"}
                      </span>
                    ) : null}
                  </div>
                  {item.note ? (
                    <p className="mt-2 break-words text-xs leading-5 text-[#667571]">
                      {item.note}
                    </p>
                  ) : null}
                </div>
              );
            })}

            {receivedInformation.evidenceItems.map((item) => (
              <div
                key={item.label}
                className="min-w-0 rounded-xl border border-[#dfe8e3] bg-[#fbfdfc] p-4"
              >
                <p className="flex items-center gap-2 text-sm font-semibold text-[#20302e]">
                  <Icon
                    name="file-check"
                    className="h-[18px] w-[18px] text-[#0f766e]"
                  />
                  <span className="break-words">
                    {humanFieldLabel(item.label)}
                  </span>
                </p>
                <p className="mt-2 break-words text-xs leading-5 text-[#667571]">
                  {item.note ?? "Evidence recorded without additional notes."}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-5 rounded-2xl border border-[#ead5b5] bg-[#fff9ed] p-5">
        <p className="flex items-center gap-2 text-base font-semibold text-[#6f4c1e]">
          <Icon name="alert" />
          {displayedIssueCount}{" "}
          {displayedIssueCount === 1 ? "item needs" : "items need"} your
          judgment
        </p>
        <p className="mt-2 text-sm leading-6 text-[#75654f]">
          ClaimFlow paused the workflow because these items must be confirmed by
          a person before a final decision.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {missingFields.slice(0, 2).map((field) => (
            <div key={field} className="border-t border-[#ead5b5] pt-3">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Icon name="alert" className="h-[17px] w-[17px]" />
                {humanFieldLabel(field)}
              </p>
              <p className="mt-1 text-xs text-[#75654f]">
                Required before approval
              </p>
            </div>
          ))}
          {requiredEvidence
            .slice(0, Math.max(0, 2 - missingFields.slice(0, 2).length))
            .map((item) => (
              <div key={item} className="border-t border-[#ead5b5] pt-3">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Icon name="file-warning" className="h-[17px] w-[17px]" />
                  {humanFieldLabel(item)}
                </p>
                <p className="mt-1 text-xs text-[#75654f]">
                  Evidence must be confirmed
                </p>
              </div>
            ))}
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.72fr)] xl:items-start">
        <section className="overflow-hidden rounded-2xl border border-[#dfe8e3] bg-white shadow-[0_8px_28px_rgba(18,63,59,0.045)]">
          <div
            className="flex flex-wrap gap-2 border-b border-[#dfe8e3] p-4"
            aria-label="Human review workspace"
          >
            {(
              [
                ["facts", "Claim facts"],
                ["evidence", "Evidence"],
                ["support", "Decision support"],
              ] as Array<[ReviewTab, string]>
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={tab === value}
                onClick={() => setTab(value)}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${tab === value ? "border-[#85d9c8] bg-[#dcefea] text-[#123f3b]" : "border-[#dfe8e3] bg-white text-[#667571] hover:border-[#b9dfd3] hover:text-[#155e57]"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "facts" ? (
            <div className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-[#123f3b]">
                    Review and correct claim facts
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-[#667571]">
                    Only decision-relevant fields are shown. Edits remain
                    separate from the originally prepared claim.
                  </p>
                </div>
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#eef8f5] px-3 py-2 text-xs font-semibold text-[#155e57]">
                  <Icon name="history" />
                  Audited
                </span>
              </div>
              <FactSection title="Claim and claimant">
                <TextField
                  label="Claimant name"
                  value={draft.claimantName ?? draft.insuredName ?? ""}
                  onChange={(value) => updateTop("claimantName", value)}
                  disabled={!editable}
                  needsAttention={needsField("claimantName_or_insuredName")}
                />
                <TextField
                  label="Policy number"
                  value={draft.policyNumber ?? ""}
                  onChange={(value) => updateTop("policyNumber", value)}
                  disabled={!editable}
                  needsAttention={needsField("policyNumber")}
                  placeholder="Add policy number"
                />
                <TextField
                  label="Claim number"
                  value={draft.claimNumber ?? ""}
                  onChange={(value) => updateTop("claimNumber", value)}
                  disabled={!editable}
                />
              </FactSection>
              <FactSection title="Incident">
                <label className="block text-sm font-semibold text-[#344441]">
                  <span>Loss type</span>
                  <select
                    value={draft.incident.lossType}
                    disabled={!editable}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        incident: {
                          ...current.incident,
                          lossType: event.target
                            .value as ClaimExtraction["incident"]["lossType"],
                        },
                      }))
                    }
                    className={`mt-2 w-full rounded-xl border bg-white px-3 py-2.5 text-sm outline-none disabled:bg-[#f4f6f5] ${needsField("incident.lossType") ? "border-[#d6a15c] ring-4 ring-[#fff2df]" : "border-[#dfe8e3]"}`}
                  >
                    <option value="unknown">Unknown</option>
                    <option value="own_damage">Own damage</option>
                    <option value="third_party">Third party</option>
                    <option value="theft">Theft</option>
                    <option value="personal_accident">Personal accident</option>
                  </select>
                </label>
                <TextField
                  label="Incident date"
                  type="date"
                  value={draft.incident.incidentDate ?? ""}
                  onChange={(value) => updateIncident("incidentDate", value)}
                  disabled={!editable}
                  needsAttention={needsField("incident.incidentDate")}
                />
                <TextField
                  label="Location"
                  value={draft.incident.incidentLocation ?? ""}
                  onChange={(value) =>
                    updateIncident("incidentLocation", value)
                  }
                  disabled={!editable}
                  needsAttention={needsField("incident.incidentLocation")}
                />
                <label className="block text-sm font-semibold text-[#344441] sm:col-span-2">
                  <span>Description</span>
                  <textarea
                    rows={3}
                    value={draft.incident.description ?? ""}
                    disabled={!editable}
                    onChange={(event) =>
                      updateIncident("description", event.target.value)
                    }
                    className={`mt-2 w-full rounded-xl border bg-white px-3 py-2.5 text-sm leading-6 outline-none disabled:bg-[#f4f6f5] ${needsField("incident.description") ? "border-[#d6a15c] ring-4 ring-[#fff2df]" : "border-[#dfe8e3]"}`}
                  />
                </label>
              </FactSection>
              <FactSection title="Vehicle">
                <TextField
                  label="Registration number"
                  value={draft.vehicle.registrationNumber ?? ""}
                  onChange={(value) =>
                    updateVehicle("registrationNumber", value)
                  }
                  disabled={!editable}
                  needsAttention={needsField("vehicle.registrationNumber")}
                />
                <TextField
                  label="Make"
                  value={draft.vehicle.make ?? ""}
                  onChange={(value) => updateVehicle("make", value)}
                  disabled={!editable}
                />
                <TextField
                  label="Model"
                  value={draft.vehicle.model ?? ""}
                  onChange={(value) => updateVehicle("model", value)}
                  disabled={!editable}
                />
              </FactSection>
              {draft.incident.lossType === "theft" ||
              needsField("police.firNumber") ||
              requiredEvidence.includes("policeReport") ? (
                <FactSection title="Police information">
                  <TextField
                    label="FIR number"
                    value={draft.police.firNumber ?? ""}
                    onChange={(value) => updatePolice("firNumber", value)}
                    disabled={!editable}
                    receivedFromClaimant={Boolean(receivedFirNumber)}
                    needsAttention={
                      needsField("police.firNumber") ||
                      requiredEvidence.includes("firNumber")
                    }
                  />
                  <TextField
                    label="Police station"
                    value={draft.police.policeStation ?? ""}
                    onChange={(value) => updatePolice("policeStation", value)}
                    disabled={!editable}
                  />
                  <TextField
                    label="Report date"
                    type="date"
                    value={draft.police.reportDate ?? ""}
                    onChange={(value) => updatePolice("reportDate", value)}
                    disabled={!editable}
                  />
                </FactSection>
              ) : null}
              {conflicts.some((item) => item.field?.startsWith("damage.")) ? (
                <FactSection title="Damage and estimate">
                  <TextField
                    label="Estimated repair cost"
                    type="number"
                    value={draft.damage.estimatedRepairCost?.toString() ?? ""}
                    onChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        damage: {
                          ...current.damage,
                          estimatedRepairCost: value ? Number(value) : null,
                        },
                      }))
                    }
                    disabled={!editable}
                    needsAttention={needsField("damage.estimatedRepairCost")}
                  />
                  <TextField
                    label="Currency"
                    value={draft.damage.currency ?? ""}
                    onChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        damage: {
                          ...current.damage,
                          currency: emptyToNull(value),
                        },
                      }))
                    }
                    disabled={!editable}
                    needsAttention={needsField("damage.currency")}
                  />
                </FactSection>
              ) : null}
            </div>
          ) : null}

          {tab === "evidence" ? (
            <div className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-[#123f3b]">
                    Evidence checklist
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-[#667571]">
                    Confirm evidence received for this claim. Unconfirmed
                    required items block approval.
                  </p>
                </div>
                <span className="inline-flex w-fit rounded-full bg-[#eef8f5] px-3 py-2 text-xs font-semibold text-[#155e57]">
                  {requiredEvidence.length} required
                </span>
              </div>
              <div className="mt-5 divide-y divide-[#dfe8e3]">
                <EvidenceRow
                  icon="file-check"
                  title="Claim form"
                  detail={
                    draft.supportingDocuments.claimForm
                      ? "Received in the claim material"
                      : "Not confirmed"
                  }
                  verified={draft.supportingDocuments.claimForm}
                  editable={editable}
                  onChange={(checked) => updateEvidence("claimForm", checked)}
                />
                <EvidenceRow
                  icon="file-check"
                  title="Vehicle registration"
                  detail={
                    draft.vehicle.registrationNumber
                      ? `Registration ${draft.vehicle.registrationNumber}`
                      : "Registration number is missing"
                  }
                  verified={Boolean(draft.vehicle.registrationNumber)}
                />
                <EvidenceRow
                  icon="file-warning"
                  title="FIR / police report"
                  detail={
                    receivedPoliceEvidence.length > 0 && receivedFirNumber
                      ? `Received with submitted FIR ${receivedFirNumber.value}; verify the document before approval`
                      : draft.supportingDocuments.policeReport
                        ? "Police report received for reviewer verification"
                        : "Required for this claim but not received"
                  }
                  verified={draft.supportingDocuments.policeReport}
                  editable={editable}
                  onChange={(checked) =>
                    updateEvidence("policeReport", checked)
                  }
                />
                {requiredEvidence.includes("repairEstimate") ||
                draft.supportingDocuments.repairEstimate ? (
                  <EvidenceRow
                    icon="file-check"
                    title="Repair estimate"
                    detail={
                      draft.supportingDocuments.repairEstimate
                        ? "Repair estimate confirmed"
                        : "Not confirmed"
                    }
                    verified={draft.supportingDocuments.repairEstimate}
                    editable={editable}
                    onChange={(checked) =>
                      updateEvidence("repairEstimate", checked)
                    }
                  />
                ) : null}
              </div>
            </div>
          ) : null}

          {tab === "support" ? (
            <div className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-[#123f3b]">
                    Decision support
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-[#667571]">
                    See why ClaimFlow paused and review the supporting guidance
                    in one clear workspace.
                  </p>
                </div>
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#eef8f5] px-3 py-2 text-xs font-semibold text-[#155e57]">
                  <Icon name="shield" />
                  Guarded
                </span>
              </div>
              <div className="mt-5 divide-y divide-[#dfe8e3]">
                <SupportRow
                  icon="sparkles"
                  title="AI recommendation"
                  badge="Human review"
                  detail={
                    issueCount > 0
                      ? "Correct the highlighted items or request the missing information before approving."
                      : "Review the prepared claim and confirm the final decision."
                  }
                />
                <SupportRow
                  icon="book"
                  title="Policy guidance"
                  badge="Evidence grounded"
                  detail="Open the claim workspace to review the answer and its supporting policy clauses."
                  href={`/runs/${task.run.id}?tab=policy`}
                  linkLabel="View policy guidance"
                />
                <SupportRow
                  icon="brain"
                  title="Similar-claim guidance"
                  badge={memory?.usedByAgent ? "Used by agent" : "Available"}
                  detail={
                    memory?.summary ??
                    "No workflow memory was used for this review."
                  }
                  href={`/runs/${task.run.id}?tab=similar`}
                  linkLabel="View similar claims"
                />
                <SupportRow
                  icon="shield"
                  title="Guardrail decision"
                  badge="Human approval required"
                  detail="The agent could organize facts and evidence, but it could not make the final claim decision."
                />
                <SupportRow
                  icon="history"
                  title="Claim history"
                  badge="Audited"
                  detail="Review the ordered record of how this claim moved forward."
                  href={`/runs/${task.run.id}?tab=history`}
                  linkLabel="View claim history"
                />
              </div>
            </div>
          ) : null}
        </section>

        <aside className="rounded-2xl border border-[#dfe8e3] bg-white p-5 shadow-[0_8px_28px_rgba(18,63,59,0.045)] xl:sticky xl:top-24">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[#123f3b]">
                Your decision
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#667571]">
                Choose the outcome after reviewing the facts and evidence.
              </p>
            </div>
            <span className="rounded-full bg-[#eef8f5] px-2.5 py-1 text-xs font-semibold text-[#155e57]">
              Draft
            </span>
          </div>
          {task.status === "PENDING" ? (
            <div className="mt-5">
              <p className="rounded-xl border border-[#b9dfd3] bg-[#eef8f5] px-4 py-3 text-sm leading-6 text-[#155e57]">
                Start the review to enable corrections and final decision
                actions.
              </p>
              <button
                type="button"
                onClick={() => void startReviewTask(task.id)}
                disabled={isBusy}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f766e] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#155e57] disabled:cursor-wait disabled:bg-[#9bb8b1]"
              >
                <Icon name="user" />
                {actionInFlight === "start"
                  ? "Starting review…"
                  : "Start review"}
              </button>
            </div>
          ) : (
            <>
              <label className="mt-5 block text-sm font-semibold text-[#344441]">
                <span>Reviewer</span>
                <input
                  value={reviewerName}
                  onChange={(event) => setReviewerName(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#dfe8e3] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0f766e] focus:ring-4 focus:ring-[#dcefea]"
                />
              </label>
              <p className="mt-5 text-sm font-semibold text-[#344441]">
                Decision
              </p>
              <div className="mt-2 space-y-2">
                {(
                  [
                    ["approve", "check", "Approve as-is"],
                    ["correct", "pencil", "Correct & approve"],
                    ["request", "send", "Request more information"],
                    ["reject", "x", "Reject"],
                  ] as Array<[DecisionKind, IconName, string]>
                ).map(([value, icon, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={decision === value}
                    onClick={() => {
                      setDecision(value);
                      setLocalError(null);
                    }}
                    className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition ${decision === value ? "border-[#85d9c8] bg-[#dcefea] text-[#123f3b]" : "border-[#dfe8e3] bg-white text-[#667571] hover:border-[#b9dfd3] hover:text-[#155e57]"}`}
                  >
                    <Icon name={icon} />
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-4 rounded-xl bg-[#eef8f5] px-3 py-3 text-xs leading-5 text-[#4e6b66]">
                {decisionHelp[decision]}
              </p>
              <label className="mt-5 block text-sm font-semibold text-[#344441]">
                <span>
                  Reviewer notes{" "}
                  {decision === "request" || decision === "reject" ? (
                    <span className="text-red-600">*</span>
                  ) : null}
                </span>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Add context for this decision…"
                  className="mt-2 w-full resize-y rounded-xl border border-[#dfe8e3] bg-white px-3 py-2.5 text-sm leading-6 outline-none focus:border-[#0f766e] focus:ring-4 focus:ring-[#dcefea]"
                />
              </label>
              <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[#667571]">
                <Icon
                  name="shield"
                  className="mt-0.5 h-[17px] w-[17px] shrink-0 text-[#0f766e]"
                />
                The originally prepared claim remains unchanged. Your decision
                and corrected version are recorded separately.
              </p>
              {localError ? (
                <div
                  role="alert"
                  className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700"
                >
                  {localError}
                </div>
              ) : null}
              <div className="mt-5 border-t border-[#dfe8e3] pt-4">
                <button
                  type="button"
                  onClick={submitDecision}
                  disabled={
                    isBusy || (decision === "approve" && !canApproveAsIs)
                  }
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed ${decision === "reject" ? "bg-[#a64f49] hover:bg-[#8f423d] disabled:bg-[#c8aaa7]" : "bg-[#0f766e] hover:bg-[#155e57] disabled:bg-[#9bb8b1]"}`}
                >
                  {isBusy ? "Saving decision…" : actionLabel[decision]}
                </button>
              </div>
            </>
          )}
        </aside>
      </div>
    </>
  );
}

function FactSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5 border-t border-[#dfe8e3] pt-5">
      <h3 className="text-base font-semibold text-[#123f3b]">{title}</h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  disabled,
  needsAttention = false,
  receivedFromClaimant = false,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  needsAttention?: boolean;
  receivedFromClaimant?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block text-sm font-semibold text-[#344441]">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-2 w-full rounded-xl border bg-white px-3 py-2.5 text-sm outline-none transition disabled:bg-[#f4f6f5] ${receivedFromClaimant ? "border-[#85d9c8] ring-4 ring-[#eef8f5] focus:border-[#0f766e]" : needsAttention ? "border-[#d6a15c] ring-4 ring-[#fff2df]" : "border-[#dfe8e3] focus:border-[#0f766e] focus:ring-4 focus:ring-[#dcefea]"}`}
      />
      {receivedFromClaimant ? (
        <span className="mt-2 flex items-center gap-1.5 text-xs font-normal text-[#155e57]">
          <Icon name="inbox" className="h-3.5 w-3.5" />
          Received from claimant — verify before approval
        </span>
      ) : needsAttention ? (
        <span className="mt-2 block text-xs font-normal text-[#8c5b1c]">
          Needs review
        </span>
      ) : null}
    </label>
  );
}

function EvidenceRow({
  icon,
  title,
  detail,
  verified,
  editable = false,
  onChange,
}: {
  icon: "file-check" | "file-warning";
  title: string;
  detail: string;
  verified: boolean;
  editable?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <div className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="grid min-w-0 grid-cols-[40px_minmax(0,1fr)] items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#dcefea] text-[#155e57]">
          <Icon name={icon} className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#20302e]">{title}</p>
          <p className="mt-1 text-xs leading-5 text-[#667571]">{detail}</p>
        </div>
      </div>
      {editable && onChange ? (
        <label className="ml-[52px] flex w-fit items-center gap-2 text-xs font-semibold text-[#155e57] sm:ml-0">
          <input
            type="checkbox"
            checked={verified}
            onChange={(event) => onChange(event.target.checked)}
            className="h-4 w-4 accent-[#0f766e]"
          />
          {verified ? "Confirmed" : "Mark received"}
        </label>
      ) : (
        <span
          className={`ml-[52px] w-fit rounded-full px-2.5 py-1 text-xs font-semibold sm:ml-0 ${verified ? "bg-[#eef8f5] text-[#155e57]" : "bg-[#fff2df] text-[#8c5b1c]"}`}
        >
          {verified ? "Verified" : "Missing"}
        </span>
      )}
    </div>
  );
}

function SupportRow({
  icon,
  title,
  badge,
  detail,
  href,
  linkLabel,
}: {
  icon: "sparkles" | "book" | "brain" | "shield" | "history";
  title: string;
  badge: string;
  detail: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#dcefea] text-[#155e57]">
        <Icon name={icon} className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-[#20302e]">{title}</p>
          <span className="rounded-full bg-[#eef8f5] px-2 py-1 text-[11px] font-semibold text-[#155e57]">
            {badge}
          </span>
        </div>
        <p className="mt-1 text-sm leading-6 text-[#667571]">{detail}</p>
        {href && linkLabel ? (
          <Link
            href={href}
            className="mt-2 inline-flex text-sm font-semibold text-[#0f766e] hover:underline"
          >
            {linkLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function HumanDecisionExperience({ taskId }: { taskId: string }) {
  const selectedReviewTask = useDashboardStore(
    (state) => state.selectedReviewTask,
  );
  const isFetchingReviewTask = useDashboardStore(
    (state) => state.isFetchingReviewTask,
  );
  const fetchReviewTask = useDashboardStore((state) => state.fetchReviewTask);
  const clearMessages = useDashboardStore((state) => state.clearMessages);
  const error = useDashboardStore((state) => state.error);
  const successMessage = useDashboardStore((state) => state.successMessage);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    clearMessages();
    void fetchReviewTask(taskId);
  }, [clearMessages, fetchReviewTask, taskId]);
  const task = selectedReviewTask?.id === taskId ? selectedReviewTask : null;
  const claim = task ? parseClaim(task.run.extractedJson) : null;
  const claimant =
    claim?.claimantName ??
    claim?.insuredName ??
    (task ? friendlyFilename(task.run.document.filename) : "Human decision");
  const claimNumber =
    claim?.claimNumber ??
    (task ? `Claim ${task.run.id.slice(0, 8).toUpperCase()}` : taskId);
  const vehicle =
    [claim?.vehicle.make, claim?.vehicle.model].filter(Boolean).join(" ") ||
    claim?.vehicle.registrationNumber ||
    "Claim review";
  const resolved = Boolean(task && terminalStatuses.has(task.status));
  const sidebarActive = resolved ? ("resolved" as const) : ("review" as const);

  return (
    <div className="min-h-screen bg-[#fbfaf6] text-[#20302e]">
      <div className="flex min-h-screen">
        <aside
          className={`sticky top-0 hidden h-screen shrink-0 border-r border-[#dfe8e3] transition-[width] duration-200 lg:block ${sidebarCollapsed ? "w-20" : "w-56"}`}
        >
          <Sidebar
            collapsed={sidebarCollapsed}
            active={sidebarActive}
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
                active={sidebarActive}
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
                <span className="sr-only">Search claimant or claim number</span>
                <input
                  type="search"
                  placeholder="Search claimant or claim number"
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
            <nav
              className="mb-4 flex flex-wrap items-center gap-2 text-sm text-[#667571]"
              aria-label="Breadcrumb"
            >
              <Link
                href="/review"
                className="font-semibold text-[#0f766e] hover:underline"
              >
                {resolved ? "Resolved" : "Review queue"}
              </Link>
              <span>/</span>
              <span>{claimNumber}</span>
            </nav>
            {error ? (
              <div
                role="alert"
                className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            ) : null}
            {successMessage ? (
              <div className="mb-5 rounded-xl border border-[#b9dfd3] bg-[#eef8f5] px-4 py-3 text-sm text-[#155e57]">
                {successMessage}
              </div>
            ) : null}
            {isFetchingReviewTask ? (
              <div className="rounded-2xl border border-[#dfe8e3] bg-white p-6 text-sm text-[#667571]">
                Loading the human review workspace…
              </div>
            ) : null}
            {!isFetchingReviewTask && !task ? (
              <div className="rounded-2xl border border-[#dfe8e3] bg-white p-6 text-sm text-[#667571]">
                Review task not found.
              </div>
            ) : null}
            {task ? (
              <>
                <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-[#123f3b]">
                      {claimant}
                    </h1>
                    <p className="mt-2 text-sm text-[#667571] sm:text-base">
                      {claimNumber} ·{" "}
                      {titleCase(claim?.incident.lossType ?? "claim")} ·{" "}
                      {vehicle}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-[#fff2df] px-3 py-1.5 text-xs font-semibold text-[#8c5b1c]">
                        <Icon name="flag" />
                        {titleCase(task.priority)} priority
                      </span>
                      <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-[#eef8f5] px-3 py-1.5 text-xs font-semibold text-[#155e57]">
                        <Icon name="user" />
                        {statusLabel(task.status)}
                      </span>
                    </div>
                    <Link
                      href={`/runs/${task.run.id}`}
                      className="rounded-xl border border-[#b9dfd3] bg-white px-3 py-2 text-sm font-semibold text-[#155e57] transition hover:bg-[#eef8f5]"
                    >
                      Open Claim Workspace
                    </Link>
                  </div>
                </section>
                <HumanDecisionWorkspace key={task.id} task={task} />
              </>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
