"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ExtractionRunRecord,
  ReviewTaskRecord,
} from "../../store/use-dashboard-store";
import { useDashboardStore } from "../../store/use-dashboard-store";
import { UserAccountControl } from "../auth/user-account-control";

type ClaimStage = "attention" | "waiting" | "ready" | "preparing";
type ClaimFilter = "all" | Exclude<ClaimStage, "preparing">;
type IntakeMode = "pdf" | "email";
type IntakeStep = "form" | "preparing" | "ready";

type ClaimView = {
  claimNumber: string;
  claimantName: string;
  initials: string;
  vehicle: string;
  stage: ClaimStage;
  stageLabel: string;
  trustDetail: string;
  priority: "LOW" | "NORMAL" | "HIGH";
  run: ExtractionRunRecord;
};

type ExtractionView = {
  claimNumber?: unknown;
  claimantName?: unknown;
  insuredName?: unknown;
  vehicle?: {
    make?: unknown;
    model?: unknown;
    registrationNumber?: unknown;
  };
};

type ReasonView = {
  missingFields?: unknown;
  requiredEvidence?: unknown;
};

type IconName =
  | "activity"
  | "bell"
  | "check"
  | "chevron-left"
  | "chevron-right"
  | "file"
  | "inbox"
  | "mail"
  | "menu"
  | "plus"
  | "search"
  | "send"
  | "shield"
  | "sparkles"
  | "upload"
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
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
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
    inbox: (
      <>
        <path d="M22 12h-6l-2 3h-4l-2-3H2" />
        <path d="m5.5 5.5-3.5 6V20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8.5l-3.5-6A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.5Z" />
      </>
    ),
    mail: (
      <>
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.9 1.9 0 0 1-2.06 0L2 7" />
      </>
    ),
    menu: (
      <>
        <path d="M4 6h16M4 12h16M4 18h16" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
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
    upload: (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="m17 8-5-5-5 5M12 3v12" />
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
  return typeof value === "object" && value !== null;
}

function textValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getExtraction(run: ExtractionRunRecord): ExtractionView {
  return isRecord(run.extractedJson)
    ? (run.extractedJson as ExtractionView)
    : {};
}

function getReasonCounts(task: ReviewTaskRecord | null) {
  const reason = isRecord(task?.reasonJson)
    ? (task.reasonJson as ReasonView)
    : null;
  const missingFields = Array.isArray(reason?.missingFields)
    ? reason.missingFields.length
    : 0;
  const requiredEvidence = Array.isArray(reason?.requiredEvidence)
    ? reason.requiredEvidence.length
    : 0;
  return missingFields + requiredEvidence;
}

function hasReceivedInformation(run: ExtractionRunRecord) {
  return run.events.some(
    (event) =>
      event.type === "ADDITIONAL_INFORMATION_RECEIVED" ||
      event.type === "REVIEW_REOPENED",
  );
}

function stageFor(
  run: ExtractionRunRecord,
  task: ReviewTaskRecord | null,
): ClaimStage {
  if (task?.status === "NEEDS_MORE_INFO") return "waiting";
  if (task?.status === "PENDING") {
    if (hasReceivedInformation(run)) return "ready";
    return run.status === "NEEDS_REVIEW" ||
      run.status === "FAILED" ||
      getReasonCounts(task) > 0
      ? "attention"
      : "ready";
  }
  if (run.status === "COMPLETED" && (!task || task.status === "IN_REVIEW"))
    return "ready";
  if (run.status === "NEEDS_REVIEW" || run.status === "FAILED") {
    return "attention";
  }
  return "preparing";
}

function stageContent(
  stage: ClaimStage,
  task: ReviewTaskRecord | null,
  run: ExtractionRunRecord,
) {
  if (stage === "waiting") {
    return {
      label: "Waiting for information",
      detail: "Information request prepared and recorded",
    };
  }
  if (stage === "ready") {
    if (task?.status === "IN_REVIEW") {
      return {
        label: "In review",
        detail: "A reviewer is verifying the prepared claim",
      };
    }
    return {
      label: "Ready for review",
      detail: "Claim facts validated and ready to review",
    };
  }
  if (stage === "attention") {
    const issueCount = getReasonCounts(task);
    return {
      label: "Needs attention",
      detail:
        issueCount > 0
          ? `${issueCount} missing ${issueCount === 1 ? "item" : "items"} identified`
          : run.status === "FAILED"
            ? "Claim preparation needs review"
            : "Human review is required",
    };
  }
  if (run.status === "UPLOADED") {
    return {
      label: "Ready to prepare",
      detail: "Open the claim to start processing",
    };
  }
  if (run.status === "VALIDATING") {
    return {
      label: "Ready to validate",
      detail: "Claim facts are ready for checks",
    };
  }
  return {
    label: "AI preparing case",
    detail: "Organizing claim facts and evidence",
  };
}

function initialsFor(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (!parts.length) return "CF";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function friendlyFilename(filename: string) {
  const withoutExtension = filename.replace(/\.[^.]+$/, "");
  if (/^email-text-\d+$/i.test(withoutExtension)) return "New email claim";
  const label = withoutExtension.replaceAll("-", " ").replaceAll("_", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function buildClaimView(
  run: ExtractionRunRecord,
  task: ReviewTaskRecord | null,
): ClaimView {
  const extraction = getExtraction(run);
  const claimantName =
    textValue(extraction.claimantName) ??
    textValue(extraction.insuredName) ??
    friendlyFilename(run.document.filename);
  const claimNumber =
    textValue(extraction.claimNumber) ??
    `Claim ${run.id.slice(0, 8).toUpperCase()}`;
  const vehicle = isRecord(extraction.vehicle) ? extraction.vehicle : {};
  const make = textValue(vehicle.make);
  const model = textValue(vehicle.model);
  const registration = textValue(vehicle.registrationNumber);
  const vehicleLabel =
    [make, model].filter(Boolean).join(" ") ||
    registration ||
    (run.document.sourceType === "PDF" ? "PDF claim" : "Email claim");
  const stage = stageFor(run, task);
  const content = stageContent(stage, task, run);

  return {
    claimNumber,
    claimantName,
    initials: initialsFor(claimantName),
    vehicle: vehicleLabel,
    stage,
    stageLabel: content.label,
    trustDetail: content.detail,
    priority: task?.priority ?? "NORMAL",
    run,
  };
}

const resolvedStatuses = new Set([
  "APPROVED",
  "EDITED_AND_APPROVED",
  "REJECTED",
]);

const stageStyles: Record<ClaimStage, { dot: string; icon: IconName }> = {
  attention: { dot: "bg-[#d68a2f]", icon: "shield" },
  waiting: { dot: "bg-[#4e9d7e]", icon: "send" },
  ready: { dot: "bg-[#0f766e]", icon: "check" },
  preparing: { dot: "bg-[#8aa09a]", icon: "sparkles" },
};

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

export function ClaimsDashboardScreen() {
  const router = useRouter();
  const runs = useDashboardStore((state) => state.runs);
  const reviewTasks = useDashboardStore((state) => state.reviewTasks);
  const isFetchingRuns = useDashboardStore((state) => state.isFetchingRuns);
  const isUploadingPdf = useDashboardStore((state) => state.isUploadingPdf);
  const isSubmittingEmail = useDashboardStore(
    (state) => state.isSubmittingEmail,
  );
  const error = useDashboardStore((state) => state.error);
  const successMessage = useDashboardStore((state) => state.successMessage);
  const fetchRuns = useDashboardStore((state) => state.fetchRuns);
  const fetchReviewTasks = useDashboardStore((state) => state.fetchReviewTasks);
  const uploadPdf = useDashboardStore((state) => state.uploadPdf);
  const submitEmailText = useDashboardStore((state) => state.submitEmailText);
  const extractRun = useDashboardStore((state) => state.extractRun);
  const validateRun = useDashboardStore((state) => state.validateRun);
  const clearMessages = useDashboardStore((state) => state.clearMessages);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [intakeMode, setIntakeMode] = useState<IntakeMode>("pdf");
  const [intakeStep, setIntakeStep] = useState<IntakeStep>("form");
  const [file, setFile] = useState<File | null>(null);
  const [emailText, setEmailText] = useState("");
  const [intakeError, setIntakeError] = useState<string | null>(null);
  const [createdRunId, setCreatedRunId] = useState<string | null>(null);
  const [createdMessage, setCreatedMessage] = useState("");
  const [filter, setFilter] = useState<ClaimFilter>("all");
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isCreatingClaim =
    isUploadingPdf || isSubmittingEmail || intakeStep === "preparing";

  useEffect(() => {
    void Promise.all([fetchRuns(), fetchReviewTasks()]);
  }, [fetchReviewTasks, fetchRuns]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!isCreatingClaim) setIntakeOpen(false);
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isCreatingClaim]);

  useEffect(() => {
    if (!intakeOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [intakeOpen]);

  const taskByRunId = useMemo(() => {
    const map = new Map<string, ReviewTaskRecord>();
    reviewTasks.forEach((task) => {
      if (!map.has(task.runId)) map.set(task.runId, task);
    });
    return map;
  }, [reviewTasks]);

  const claims = useMemo(() => {
    const activeRuns = runs.filter((run) => {
      const task = taskByRunId.get(run.id);
      return !task || !resolvedStatuses.has(task.status);
    });
    return activeRuns.map((run) =>
      buildClaimView(run, taskByRunId.get(run.id) ?? null),
    );
  }, [runs, taskByRunId]);

  const counts = useMemo(
    () => ({
      attention: claims.filter((claim) => claim.stage === "attention").length,
      waiting: claims.filter((claim) => claim.stage === "waiting").length,
      ready: claims.filter((claim) => claim.stage === "ready").length,
      highPriority: claims.filter(
        (claim) => claim.stage === "attention" && claim.priority === "HIGH",
      ).length,
    }),
    [claims],
  );

  const visibleClaims = useMemo(() => {
    const term = search.trim().toLowerCase();
    return claims.filter((claim) => {
      const stageMatches = filter === "all" || claim.stage === filter;
      const searchText = [
        claim.claimantName,
        claim.claimNumber,
        claim.vehicle,
        claim.run.document.filename,
      ]
        .join(" ")
        .toLowerCase();
      return stageMatches && (!term || searchText.includes(term));
    });
  }, [claims, filter, search]);

  const openIntake = () => {
    clearMessages();
    setIntakeMode("pdf");
    setIntakeStep("form");
    setFile(null);
    setEmailText("");
    setIntakeError(null);
    setCreatedRunId(null);
    setCreatedMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIntakeOpen(true);
  };

  const closeIntake = () => {
    if (isCreatingClaim) return;
    setIntakeOpen(false);
    setIntakeStep("form");
    setFile(null);
    setEmailText("");
    setIntakeError(null);
    setCreatedRunId(null);
    setCreatedMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const selectIntakeMode = (mode: IntakeMode) => {
    clearMessages();
    setIntakeError(null);
    setIntakeMode(mode);
  };

  const selectPdf = (selectedFile: File | null) => {
    setIntakeError(null);
    if (!selectedFile) {
      setFile(null);
      return;
    }

    const looksLikePdf =
      selectedFile.type === "application/pdf" ||
      selectedFile.name.toLowerCase().endsWith(".pdf");
    if (!looksLikePdf) {
      setFile(null);
      setIntakeError("Choose a PDF file to create this claim.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setFile(selectedFile);
  };

  const handlePdfSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) return;
    setIntakeError(null);
    setIntakeStep("preparing");
    const response = await uploadPdf(file);
    if (!response) {
      setIntakeStep("form");
      return;
    }
    if (!response.run?.id) {
      setIntakeError(
        "The claim source was saved, but no workspace was returned. Please try again.",
      );
      setIntakeStep("form");
      return;
    }
    setCreatedRunId(response.run.id);
    const extracted = await extractRun(response.run.id);
    if (!extracted) {
      setCreatedMessage(
        "The claim source was saved, but preparation needs attention. Open the workspace to retry safely.",
      );
      setIntakeStep("ready");
      return;
    }
    const validated = await validateRun(response.run.id);
    setCreatedMessage(
      validated
        ? "ClaimFlow organized the claim and completed its readiness checks."
        : "The claim facts were organized, but the readiness checks need attention.",
    );
    setIntakeStep("ready");
  };

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (emailText.trim().length < 20) return;
    setIntakeError(null);
    setIntakeStep("preparing");
    const response = await submitEmailText(emailText);
    if (!response) {
      setIntakeStep("form");
      return;
    }
    if (!response.run?.id) {
      setIntakeError(
        "The claim email was saved, but no workspace was returned. Please try again.",
      );
      setIntakeStep("form");
      return;
    }
    setCreatedRunId(response.run.id);
    const extracted = await extractRun(response.run.id);
    if (!extracted) {
      setCreatedMessage(
        "The claim email was saved, but preparation needs attention. Open the workspace to retry safely.",
      );
      setIntakeStep("ready");
      return;
    }
    const validated = await validateRun(response.run.id);
    setCreatedMessage(
      validated
        ? "ClaimFlow organized the claim and completed its readiness checks."
        : "The claim facts were organized, but the readiness checks need attention.",
    );
    setIntakeStep("ready");
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
            <div className="flex w-full items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
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
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  type="search"
                  placeholder="Search claimant or claim number"
                  className="min-w-0 flex-1 bg-transparent text-sm text-[#20302e] outline-none placeholder:text-[#87928f]"
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
            <div className="px-4 pb-3 sm:hidden">
              <label className="flex items-center gap-2 rounded-xl border border-[#dfe8e3] bg-[#fbfaf6] px-3 py-2.5 text-[#667571]">
                <Icon name="search" />
                <span className="sr-only">Search claimant or claim number</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  type="search"
                  placeholder="Search claimant or claim number"
                  className="min-w-0 flex-1 bg-transparent text-sm text-[#20302e] outline-none placeholder:text-[#87928f]"
                />
              </label>
            </div>
          </header>

          <div className="w-full px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
            {successMessage ? (
              <div className="mb-5 rounded-xl border border-[#b9dfd3] bg-[#eef8f5] px-4 py-3 text-sm text-[#155e57]">
                {successMessage}
              </div>
            ) : null}
            {error ? (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-[#123f3b]">
                  Claims
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667571] sm:text-base">
                  Pick up the next case, see what needs attention, and move it
                  forward.
                </p>
              </div>
              <button
                type="button"
                onClick={openIntake}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(15,118,110,0.16)] transition hover:bg-[#155e57]"
              >
                <Icon name="plus" /> New claim
              </button>
            </div>

            <section
              className="mt-6 grid gap-3 sm:grid-cols-3"
              aria-label="Claims workload summary"
            >
              <article className="rounded-2xl border border-[#dfe8e3] bg-white p-4 shadow-[0_6px_20px_rgba(18,63,59,0.035)]">
                <p className="text-sm text-[#667571]">Needs attention</p>
                <p className="mt-1 text-2xl font-semibold text-[#123f3b]">
                  {counts.attention}
                </p>
                <p className="mt-2 flex items-center gap-2 text-xs text-[#667571]">
                  <span className="h-2 w-2 rounded-full bg-[#d68a2f]" />
                  {counts.highPriority} high priority
                </p>
              </article>
              <article className="rounded-2xl border border-[#dfe8e3] bg-white p-4 shadow-[0_6px_20px_rgba(18,63,59,0.035)]">
                <p className="text-sm text-[#667571]">
                  Waiting for information
                </p>
                <p className="mt-1 text-2xl font-semibold text-[#123f3b]">
                  {counts.waiting}
                </p>
                <p className="mt-2 flex items-center gap-2 text-xs text-[#667571]">
                  <span className="h-2 w-2 rounded-full bg-[#4e9d7e]" />
                  Awaiting claimant response
                </p>
              </article>
              <article className="rounded-2xl border border-[#dfe8e3] bg-white p-4 shadow-[0_6px_20px_rgba(18,63,59,0.035)]">
                <p className="text-sm text-[#667571]">Ready for review</p>
                <p className="mt-1 text-2xl font-semibold text-[#123f3b]">
                  {counts.ready}
                </p>
                <p className="mt-2 flex items-center gap-2 text-xs text-[#667571]">
                  <span className="h-2 w-2 rounded-full bg-[#0f766e]" />
                  Prepared for reviewer verification
                </p>
              </article>
            </section>

            <section className="mt-8">
              <div className="flex flex-col gap-4 border-b border-[#dfe8e3] pb-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-[#123f3b]">
                    Your active work
                  </h2>
                  <p className="mt-1 text-sm text-[#667571]">
                    {visibleClaims.length}{" "}
                    {visibleClaims.length === 1 ? "claim" : "claims"} shown
                  </p>
                </div>
                <div
                  className="flex flex-wrap gap-2"
                  aria-label="Filter claims"
                >
                  {(
                    [
                      ["all", "All"],
                      ["attention", "Needs attention"],
                      ["waiting", "Waiting"],
                      ["ready", "Ready"],
                    ] as Array<[ClaimFilter, string]>
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={filter === value}
                      onClick={() => setFilter(value)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${filter === value ? "border-[#85d9c8] bg-[#dcefea] text-[#123f3b]" : "border-[#dfe8e3] bg-white text-[#667571] hover:border-[#b9dfd3] hover:text-[#155e57]"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {isFetchingRuns ? (
                <div className="py-10 text-center text-sm text-[#667571]">
                  Preparing your claims workspace…
                </div>
              ) : null}
              {!isFetchingRuns && claims.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#dcefea] text-[#155e57]">
                    <Icon name="file" className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-[#123f3b]">
                    No active claims yet
                  </h3>
                  <p className="mt-1 text-sm text-[#667571]">
                    Create a claim from a PDF or the original claim email.
                  </p>
                  <button
                    type="button"
                    onClick={openIntake}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0f766e] px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    <Icon name="plus" /> New claim
                  </button>
                </div>
              ) : null}
              {!isFetchingRuns &&
              claims.length > 0 &&
              visibleClaims.length === 0 ? (
                <div className="py-10 text-center text-sm text-[#667571]">
                  No claims match this view.
                </div>
              ) : null}

              <div className="mt-4 space-y-3">
                {visibleClaims.map((claim) => {
                  const style = stageStyles[claim.stage];
                  const isNewClaim =
                    claim.stage === "preparing" ||
                    claim.run.id === createdRunId;
                  return (
                    <article
                      key={claim.run.id}
                      aria-label={`${claim.claimantName}, ${claim.stageLabel}`}
                      className={`relative grid gap-4 rounded-2xl border px-5 py-5 shadow-[0_7px_24px_rgba(18,63,59,0.04)] transition hover:border-[#b9d8d1] hover:shadow-[0_10px_28px_rgba(18,63,59,0.07)] md:grid-cols-[minmax(220px,1fr)_auto] md:items-center md:gap-x-6 xl:grid-cols-[minmax(240px,0.9fr)_minmax(0,1.4fr)_auto] ${isNewClaim ? "border-[#b9ded4] border-l-4 border-l-[#20a58f] bg-[#f3faf7]" : "border-[#d8e3df] bg-white"}`}
                    >
                      <div className="flex min-w-0 items-center gap-4 md:col-span-2 xl:col-span-1">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#dcefea] text-sm font-semibold text-[#123f3b]">
                          {claim.initials}
                        </span>
                        <div className="min-w-0">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <h3 className="truncate text-base font-semibold text-[#20302e]">
                              {claim.claimantName}
                            </h3>
                            {isNewClaim ? (
                              <span className="rounded-full bg-[#0f766e] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
                                New
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 truncate text-sm text-[#667571]">
                            {claim.claimNumber} · {claim.vehicle}
                          </p>
                        </div>
                      </div>

                      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 text-sm md:col-start-1 md:row-start-2 xl:col-auto xl:row-auto xl:flex-nowrap xl:whitespace-nowrap">
                        <span
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`}
                        />
                        <span className="font-semibold text-[#20302e]">
                          {claim.stageLabel}
                        </span>
                        <span
                          aria-hidden="true"
                          className="hidden h-6 w-px shrink-0 bg-[#d5dfdc] sm:block"
                        />
                        <Icon
                          name={style.icon}
                          className="h-[18px] w-[18px] shrink-0 text-[#70827e]"
                        />
                        <span className="text-[#667571]">
                          {claim.trustDetail}
                        </span>
                      </div>

                      <Link
                        href={`/runs/${claim.run.id}`}
                        className="inline-flex shrink-0 items-center justify-center gap-2 justify-self-end rounded-xl border border-[#155e57] bg-[#155e57] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_7px_16px_rgba(21,94,87,0.13)] transition hover:bg-[#123f3b] md:col-start-2 md:row-start-2 xl:col-auto xl:row-auto"
                      >
                        Open claim{" "}
                        <Icon name="chevron-right" className="h-4 w-4" />
                      </Link>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        </main>
      </div>

      {intakeOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close new claim"
            disabled={isCreatingClaim}
            onClick={closeIntake}
            className="absolute inset-0 bg-[#123f3b]/25 backdrop-blur-[1px] disabled:cursor-wait"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-claim-title"
            className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-[#dfe8e3] bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-[#dfe8e3] px-5 py-5 sm:px-7">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#4e7d75]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0f766e]" />
                  New claim
                </p>
                <h2
                  id="new-claim-title"
                  className="mt-2 text-2xl font-semibold text-[#123f3b]"
                >
                  {intakeStep === "form"
                    ? "Start a new claim"
                    : intakeStep === "preparing"
                      ? "Preparing the claim"
                      : "Claim workspace is ready"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeIntake}
                disabled={isCreatingClaim}
                aria-label="Close new claim"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#dfe8e3] bg-[#fbfaf6] text-[#667571] transition hover:border-[#b9dfd3] hover:text-[#123f3b] disabled:cursor-wait disabled:opacity-50"
              >
                <Icon name="x" />
              </button>
            </header>

            {intakeStep === "form" ? (
              <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7">
                <p className="text-sm leading-6 text-[#667571]">
                  Add the material you received. ClaimFlow will organize it into
                  a clear, review-ready workspace.
                </p>

                <div
                  className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-[#eef8f5] p-1.5"
                  aria-label="Choose claim input method"
                >
                  <button
                    type="button"
                    aria-pressed={intakeMode === "pdf"}
                    onClick={() => selectIntakeMode("pdf")}
                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${intakeMode === "pdf" ? "bg-white text-[#123f3b] shadow-sm" : "text-[#667571] hover:text-[#155e57]"}`}
                  >
                    <Icon name="upload" /> Upload PDF
                  </button>
                  <button
                    type="button"
                    aria-pressed={intakeMode === "email"}
                    onClick={() => selectIntakeMode("email")}
                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${intakeMode === "email" ? "bg-white text-[#123f3b] shadow-sm" : "text-[#667571] hover:text-[#155e57]"}`}
                  >
                    <Icon name="mail" /> Paste email
                  </button>
                </div>

                {intakeError || error ? (
                  <div
                    role="alert"
                    className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    {intakeError ?? error}
                  </div>
                ) : null}

                {intakeMode === "pdf" ? (
                  <form onSubmit={handlePdfSubmit} className="mt-6">
                    <label className="block cursor-pointer rounded-2xl border border-dashed border-[#b9dfd3] bg-[#fbfaf6] p-6 text-center transition hover:border-[#0f766e] hover:bg-[#f8fcfa]">
                      <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-[#dcefea] text-[#155e57]">
                        <Icon name="upload" className="h-5 w-5" />
                      </span>
                      <span className="mt-3 block text-sm font-semibold text-[#123f3b]">
                        Choose one claim PDF
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-[#667571]">
                        One PDF creates one claim run. Choosing another file
                        replaces the current selection.
                      </span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={(event) =>
                          selectPdf(event.target.files?.[0] ?? null)
                        }
                        className="mt-4 block w-full text-xs text-[#667571] file:mr-3 file:rounded-lg file:border-0 file:bg-[#dcefea] file:px-3 file:py-2 file:font-semibold file:text-[#155e57]"
                      />
                    </label>

                    {file ? (
                      <div className="mt-4 flex items-center justify-between gap-4 border-y border-[#dfe8e3] py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#dcefea] text-[#155e57]">
                            <Icon name="file" className="h-[18px] w-[18px]" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#20302e]">
                              {file.name}
                            </p>
                            <p className="mt-1 text-xs text-[#667571]">
                              {formatFileSize(file.size)} · Ready to add
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-label={`Remove ${file.name}`}
                          onClick={() => {
                            setFile(null);
                            if (fileInputRef.current)
                              fileInputRef.current.value = "";
                          }}
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[#667571] transition hover:bg-[#eef8f5] hover:text-[#123f3b]"
                        >
                          <Icon name="x" />
                        </button>
                      </div>
                    ) : null}

                    <div className="mt-6 rounded-2xl border border-[#dfe8e3] bg-[#eef8f5]/70 p-4">
                      <p className="text-sm font-semibold text-[#123f3b]">
                        ClaimFlow will prepare
                      </p>
                      <div className="mt-3 space-y-3 text-sm text-[#667571]">
                        <p className="flex items-center gap-2">
                          <Icon
                            name="file"
                            className="h-[18px] w-[18px] text-[#0f766e]"
                          />
                          Claim and claimant details
                        </p>
                        <p className="flex items-center gap-2">
                          <Icon
                            name="shield"
                            className="h-[18px] w-[18px] text-[#0f766e]"
                          />
                          Completeness and policy evidence checks
                        </p>
                        <p className="flex items-center gap-2">
                          <Icon
                            name="sparkles"
                            className="h-[18px] w-[18px] text-[#0f766e]"
                          />
                          A review-ready Claim Workspace
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#dfe8e3] pt-5 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-[#667571]">
                        {file
                          ? "1 PDF ready to add"
                          : "Select one PDF to continue"}
                      </p>
                      <button
                        type="submit"
                        disabled={!file || isUploadingPdf}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f766e] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(15,118,110,0.16)] transition hover:bg-[#155e57] disabled:cursor-not-allowed disabled:bg-[#9bb8b1] disabled:shadow-none"
                      >
                        Create claim <Icon name="chevron-right" />
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleEmailSubmit} className="mt-6">
                    <label
                      className="block text-sm font-semibold text-[#123f3b]"
                      htmlFor="claim-email-text"
                    >
                      Original claim email
                    </label>
                    <p className="mt-1 text-xs leading-5 text-[#667571]">
                      Paste the claimant’s email or accident summary exactly as
                      received.
                    </p>
                    <textarea
                      id="claim-email-text"
                      value={emailText}
                      onChange={(event) => {
                        setEmailText(event.target.value);
                        setIntakeError(null);
                      }}
                      rows={11}
                      placeholder="Paste the claim email here…"
                      className="mt-3 w-full resize-y rounded-2xl border border-[#dfe8e3] bg-[#fbfaf6] px-4 py-3 text-sm leading-6 text-[#20302e] outline-none transition placeholder:text-[#98a29f] focus:border-[#0f766e] focus:ring-4 focus:ring-[#dcefea]"
                    />
                    <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[#667571]">
                      <span>Minimum 20 characters</span>
                      <span>{emailText.length} characters</span>
                    </div>

                    <div className="mt-6 rounded-2xl border border-[#dfe8e3] bg-[#eef8f5]/70 p-4">
                      <p className="text-sm font-semibold text-[#123f3b]">
                        ClaimFlow will prepare
                      </p>
                      <div className="mt-3 space-y-3 text-sm text-[#667571]">
                        <p className="flex items-center gap-2">
                          <Icon
                            name="mail"
                            className="h-[18px] w-[18px] text-[#0f766e]"
                          />
                          Claim and claimant details from the email
                        </p>
                        <p className="flex items-center gap-2">
                          <Icon
                            name="shield"
                            className="h-[18px] w-[18px] text-[#0f766e]"
                          />
                          Completeness and policy evidence checks
                        </p>
                        <p className="flex items-center gap-2">
                          <Icon
                            name="sparkles"
                            className="h-[18px] w-[18px] text-[#0f766e]"
                          />
                          A review-ready Claim Workspace
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#dfe8e3] pt-5 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-[#667571]">
                        {emailText.trim().length >= 20
                          ? "Email text ready to add"
                          : "Add the claim email to continue"}
                      </p>
                      <button
                        type="submit"
                        disabled={
                          emailText.trim().length < 20 || isSubmittingEmail
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f766e] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(15,118,110,0.16)] transition hover:bg-[#155e57] disabled:cursor-not-allowed disabled:bg-[#9bb8b1] disabled:shadow-none"
                      >
                        Create claim <Icon name="chevron-right" />
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : null}

            {intakeStep === "preparing" ? (
              <div className="flex flex-1 flex-col justify-center px-7 py-10 sm:px-12">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#dcefea] text-[#0f766e]">
                  <Icon name="sparkles" className="h-6 w-6 animate-pulse" />
                </span>
                <h3 className="mt-6 text-xl font-semibold text-[#123f3b]">
                  Creating the Claim Workspace
                </h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-[#667571]">
                  The source is being saved, organized and checked for anything
                  that needs attention. Keep this drawer open until the
                  workspace is ready.
                </p>
                <div className="mt-7 h-2 overflow-hidden rounded-full bg-[#eef8f5]">
                  <div className="h-full w-2/3 animate-pulse rounded-full bg-[#0f766e]" />
                </div>
                <div className="mt-7 space-y-4 text-sm">
                  <p className="flex items-center gap-3 font-semibold text-[#20302e]">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-[#dcefea] text-[#0f766e]">
                      <Icon name="upload" />
                    </span>
                    Saving the claim source
                  </p>
                  <p className="flex items-center gap-3 text-[#667571]">
                    <span className="grid h-7 w-7 place-items-center rounded-full border border-[#dfe8e3]">
                      2
                    </span>
                    Organizing claim facts
                  </p>
                  <p className="flex items-center gap-3 text-[#667571]">
                    <span className="grid h-7 w-7 place-items-center rounded-full border border-[#dfe8e3]">
                      3
                    </span>
                    Checking completeness and evidence
                  </p>
                </div>
              </div>
            ) : null}

            {intakeStep === "ready" ? (
              <div className="flex flex-1 flex-col justify-center px-7 py-10 sm:px-12">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#dcefea] text-[#0f766e]">
                  <Icon name="check" className="h-6 w-6" />
                </span>
                <h3 className="mt-6 text-xl font-semibold text-[#123f3b]">
                  Your claim workspace is ready
                </h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-[#667571]">
                  {createdMessage}
                </p>
                <div className="mt-7 rounded-2xl border border-[#dfe8e3] bg-[#fbfaf6] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4e7d75]">
                    Next step
                  </p>
                  <p className="mt-2 text-base font-semibold text-[#123f3b]">
                    Review the organized claim
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#667571]">
                    Continue to the Claim Workspace to review extracted facts,
                    evidence status, and any items needing attention.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!createdRunId}
                  onClick={() =>
                    createdRunId && router.push(`/runs/${createdRunId}`)
                  }
                  className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f766e] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(15,118,110,0.16)] transition hover:bg-[#155e57] disabled:cursor-not-allowed disabled:bg-[#9bb8b1]"
                >
                  Open Claim Workspace <Icon name="chevron-right" />
                </button>
                <button
                  type="button"
                  onClick={closeIntake}
                  className="mt-3 w-full rounded-xl px-5 py-3 text-sm font-semibold text-[#667571] transition hover:bg-[#eef8f5] hover:text-[#123f3b]"
                >
                  Back to claims
                </button>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </div>
  );
}
