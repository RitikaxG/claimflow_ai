"use client";

import {
  ClaimExtractionSchema,
  type ClaimExtraction,
} from "@repo/shared/schemas";
import Link from "next/link";
import type { ReviewTaskRecord } from "../../store/use-dashboard-store";

type SummaryIconName =
  | "activity"
  | "book"
  | "brain"
  | "check"
  | "file"
  | "history"
  | "shield"
  | "sparkles"
  | "user"
  | "x";

type ResolvedClaimSummaryProps = {
  task: ReviewTaskRecord;
  memorySummary: string | null;
  memoryUsed: boolean;
};

type Correction = {
  label: string;
  before: string;
  after: string;
};

function SummaryIcon({
  name,
  className = "h-4 w-4",
}: {
  name: SummaryIconName;
  className?: string;
}) {
  const paths: Record<SummaryIconName, React.ReactNode> = {
    activity: <path d="M3 12h4l2-7 4 14 2-7h6" />,
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

function parseClaim(value: unknown): ClaimExtraction | null {
  const parsed = ClaimExtractionSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function present(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "Not recorded";
  }

  return String(value);
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Date not recorded";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
}

function valuesDiffer(before: unknown, after: unknown) {
  return JSON.stringify(before ?? null) !== JSON.stringify(after ?? null);
}

function reviewerDisplayName(value: string | null | undefined) {
  if (!value) return "Not recorded";
  return /\b(?:week\s*\d+|eval(?:uation)?)\b/i.test(value)
    ? "Claims reviewer"
    : value;
}

function buildCorrections(
  original: ClaimExtraction,
  finalClaim: ClaimExtraction,
): Correction[] {
  const candidates: Array<{
    label: string;
    before: unknown;
    after: unknown;
    format?: (value: unknown) => string;
  }> = [
    {
      label: "Claim number",
      before: original.claimNumber,
      after: finalClaim.claimNumber,
    },
    {
      label: "Policy number",
      before: original.policyNumber,
      after: finalClaim.policyNumber,
    },
    {
      label: "Claimant",
      before: original.claimantName,
      after: finalClaim.claimantName,
    },
    {
      label: "Insured name",
      before: original.insuredName,
      after: finalClaim.insuredName,
    },
    {
      label: "Vehicle registration",
      before: original.vehicle.registrationNumber,
      after: finalClaim.vehicle.registrationNumber,
    },
    {
      label: "Vehicle make",
      before: original.vehicle.make,
      after: finalClaim.vehicle.make,
    },
    {
      label: "Vehicle model",
      before: original.vehicle.model,
      after: finalClaim.vehicle.model,
    },
    {
      label: "Incident date",
      before: original.incident.incidentDate,
      after: finalClaim.incident.incidentDate,
    },
    {
      label: "Incident location",
      before: original.incident.incidentLocation,
      after: finalClaim.incident.incidentLocation,
    },
    {
      label: "Loss type",
      before: original.incident.lossType,
      after: finalClaim.incident.lossType,
      format: (value) => titleCase(String(value ?? "unknown")),
    },
    {
      label: "FIR number",
      before: original.police.firNumber,
      after: finalClaim.police.firNumber,
    },
    {
      label: "Police station",
      before: original.police.policeStation,
      after: finalClaim.police.policeStation,
    },
    {
      label: "Police report",
      before: original.supportingDocuments.policeReport,
      after: finalClaim.supportingDocuments.policeReport,
      format: (value) => (value ? "Received" : "Not received"),
    },
    {
      label: "Repair estimate",
      before: original.supportingDocuments.repairEstimate,
      after: finalClaim.supportingDocuments.repairEstimate,
      format: (value) => (value ? "Received" : "Not received"),
    },
  ];

  return candidates
    .filter((item) => valuesDiffer(item.before, item.after))
    .map((item) => ({
      label: item.label,
      before: item.format
        ? item.format(item.before)
        : present(item.before as string | number | null | undefined),
      after: item.format
        ? item.format(item.after)
        : present(item.after as string | number | null | undefined),
    }));
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 border-b border-[#dfe8e3] py-3 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <dt className="text-sm text-[#667571]">{label}</dt>
      <dd className="min-w-0 [overflow-wrap:anywhere] text-sm font-semibold text-[#20302e] sm:max-w-[62%] sm:text-right">
        {value}
      </dd>
    </div>
  );
}

function EvidenceSummaryRow({
  title,
  detail,
  verified,
}: {
  title: string;
  detail: string;
  verified: boolean;
}) {
  return (
    <div className="grid min-w-0 gap-3 border-b border-[#dfe8e3] py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="grid min-w-0 grid-cols-[40px_minmax(0,1fr)] items-center gap-3">
        <span
          className={`grid h-10 w-10 place-items-center rounded-xl ${verified ? "bg-[#dcefea] text-[#155e57]" : "bg-[#fff2df] text-[#8c5b1c]"}`}
        >
          <SummaryIcon
            name={verified ? "check" : "file"}
            className="h-[18px] w-[18px]"
          />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#20302e]">{title}</p>
          <p className="mt-1 break-words text-xs leading-5 text-[#667571]">
            {detail}
          </p>
        </div>
      </div>
      <span
        className={`ml-[52px] w-fit rounded-full px-2.5 py-1 text-xs font-semibold sm:ml-0 ${verified ? "bg-[#eef8f5] text-[#155e57]" : "bg-[#fff2df] text-[#8c5b1c]"}`}
      >
        {verified ? "Verified" : "Not received"}
      </span>
    </div>
  );
}

function TimelineRow({
  title,
  date,
  last = false,
}: {
  title: string;
  date: string;
  last?: boolean;
}) {
  return (
    <div className="relative flex items-start gap-3 pb-5 last:pb-0">
      {!last ? (
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-[13px] top-7 w-px bg-[#dfe8e3]"
        />
      ) : null}
      <span className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#eef8f5] text-[#155e57]">
        <SummaryIcon name="check" className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-sm font-semibold text-[#20302e]">{title}</p>
        <p className="mt-1 text-xs text-[#667571]">{date}</p>
      </div>
    </div>
  );
}

function SupportingRecordLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: "activity" | "book" | "brain" | "history";
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-11 items-center gap-3 rounded-xl border border-[#dfe8e3] bg-white px-3 py-2.5 text-sm font-semibold text-[#155e57] transition hover:border-[#85d9c8] hover:bg-[#eef8f5]"
    >
      <SummaryIcon name={icon} className="h-[18px] w-[18px] shrink-0" />
      <span className="min-w-0 break-words">{children}</span>
    </Link>
  );
}

export function ResolvedClaimSummary({
  task,
  memorySummary,
  memoryUsed,
}: ResolvedClaimSummaryProps) {
  const latestDecision = task.decisions[0] ?? null;
  const originalClaim = parseClaim(task.run.extractedJson);
  const correctedClaim = parseClaim(latestDecision?.correctedJson);
  const finalClaim = correctedClaim ?? originalClaim;
  const isRejected = task.status === "REJECTED";
  const isCorrected = task.status === "EDITED_AND_APPROVED";
  const outcomeTitle = isRejected
    ? "Review rejected"
    : isCorrected
      ? "Corrected and approved"
      : "Approved as-is";
  const outcomeDescription = isRejected
    ? "A human reviewer completed the review and recorded why this claim could not be approved."
    : isCorrected
      ? "A human reviewer corrected the claim information and approved the final claim record."
      : "A human reviewer verified the prepared facts and approved the claim without changes.";
  const decisionSource = isRejected
    ? "Human decision"
    : isCorrected
      ? "Human corrected"
      : "Human verified";
  const reviewer = reviewerDisplayName(
    latestDecision?.reviewerName ?? task.assignedTo,
  );
  const corrections =
    originalClaim && finalClaim && isCorrected
      ? buildCorrections(originalClaim, finalClaim)
      : [];
  const informationEvent = [...task.run.events]
    .reverse()
    .find((event) =>
      /ADDITIONAL_INFORMATION_RECEIVED|information received|evidence received|submitted/i.test(
        `${event.type} ${event.message}`,
      ),
    );

  const timeline = [
    { title: "Claim uploaded", date: task.run.createdAt },
    { title: "AI prepared facts and evidence", date: task.run.updatedAt },
    ...(task.startedAt
      ? [{ title: "Human review started", date: task.startedAt }]
      : []),
    ...(informationEvent
      ? [
          {
            title: "Additional information recorded",
            date: informationEvent.createdAt,
          },
        ]
      : []),
    {
      title: isRejected
        ? "Reviewer recorded rejection"
        : isCorrected
          ? "Reviewer corrected and approved"
          : "Reviewer approved the claim",
      date: task.completedAt ?? latestDecision?.createdAt ?? task.updatedAt,
    },
  ].sort((first, second) => {
    const firstTime = new Date(first.date).getTime();
    const secondTime = new Date(second.date).getTime();

    if (Number.isNaN(firstTime) || Number.isNaN(secondTime)) {
      return 0;
    }

    return firstTime - secondTime;
  });

  const claimant =
    finalClaim?.claimantName ?? finalClaim?.insuredName ?? "Not recorded";
  const vehicle =
    [
      finalClaim?.vehicle.registrationNumber,
      finalClaim?.vehicle.make,
      finalClaim?.vehicle.model,
    ]
      .filter(Boolean)
      .join(" · ") || "Not recorded";
  const incident = finalClaim
    ? `${titleCase(finalClaim.incident.lossType)} · ${formatDate(finalClaim.incident.incidentDate)}`
    : "Not recorded";

  return (
    <div className="mt-6 space-y-5">
      <section
        className={`rounded-2xl border p-5 sm:p-6 ${isRejected ? "border-[#e8c8c5] bg-[#fff6f5]" : "border-[#b9dfd3] bg-[#eef8f5]"}`}
        aria-labelledby="resolved-outcome-title"
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            <span
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-white ${isRejected ? "bg-[#a64f49]" : "bg-[#0f766e]"}`}
            >
              <SummaryIcon
                name={isRejected ? "x" : "check"}
                className="h-5 w-5"
              />
            </span>
            <div className="min-w-0 pt-0.5">
              <h2
                id="resolved-outcome-title"
                className="text-xl font-semibold text-[#123f3b] sm:text-2xl"
              >
                {outcomeTitle}
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-[#667571]">
                {outcomeDescription}
              </p>
            </div>
          </div>
        </div>
        <dl
          className={`mt-5 grid border-t pt-1 sm:grid-cols-3 ${isRejected ? "border-[#e8c8c5]" : "border-[#c9e5dc]"}`}
        >
          {[
            [
              "Completed",
              formatDateTime(
                task.completedAt ?? latestDecision?.createdAt ?? task.updatedAt,
              ),
            ],
            ["Reviewer", reviewer],
            ["Decision source", decisionSource],
          ].map(([label, value], index) => (
            <div
              key={label}
              className={`min-w-0 py-3 sm:px-4 ${index === 0 ? "sm:pl-0" : "border-t sm:border-l sm:border-t-0"} ${isRejected ? "border-[#e8c8c5]" : "border-[#c9e5dc]"}`}
            >
              <dt className="text-xs text-[#667571]">{label}</dt>
              <dd className="mt-1 break-words text-sm font-semibold text-[#20302e]">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.72fr)] xl:items-start">
        <div className="min-w-0 space-y-5">
          <section className="overflow-hidden rounded-2xl border border-[#dfe8e3] bg-white shadow-[0_8px_28px_rgba(18,63,59,0.045)]">
            <div className="p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-[#123f3b]">
                    Final claim summary
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-[#667571]">
                    Decision-ready facts recorded when the human review was
                    completed.
                  </p>
                </div>
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#eef8f5] px-3 py-1.5 text-xs font-semibold text-[#155e57]">
                  <SummaryIcon name="shield" className="h-4 w-4" />
                  {isRejected ? "Human reviewed" : "Human verified"}
                </span>
              </div>
              <dl className="mt-4 border-t border-[#dfe8e3]">
                <FactRow
                  label="Claim number"
                  value={present(finalClaim?.claimNumber)}
                />
                <FactRow
                  label="Policy number"
                  value={present(finalClaim?.policyNumber)}
                />
                <FactRow label="Claimant" value={claimant} />
                <FactRow label="Vehicle" value={vehicle} />
                <FactRow label="Incident" value={incident} />
                <FactRow
                  label="Location"
                  value={present(finalClaim?.incident.incidentLocation)}
                />
                {finalClaim?.police.firNumber ? (
                  <FactRow
                    label="FIR number"
                    value={finalClaim.police.firNumber}
                  />
                ) : null}
              </dl>
            </div>
          </section>

          {isCorrected ? (
            <section className="overflow-hidden rounded-2xl border border-[#dfe8e3] bg-white shadow-[0_8px_28px_rgba(18,63,59,0.045)]">
              <div className="p-5 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-[#123f3b]">
                      What the reviewer corrected
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-[#667571]">
                      Human-approved changes are shown alongside the
                      originally prepared claim.
                    </p>
                  </div>
                  <span className="w-fit rounded-full bg-[#eef8f5] px-3 py-1.5 text-xs font-semibold text-[#155e57]">
                    {corrections.length}{" "}
                    {corrections.length === 1 ? "correction" : "corrections"}
                  </span>
                </div>
                {corrections.length > 0 ? (
                  <div className="mt-4 border-t border-[#dfe8e3]">
                    {corrections.map((correction) => (
                      <div
                        key={correction.label}
                        className="grid min-w-0 gap-3 border-b border-[#dfe8e3] py-4 last:border-b-0 sm:grid-cols-[minmax(120px,.75fr)_minmax(0,1fr)] sm:items-start"
                      >
                        <p className="text-sm text-[#667571]">
                          {correction.label}
                        </p>
                        <div className="min-w-0 sm:text-right">
                          <p className="break-words text-sm text-[#87928f] line-through">
                            {correction.before}
                          </p>
                          <p className="mt-1 break-words text-sm font-semibold text-[#155e57]">
                            {correction.after}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl bg-[#fbfaf6] px-4 py-3 text-sm leading-6 text-[#667571]">
                    The corrected record is stored, but no displayable
                    claim-field changes were detected.
                  </p>
                )}
              </div>
            </section>
          ) : null}

          <section className="overflow-hidden rounded-2xl border border-[#dfe8e3] bg-white shadow-[0_8px_28px_rgba(18,63,59,0.045)]">
            <div className="p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-[#123f3b]">
                    Evidence considered
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-[#667571]">
                    Supporting information available when the decision was
                    completed.
                  </p>
                </div>
              </div>
              <div className="mt-4 border-t border-[#dfe8e3]">
                <EvidenceSummaryRow
                  title="Claim material"
                  detail={task.run.document.filename}
                  verified
                />
                <EvidenceSummaryRow
                  title="Vehicle registration"
                  detail={
                    finalClaim?.vehicle.registrationNumber
                      ? `Registration ${finalClaim.vehicle.registrationNumber}`
                      : "Registration number was not recorded"
                  }
                  verified={Boolean(finalClaim?.vehicle.registrationNumber)}
                />
                {finalClaim?.incident.lossType === "theft" ||
                finalClaim?.supportingDocuments.policeReport ||
                finalClaim?.police.firNumber ? (
                  <EvidenceSummaryRow
                    title="FIR / police report"
                    detail={
                      finalClaim?.police.firNumber
                        ? `FIR ${finalClaim.police.firNumber}`
                        : "Police report status at decision time"
                    }
                    verified={Boolean(
                      finalClaim?.supportingDocuments.policeReport ||
                      finalClaim?.police.firNumber,
                    )}
                  />
                ) : null}
                {finalClaim?.supportingDocuments.repairEstimate ||
                finalClaim?.damage.estimatedRepairCost ? (
                  <EvidenceSummaryRow
                    title="Repair estimate"
                    detail={
                      finalClaim.damage.estimatedRepairCost
                        ? `${present(finalClaim.damage.currency)} ${finalClaim.damage.estimatedRepairCost.toLocaleString("en-IN")}`
                        : "Repair estimate was confirmed"
                    }
                    verified={Boolean(
                      finalClaim.supportingDocuments.repairEstimate,
                    )}
                  />
                ) : null}
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#dfe8e3] bg-white shadow-[0_8px_28px_rgba(18,63,59,0.045)]">
            <div className="p-5 sm:p-6">
              <h2 className="text-xl font-semibold text-[#123f3b]">
                Resolution timeline
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#667571]">
                The key workflow milestones behind the final outcome.
              </p>
              <div className="mt-5">
                {timeline.map((item, index) => (
                  <TimelineRow
                    key={`${item.title}-${item.date}`}
                    title={item.title}
                    date={formatDateTime(item.date)}
                    last={index === timeline.length - 1}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>

        <aside className="min-w-0 overflow-hidden rounded-2xl border border-[#dfe8e3] bg-white shadow-[0_8px_28px_rgba(18,63,59,0.045)] xl:sticky xl:top-24">
          <section className="p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-[#123f3b]">
              Decision summary
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#667571]">
              The human-owned outcome for this review.
            </p>
            <dl className="mt-4 space-y-3">
              <FactRow label="Outcome" value={outcomeTitle} />
              <FactRow label="Reviewer" value={reviewer} />
              <FactRow label="Final state" value="Resolved" />
            </dl>
            <p
              className={`mt-4 border-l-2 pl-3 text-sm leading-6 text-[#667571] ${isRejected ? "border-[#a64f49]" : "border-[#0f766e]"}`}
            >
              {latestDecision?.notes ??
                (isRejected
                  ? "The reviewer completed the decision without adding notes."
                  : "The reviewer completed the claim review and recorded the final outcome.")}
            </p>
          </section>

          <section className="border-t border-[#dfe8e3] p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-[#123f3b]">
              AI and human roles
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#667571]">
              What ClaimFlow prepared versus what the reviewer controlled.
            </p>
            <div className="mt-4 divide-y divide-[#dfe8e3] border-t border-[#dfe8e3]">
              <div className="flex items-start gap-3 py-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#dcefea] text-[#155e57]">
                  <SummaryIcon name="sparkles" className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#20302e]">
                    ClaimFlow AI
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#667571]">
                    Organized facts, retrieved policy evidence and identified
                    missing items.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 py-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#dcefea] text-[#155e57]">
                  <SummaryIcon name="user" className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#20302e]">
                    Human reviewer
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#667571]">
                    Verified the evidence and owned the final decision.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="border-t border-[#dfe8e3] p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-[#123f3b]">
              Supporting records
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#667571]">
              Open the existing auditable claim views.
            </p>
            {memorySummary ? (
              <p className="mt-4 rounded-xl bg-[#eef8f5] px-3 py-3 text-xs leading-5 text-[#4e6b66]">
                <span className="font-semibold">
                  Memory {memoryUsed ? "used" : "available"}:
                </span>{" "}
                {memorySummary}
              </p>
            ) : null}
            <div className="mt-4 grid gap-2.5">
              <SupportingRecordLink
                href={`/runs/${task.run.id}?tab=policy`}
                icon="book"
              >
                View policy guidance
              </SupportingRecordLink>
              <SupportingRecordLink
                href={`/evals?runId=${task.run.id}`}
                icon="activity"
              >
                View full claim activity
              </SupportingRecordLink>
              <SupportingRecordLink
                href={`/runs/${task.run.id}?tab=history`}
                icon="history"
              >
                View claim history
              </SupportingRecordLink>
              <SupportingRecordLink
                href={`/runs/${task.run.id}?tab=similar`}
                icon="brain"
              >
                View similar claims
              </SupportingRecordLink>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
