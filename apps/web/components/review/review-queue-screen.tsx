"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  ReviewPriority,
  ReviewTaskRecord,
  ReviewTaskStatus,
} from "../../store/use-dashboard-store";
import { useDashboardStore } from "../../store/use-dashboard-store";
import { UserAccountControl } from "../auth/user-account-control";

type QueueView = "active" | "waiting" | "completed";
type AssignmentFilter = "all" | "assigned" | "unassigned";

function reviewerDisplayName(value: string | null | undefined) {
  if (!value) return "Unassigned";
  return /\b(?:week\s*\d+|eval(?:uation)?)\b/i.test(value)
    ? "Claims reviewer"
    : value;
}
type PriorityFilter = "all" | ReviewPriority;

type IconName =
  | "activity"
  | "bell"
  | "check"
  | "chevron-left"
  | "chevron-right"
  | "clock"
  | "file"
  | "inbox"
  | "menu"
  | "search"
  | "shield"
  | "user";

type ExtractionView = {
  claimNumber?: unknown;
  claimantName?: unknown;
  insuredName?: unknown;
  claimType?: unknown;
  lossType?: unknown;
  vehicle?: {
    make?: unknown;
    model?: unknown;
    registrationNumber?: unknown;
  };
};

type ReasonView = {
  missingFields?: unknown[];
  conflicts?: unknown[];
  warnings?: unknown[];
  requiredEvidence?: unknown[];
};

const completedStatuses = new Set<ReviewTaskStatus>([
  "APPROVED",
  "EDITED_AND_APPROVED",
  "REJECTED",
]);

const priorityRank: Record<ReviewPriority, number> = {
  HIGH: 0,
  NORMAL: 1,
  LOW: 2,
};

function Icon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    activity: <path d="M3 12h4l2-7 4 14 2-7h6" />,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
    check: <><path d="M22 11.1V12a10 10 0 1 1-5.9-9.1" /><path d="m9 11 3 3L22 4" /></>,
    "chevron-left": <path d="m15 18-6-6 6-6" />,
    "chevron-right": <path d="m9 18 6-6-6-6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h6" /></>,
    inbox: <><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="m5.5 5.5-3.5 6V20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8.5l-3.5-6A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.5Z" /></>,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></>,
    shield: <><path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3Z" /><path d="m9 12 2 2 4-4" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
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
        <ellipse cx="8.8" cy="10.6" rx="1.5" ry="3" transform="rotate(-48 8.8 10.6)" />
        <ellipse cx="12.4" cy="8.4" rx="1.4" ry="2.8" transform="rotate(-35 12.4 8.4)" />
        <ellipse cx="16.3" cy="7.2" rx="1.35" ry="2.7" transform="rotate(-18 16.3 7.2)" />
        <ellipse cx="33.2" cy="10.6" rx="1.5" ry="3" transform="rotate(48 33.2 10.6)" />
        <ellipse cx="29.6" cy="8.4" rx="1.4" ry="2.8" transform="rotate(35 29.6 8.4)" />
        <ellipse cx="25.7" cy="7.2" rx="1.35" ry="2.7" transform="rotate(18 25.7 7.2)" />
      </g>
      <path d="M29.6 17.2c-2.1-2.8-5-4.2-8.4-4.2-6.2 0-10.6 5-10.6 11.6 0 6.4 4.4 11.3 10.6 11.3 3.8 0 7.1-1.7 9.3-4.8" fill="none" stroke="#155e57" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function textValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function friendlyFilename(filename: string) {
  const withoutExtension = filename.replace(/\.[^.]+$/, "");
  if (/^email-text-\d+$/i.test(withoutExtension)) return "Email claim";
  return withoutExtension.replaceAll("-", " ").replaceAll("_", " ");
}

function initialsFor(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return parts.length ? parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") : "CF";
}

function extractionFor(task: ReviewTaskRecord): ExtractionView {
  return isRecord(task.run.extractedJson) ? (task.run.extractedJson as ExtractionView) : {};
}

function reasonFor(task: ReviewTaskRecord): ReasonView {
  return isRecord(task.reasonJson) ? (task.reasonJson as ReasonView) : {};
}

function countItems(value: unknown[] | undefined) {
  return Array.isArray(value) ? value.length : 0;
}

function claimDetails(task: ReviewTaskRecord) {
  const extraction = extractionFor(task);
  const fallback = friendlyFilename(task.run.document.filename);
  const claimant = textValue(extraction.claimantName) ?? textValue(extraction.insuredName) ?? fallback;
  const claimNumber = textValue(extraction.claimNumber) ?? `Claim ${task.run.id.slice(0, 8).toUpperCase()}`;
  const vehicle = isRecord(extraction.vehicle) ? extraction.vehicle : {};
  const vehicleName = [textValue(vehicle.make), textValue(vehicle.model)].filter(Boolean).join(" ");
  const type = (textValue(extraction.claimType) ?? textValue(extraction.lossType) ?? vehicleName) || (task.run.document.sourceType === "PDF" ? "PDF claim" : "Email claim");

  return { claimant, claimNumber, type, initials: initialsFor(claimant) };
}

function queueViewFor(status: ReviewTaskStatus): QueueView {
  if (status === "NEEDS_MORE_INFO") return "waiting";
  if (completedStatuses.has(status)) return "completed";
  return "active";
}

function statusContent(task: ReviewTaskRecord) {
  if (task.status === "PENDING") {
    const reason = reasonFor(task);
    const needsAttention = countItems(reason.missingFields) + countItems(reason.requiredEvidence) + countItems(reason.conflicts) > 0;
    return needsAttention
      ? { label: "Needs attention", dot: "bg-[#d68a2f]" }
      : { label: "Ready for review", dot: "bg-[#0f766e]" };
  }
  if (task.status === "IN_REVIEW") return { label: "In review", dot: "bg-[#0f766e]" };
  if (task.status === "NEEDS_MORE_INFO") return { label: "Waiting for information", dot: "bg-[#4e9d7e]" };
  if (task.status === "REJECTED") return { label: "Not approved", dot: "bg-[#b45d55]" };
  return { label: "Review completed", dot: "bg-[#0f766e]" };
}

function reasonSummary(task: ReviewTaskRecord) {
  const reason = reasonFor(task);
  const missing = countItems(reason.missingFields);
  const evidence = countItems(reason.requiredEvidence);
  const conflicts = countItems(reason.conflicts);
  const warnings = countItems(reason.warnings);

  if (task.status === "NEEDS_MORE_INFO") return "Information request prepared and recorded";
  if (task.status === "APPROVED") return "Claim facts approved by a human reviewer";
  if (task.status === "EDITED_AND_APPROVED") return "Corrections reviewed and approved";
  if (task.status === "REJECTED") return "Human reviewer did not approve this claim task";
  if (missing + evidence > 0) {
    const count = missing + evidence;
    return `AI found ${count} missing ${count === 1 ? "item" : "items"}`;
  }
  if (conflicts > 0) return `${conflicts} conflicting ${conflicts === 1 ? "detail needs" : "details need"} judgment`;
  if (warnings > 0) return `${warnings} validation ${warnings === 1 ? "warning" : "warnings"} to confirm`;
  return "Human judgment is required before the workflow continues";
}

function relativeAge(value: string, completed = false) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Recently added";
  const elapsed = Math.max(0, Date.now() - timestamp);
  const hours = Math.floor(elapsed / 3_600_000);
  if (hours < 1) return completed ? "Completed recently" : "Added recently";
  if (hours < 24) return completed ? `${hours}h ago` : `${hours}h waiting`;
  const days = Math.floor(hours / 24);
  return completed ? `${days}d ago` : `${days}d waiting`;
}

function actionLabel(status: ReviewTaskStatus) {
  if (status === "PENDING") return "Review claim";
  if (status === "IN_REVIEW") return "Continue review";
  if (status === "NEEDS_MORE_INFO") return "Open request";
  return "View summary";
}

function Sidebar({ collapsed, onCollapse, mobile = false, onNavigate }: { collapsed: boolean; onCollapse?: () => void; mobile?: boolean; onNavigate?: () => void }) {
  const nav = [
    { href: "/dashboard", label: "Claims", icon: "file" as const },
    { href: "/review", label: "Review queue", icon: "inbox" as const, active: true },
    { href: "/review", label: "Resolved", icon: "check" as const },
    { href: "/evals", label: "Operations", icon: "activity" as const },
  ];

  return (
    <div className="flex h-full flex-col bg-[#eef8f5] px-3 py-5 text-[#20302e]">
      <div className={`flex gap-2 ${collapsed ? "flex-col items-center" : "items-center justify-between"}`}>
        <Link href="/dashboard" onClick={onNavigate} className="flex min-w-0 items-center gap-2 text-[#123f3b]">
          <ClaimFlowMark className="h-10 w-10 shrink-0" />
          {!collapsed ? <span className="truncate text-sm font-semibold">ClaimFlow</span> : null}
        </Link>
        {!mobile && onCollapse ? (
          <button type="button" onClick={onCollapse} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#dfe8e3] bg-white text-[#155e57] transition hover:border-[#85d9c8] hover:bg-[#f8fdfb]">
            <Icon name={collapsed ? "chevron-right" : "chevron-left"} />
          </button>
        ) : null}
      </div>

      <nav className="mt-7 space-y-1" aria-label="Primary navigation">
        {nav.map((item) => (
          <Link key={item.label} href={item.href} onClick={onNavigate} aria-current={item.active ? "page" : undefined} className={`flex items-center rounded-xl px-3 py-2.5 text-sm transition ${collapsed ? "justify-center" : "gap-3"} ${item.active ? "bg-[#0f766e] font-semibold text-white shadow-sm" : "text-[#667571] hover:bg-white hover:text-[#123f3b]"}`}>
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

export function ReviewQueueScreen() {
  const reviewTasks = useDashboardStore((state) => state.reviewTasks);
  const isFetchingReviewTasks = useDashboardStore((state) => state.isFetchingReviewTasks);
  const fetchReviewTasks = useDashboardStore((state) => state.fetchReviewTasks);
  const error = useDashboardStore((state) => state.error);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [view, setView] = useState<QueueView>("active");
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<PriorityFilter>("all");
  const [assignment, setAssignment] = useState<AssignmentFilter>("all");

  useEffect(() => {
    void fetchReviewTasks();
  }, [fetchReviewTasks]);

  const counts = useMemo(() => ({
    pending: reviewTasks.filter((task) => task.status === "PENDING").length,
    inReview: reviewTasks.filter((task) => task.status === "IN_REVIEW").length,
    waiting: reviewTasks.filter((task) => task.status === "NEEDS_MORE_INFO").length,
    highPriority: reviewTasks.filter((task) => task.status === "PENDING" && task.priority === "HIGH").length,
    assigned: reviewTasks.filter((task) => task.status === "IN_REVIEW" && Boolean(task.assignedTo)).length,
  }), [reviewTasks]);

  const viewCounts = useMemo(() => ({
    active: reviewTasks.filter((task) => queueViewFor(task.status) === "active").length,
    waiting: reviewTasks.filter((task) => queueViewFor(task.status) === "waiting").length,
    completed: reviewTasks.filter((task) => queueViewFor(task.status) === "completed").length,
  }), [reviewTasks]);

  const visibleTasks = useMemo(() => {
    const term = search.trim().toLowerCase();
    return reviewTasks
      .filter((task) => queueViewFor(task.status) === view)
      .filter((task) => priority === "all" || task.priority === priority)
      .filter((task) => assignment === "all" || (assignment === "assigned" ? Boolean(task.assignedTo) : !task.assignedTo))
      .filter((task) => {
        if (!term) return true;
        const claim = claimDetails(task);
        return [claim.claimant, claim.claimNumber, claim.type, task.run.document.filename, task.assignedTo ?? "", reasonSummary(task)].join(" ").toLowerCase().includes(term);
      })
      .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [assignment, priority, reviewTasks, search, view]);

  return (
    <div className="min-h-screen bg-[#fbfaf6] text-[#20302e]">
      <div className="flex min-h-screen">
        <aside className={`sticky top-0 hidden h-screen shrink-0 border-r border-[#dfe8e3] transition-[width] duration-200 lg:block ${sidebarCollapsed ? "w-20" : "w-56"}`}>
          <Sidebar collapsed={sidebarCollapsed} onCollapse={() => setSidebarCollapsed((value) => !value)} />
        </aside>

        {mobileSidebarOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button type="button" aria-label="Close navigation" onClick={() => setMobileSidebarOpen(false)} className="absolute inset-0 bg-[#123f3b]/30 backdrop-blur-[1px]" />
            <aside className="relative h-full w-64 border-r border-[#dfe8e3] shadow-2xl"><Sidebar collapsed={false} mobile onNavigate={() => setMobileSidebarOpen(false)} /></aside>
          </div>
        ) : null}

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-[#dfe8e3] bg-white/95 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
              <button type="button" onClick={() => setMobileSidebarOpen(true)} aria-label="Open navigation" className="grid h-10 w-10 place-items-center rounded-xl border border-[#dfe8e3] bg-[#eef8f5] text-[#155e57] lg:hidden"><Icon name="menu" className="h-5 w-5" /></button>
              <Link href="/dashboard" className="mr-auto flex items-center gap-2 lg:hidden"><ClaimFlowMark className="h-9 w-9" /><span className="text-sm font-semibold text-[#123f3b]">ClaimFlow</span></Link>
              <label className="hidden min-w-0 max-w-xl flex-1 items-center gap-2 rounded-xl border border-[#dfe8e3] bg-[#fbfaf6] px-3 py-2.5 text-[#667571] sm:flex lg:mr-auto">
                <Icon name="search" /><span className="sr-only">Search the review queue</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Search claimant or claim number" className="min-w-0 flex-1 bg-transparent text-sm text-[#20302e] outline-none placeholder:text-[#87928f]" />
              </label>
              <button type="button" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[#667571] transition hover:bg-[#eef8f5] hover:text-[#123f3b]"><Icon name="bell" /><span className="hidden md:inline">Notifications</span></button>
            </div>
            <div className="px-4 pb-3 sm:hidden">
              <label className="flex items-center gap-2 rounded-xl border border-[#dfe8e3] bg-[#fbfaf6] px-3 py-2.5 text-[#667571]"><Icon name="search" /><span className="sr-only">Search the review queue</span><input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Search claimant or claim number" className="min-w-0 flex-1 bg-transparent text-sm text-[#20302e] outline-none placeholder:text-[#87928f]" /></label>
            </div>
          </header>

          <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
            {error ? <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-[#123f3b]">Review queue</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667571] sm:text-base">Prioritize claims that need human judgment, continue work in progress, and track information requests.</p>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#b9dfd3] bg-[#eef8f5] px-3 py-2 text-xs font-semibold text-[#155e57]"><Icon name="shield" />Human-controlled</span>
            </div>

            <section className="mt-6 grid grid-cols-3 gap-3" aria-label="Review workload summary">
              <article className="min-w-0 rounded-2xl border border-[#dfe8e3] bg-white p-4 shadow-[0_6px_20px_rgba(18,63,59,0.035)]">
                <p className="text-sm text-[#667571]">Ready for review</p><p className="mt-1 text-2xl font-semibold text-[#123f3b]">{counts.pending}</p><p className="mt-2 flex items-center gap-2 text-xs text-[#667571]"><span className="h-2 w-2 shrink-0 rounded-full bg-[#d68a2f]" />{counts.highPriority} high priority</p>
              </article>
              <article className="min-w-0 rounded-2xl border border-[#dfe8e3] bg-white p-4 shadow-[0_6px_20px_rgba(18,63,59,0.035)]">
                <p className="text-sm text-[#667571]">In progress</p><p className="mt-1 text-2xl font-semibold text-[#123f3b]">{counts.inReview}</p><p className="mt-2 flex items-center gap-2 text-xs text-[#667571]"><span className="h-2 w-2 shrink-0 rounded-full bg-[#0f766e]" />{counts.assigned} assigned</p>
              </article>
              <article className="min-w-0 rounded-2xl border border-[#dfe8e3] bg-white p-4 shadow-[0_6px_20px_rgba(18,63,59,0.035)]">
                <p className="text-sm text-[#667571]">Waiting for information</p><p className="mt-1 text-2xl font-semibold text-[#123f3b]">{counts.waiting}</p><p className="mt-2 flex items-center gap-2 text-xs text-[#667571]"><span className="h-2 w-2 shrink-0 rounded-full bg-[#4e9d7e]" />Awaiting a response</p>
              </article>
            </section>

            <section className="mt-8 overflow-hidden rounded-2xl border border-[#dfe8e3] bg-white shadow-[0_8px_28px_rgba(18,63,59,0.045)]">
              <div className="flex flex-col gap-4 border-b border-[#dfe8e3] p-5 xl:flex-row xl:items-end xl:justify-between">
                <div><h2 className="text-xl font-semibold text-[#123f3b]">Your review work</h2><p className="mt-1 text-sm text-[#667571]">Sorted by priority and time waiting.</p></div>
                <div className="flex flex-wrap gap-2" aria-label="Review queue views">
                  {(["active", "waiting", "completed"] as QueueView[]).map((value) => (
                    <button key={value} type="button" aria-pressed={view === value} onClick={() => setView(value)} className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize transition ${view === value ? "border-[#85d9c8] bg-[#dcefea] text-[#123f3b]" : "border-[#dfe8e3] bg-white text-[#667571] hover:border-[#b9dfd3] hover:text-[#155e57]"}`}>
                      {value} <span className="ml-1 text-xs">{viewCounts[value]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 border-b border-[#dfe8e3] bg-[#fbfaf6]/70 px-5 py-4 sm:flex-row sm:items-center">
                <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[#dfe8e3] bg-white px-3 py-2.5 text-[#667571]"><Icon name="search" /><span className="sr-only">Filter visible review tasks</span><input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Search this queue" className="min-w-0 flex-1 bg-transparent text-sm text-[#20302e] outline-none placeholder:text-[#87928f]" /></label>
                <label><span className="sr-only">Filter by priority</span><select value={priority} onChange={(event) => setPriority(event.target.value as PriorityFilter)} className="w-full rounded-xl border border-[#dfe8e3] bg-white px-3 py-2.5 text-sm text-[#20302e] outline-none sm:w-auto"><option value="all">All priorities</option><option value="HIGH">High priority</option><option value="NORMAL">Normal priority</option><option value="LOW">Low priority</option></select></label>
                <label><span className="sr-only">Filter by assignment</span><select value={assignment} onChange={(event) => setAssignment(event.target.value as AssignmentFilter)} className="w-full rounded-xl border border-[#dfe8e3] bg-white px-3 py-2.5 text-sm text-[#20302e] outline-none sm:w-auto"><option value="all">All assignments</option><option value="assigned">Assigned</option><option value="unassigned">Unassigned</option></select></label>
              </div>

              {isFetchingReviewTasks ? <div className="p-10 text-center text-sm text-[#667571]">Loading the review queue…</div> : null}
              {!isFetchingReviewTasks && reviewTasks.length === 0 ? <div className="p-12 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#dcefea] text-[#155e57]"><Icon name="inbox" className="h-5 w-5" /></div><h3 className="mt-4 text-base font-semibold text-[#123f3b]">No review tasks yet</h3><p className="mt-1 text-sm text-[#667571]">Claims that need human judgment will appear here.</p></div> : null}
              {!isFetchingReviewTasks && reviewTasks.length > 0 && visibleTasks.length === 0 ? <div className="p-10 text-center text-sm text-[#667571]">No review tasks match this view.</div> : null}

              <div className="divide-y divide-[#dfe8e3]">
                {visibleTasks.map((task) => {
                  const claim = claimDetails(task);
                  const status = statusContent(task);
                  const activeAction = task.status === "PENDING" || task.status === "IN_REVIEW";
                  return (
                    <article key={task.id} className="grid gap-5 px-5 py-5 transition hover:bg-[#f8fcfa] lg:grid-cols-[minmax(0,1.15fr)_minmax(250px,0.85fr)_auto] lg:items-center lg:gap-8">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#dcefea] text-sm font-semibold text-[#123f3b]">{claim.initials}</span>
                        <div className="min-w-0"><h3 className="truncate text-base font-semibold text-[#20302e]">{claim.claimant}</h3><p className="mt-1 truncate text-sm text-[#667571]">{claim.claimNumber} · {claim.type}</p><p className="mt-2 flex items-start gap-2 text-sm leading-5 text-[#4f5f5b]"><Icon name="shield" className="mt-0.5 h-[17px] w-[17px] shrink-0 text-[#4e7d75]" />{reasonSummary(task)}</p></div>
                      </div>
                      <div>
                        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#20302e]"><span className={`h-2 w-2 rounded-full ${status.dot}`} />{status.label}<span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${task.priority === "HIGH" ? "bg-[#fff2df] text-[#9a5a12]" : "bg-[#eef3f1] text-[#667571]"}`}>{task.priority === "NORMAL" ? "Normal" : task.priority.toLowerCase().replace(/^./, (letter) => letter.toUpperCase())}</span></p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#667571]"><span className="flex items-center gap-1.5"><Icon name="clock" />{relativeAge(completedStatuses.has(task.status) && task.completedAt ? task.completedAt : task.status === "IN_REVIEW" && task.startedAt ? task.startedAt : task.createdAt, completedStatuses.has(task.status))}</span><span className="flex items-center gap-1.5"><Icon name="user" />{reviewerDisplayName(completedStatuses.has(task.status) ? task.decisions.at(-1)?.reviewerName ?? task.assignedTo : task.assignedTo)}</span></div>
                      </div>
                      <Link href={`/review/${task.id}`} className={`inline-flex w-fit items-center justify-center rounded-lg border px-3 py-2 text-sm font-semibold transition ${activeAction ? "border-[#155e57] bg-[#155e57] text-white hover:bg-[#123f3b]" : "border-[#b9dfd3] bg-white text-[#155e57] hover:bg-[#eef8f5]"}`}>{actionLabel(task.status)}</Link>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
