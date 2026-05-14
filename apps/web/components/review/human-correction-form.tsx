"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ClaimExtractionSchema,
  type ClaimExtraction,
} from "@repo/shared/schemas";
import type { ReviewTaskRecord } from "../../store/use-dashboard-store";

type HumanCorrectionFormProps = {
  task: ReviewTaskRecord;
  isBusy: boolean;
  actionInFlight: string | null;
  onSubmit: (correctedJson: ClaimExtraction, notes: string) => void;
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

function cloneDraft(value: ClaimExtraction): ClaimExtraction {
  return JSON.parse(JSON.stringify(value)) as ClaimExtraction;
}

function createDraftFromExtractedJson(value: unknown): ClaimExtraction {
  const parsed = ClaimExtractionSchema.safeParse(value);

  if (!parsed.success) {
    return cloneDraft(DEFAULT_DRAFT);
  }

  return cloneDraft(parsed.data);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getReason(reasonJson: unknown): ReviewReasonView {
  if (!isRecord(reasonJson)) {
    return {};
  }

  return reasonJson as ReviewReasonView;
}

function textValue(value: string | null) {
  return value ?? "";
}

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-950">{title}</h4>

      {description ? (
        <p className="mt-1 text-xs text-gray-600">{description}</p>
      ) : null}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-700">
        {label} {required ? <span className="text-red-600">*</span> : null}
      </span>

      <input
        value={textValue(value)}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-gray-950 placeholder:text-gray-400 outline-none focus:border-blue-400"
      />
    </label>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm text-gray-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4"
      />

      {label}
    </label>
  );
}

export function HumanCorrectionForm({
  task,
  isBusy,
  actionInFlight,
  onSubmit,
}: HumanCorrectionFormProps) {
  const [draft, setDraft] = useState<ClaimExtraction>(() =>
    createDraftFromExtractedJson(task.run.extractedJson),
  );

  const [notes, setNotes] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const reason = useMemo(() => getReason(task.reasonJson), [task.reasonJson]);

  const missingFields = Array.isArray(reason.missingFields)
    ? reason.missingFields
    : [];

  const conflicts = Array.isArray(reason.conflicts) ? reason.conflicts : [];

  const requiredEvidence = Array.isArray(reason.requiredEvidence)
    ? reason.requiredEvidence
    : [];

  useEffect(() => {
    setDraft(createDraftFromExtractedJson(task.run.extractedJson));
    setLocalError(null);
  }, [task.id, task.run.extractedJson]);

  const needsField = (field: string) => missingFields.includes(field);

  const needsEvidence = (evidence: string) =>
    requiredEvidence.includes(evidence);

  const hasConflictForField = (field: string) =>
    conflicts.some((conflict) => conflict.field === field);

  const shouldShowIdentity =
    needsField("policyNumber") ||
    needsField("claimantName_or_insuredName") ||
    !draft.policyNumber ||
    (!draft.claimantName && !draft.insuredName);

  const shouldShowVehicle =
    needsField("vehicle.registrationNumber") ||
    !draft.vehicle.registrationNumber;

  const shouldShowIncident =
    needsField("incident.incidentDate") ||
    needsField("incident.incidentLocation") ||
    needsField("incident.description") ||
    hasConflictForField("incident.lossType") ||
    draft.incident.lossType === "unknown";

  const shouldShowDamage =
    hasConflictForField("damage.estimatedRepairCost") ||
    hasConflictForField("damage.currency");

  const shouldShowPolice =
    needsField("police.firNumber") ||
    needsEvidence("firNumber") ||
    needsEvidence("policeReport") ||
    draft.incident.lossType === "theft";

  const shouldShowSupportingDocs =
    requiredEvidence.length > 0 ||
    draft.documentType === "repair_estimate" ||
    draft.incident.lossType === "theft" ||
    draft.incident.lossType === "third_party";

  const updateTopLevelString = (
    field:
      | "claimNumber"
      | "policyNumber"
      | "insuredName"
      | "claimantName"
      | "contactEmail"
      | "contactPhone",
    value: string,
  ) => {
    setDraft(
      (current) =>
        ({
          ...current,
          [field]: emptyToNull(value),
        }) as ClaimExtraction,
    );
  };

  const updateVehicleString = (
    field: keyof ClaimExtraction["vehicle"],
    value: string,
  ) => {
    setDraft((current) => ({
      ...current,
      vehicle: {
        ...current.vehicle,
        [field]: emptyToNull(value),
      },
    }));
  };

  const updateIncidentString = (
    field:
      | "incidentDate"
      | "incidentTime"
      | "incidentLocation"
      | "description",
    value: string,
  ) => {
    setDraft((current) => ({
      ...current,
      incident: {
        ...current.incident,
        [field]: emptyToNull(value),
      },
    }));
  };

  const updatePoliceString = (
    field: "policeStation" | "firNumber" | "reportDate",
    value: string,
  ) => {
    setDraft((current) => {
      const nextValue = emptyToNull(value);

      return {
        ...current,
        police: {
          ...current.police,
          [field]: nextValue,
          wasReportedToPolice:
            field === "firNumber" && nextValue
              ? true
              : current.police.wasReportedToPolice,
        },
      };
    });
  };

  const normalizeDraftForSubmit = (claim: ClaimExtraction): ClaimExtraction => {
    return {
      ...claim,

      claimNumber: claim.claimNumber ? claim.claimNumber.trim() : null,
      policyNumber: claim.policyNumber ? claim.policyNumber.trim() : null,

      insuredName: claim.insuredName ? claim.insuredName.trim() : null,
      claimantName: claim.claimantName ? claim.claimantName.trim() : null,
      contactEmail: claim.contactEmail ? claim.contactEmail.trim() : null,
      contactPhone: claim.contactPhone ? claim.contactPhone.trim() : null,

      vehicle: {
        ...claim.vehicle,
        registrationNumber: claim.vehicle.registrationNumber
          ? claim.vehicle.registrationNumber.trim()
          : null,
        make: claim.vehicle.make ? claim.vehicle.make.trim() : null,
        model: claim.vehicle.model ? claim.vehicle.model.trim() : null,
        year: claim.vehicle.year ? claim.vehicle.year.trim() : null,
        engineNumber: claim.vehicle.engineNumber
          ? claim.vehicle.engineNumber.trim()
          : null,
        chassisNumber: claim.vehicle.chassisNumber
          ? claim.vehicle.chassisNumber.trim()
          : null,
      },

      incident: {
        ...claim.incident,
        incidentDate: claim.incident.incidentDate
          ? claim.incident.incidentDate.trim()
          : null,
        incidentTime: claim.incident.incidentTime
          ? claim.incident.incidentTime.trim()
          : null,
        incidentLocation: claim.incident.incidentLocation
          ? claim.incident.incidentLocation.trim()
          : null,
        description: claim.incident.description
          ? claim.incident.description.trim()
          : null,
      },

      damage: {
        ...claim.damage,
        currency: claim.damage.currency ? claim.damage.currency.trim() : null,
      },

      police: {
        ...claim.police,
        policeStation: claim.police.policeStation
          ? claim.police.policeStation.trim()
          : null,
        firNumber: claim.police.firNumber
          ? claim.police.firNumber.trim()
          : null,
        reportDate: claim.police.reportDate
          ? claim.police.reportDate.trim()
          : null,
      },

      // Reviewer should not maintain this manually.
      // Backend recomputes this from validation.requiredEvidence.
      missingEvidence: [],
    };
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalized = normalizeDraftForSubmit(draft);

    const localMissing: string[] = [];

    if (needsField("policyNumber") && !normalized.policyNumber) {
      localMissing.push("policy number");
    }

    if (
      needsField("claimantName_or_insuredName") &&
      !normalized.claimantName &&
      !normalized.insuredName
    ) {
      localMissing.push("claimant name or insured name");
    }

    if (
      needsField("vehicle.registrationNumber") &&
      !normalized.vehicle.registrationNumber
    ) {
      localMissing.push("vehicle registration number");
    }

    if (
      needsField("incident.incidentDate") &&
      !normalized.incident.incidentDate
    ) {
      localMissing.push("incident date");
    }

    if (
      needsField("incident.incidentLocation") &&
      !normalized.incident.incidentLocation
    ) {
      localMissing.push("incident location");
    }

    if (
      needsField("incident.description") &&
      !normalized.incident.description
    ) {
      localMissing.push("incident description");
    }

    if (
      hasConflictForField("incident.lossType") &&
      normalized.incident.lossType === "unknown"
    ) {
      localMissing.push("loss type");
    }

    if (needsField("police.firNumber") && !normalized.police.firNumber) {
      localMissing.push("FIR number");
    }

    if (
      needsEvidence("policeReport") &&
      !normalized.supportingDocuments.policeReport
    ) {
      localMissing.push("police report confirmation");
    }

    if (
      needsEvidence("claimForm") &&
      !normalized.supportingDocuments.claimForm
    ) {
      localMissing.push("claim form confirmation");
    }

    if (
      needsEvidence("repairEstimate") &&
      !normalized.supportingDocuments.repairEstimate
    ) {
      localMissing.push("repair estimate confirmation");
    }

    if (localMissing.length > 0) {
      setLocalError(`Please provide: ${localMissing.join(", ")}.`);
      return;
    }

    setLocalError(null);
    onSubmit(normalized, notes);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-blue-100 bg-blue-50 p-4"
    >
      <h3 className="text-sm font-semibold text-blue-800">
        Fix issues and approve
      </h3>

      <p className="mt-1 text-sm text-blue-700">
        Fill only the fields needed for review. The app rebuilds the corrected
        claim JSON and the backend re-runs validation.
      </p>

      <div className="mt-4 rounded-lg border border-blue-100 bg-white px-3 py-2 text-xs text-gray-600">
        <p className="font-medium text-gray-800">Current blocking reasons</p>

        <div className="mt-2 space-y-1">
          <p>
            Missing fields:{" "}
            {missingFields.length > 0 ? missingFields.join(", ") : "none"}
          </p>

          <p>
            Required evidence:{" "}
            {requiredEvidence.length > 0
              ? requiredEvidence.join(", ")
              : "none"}
          </p>

          <p>
            Conflicts:{" "}
            {conflicts.length > 0
              ? conflicts
                  .map((conflict) => conflict.field ?? conflict.ruleId)
                  .filter(Boolean)
                  .join(", ")
              : "none"}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-5">
        {shouldShowIdentity ? (
          <div className="rounded-xl border border-blue-100 bg-white/70 p-4">
            <SectionTitle
              title="Policy and claimant"
              description="Fix missing policy or claimant identity fields."
            />

            <div className="mt-3 grid gap-3">
              <TextField
                label="Policy number"
                value={draft.policyNumber}
                required={needsField("policyNumber")}
                placeholder="POL-123"
                onChange={(value) =>
                  updateTopLevelString("policyNumber", value)
                }
              />

              <TextField
                label="Claimant name"
                value={draft.claimantName}
                required={needsField("claimantName_or_insuredName")}
                placeholder="Ritika Gupta"
                onChange={(value) =>
                  updateTopLevelString("claimantName", value)
                }
              />

              <TextField
                label="Insured name"
                value={draft.insuredName}
                placeholder="Ritika Gupta"
                onChange={(value) =>
                  updateTopLevelString("insuredName", value)
                }
              />
            </div>
          </div>
        ) : null}

        {shouldShowVehicle ? (
          <div className="rounded-xl border border-blue-100 bg-white/70 p-4">
            <SectionTitle
              title="Vehicle"
              description="Fix vehicle identifiers required by validation."
            />

            <div className="mt-3 grid gap-3">
              <TextField
                label="Vehicle registration number"
                value={draft.vehicle.registrationNumber}
                required={needsField("vehicle.registrationNumber")}
                placeholder="DL-01-AB-1234"
                onChange={(value) =>
                  updateVehicleString("registrationNumber", value)
                }
              />

              <div className="grid gap-3 md:grid-cols-2">
                <TextField
                  label="Make"
                  value={draft.vehicle.make}
                  placeholder="Maruti"
                  onChange={(value) => updateVehicleString("make", value)}
                />

                <TextField
                  label="Model"
                  value={draft.vehicle.model}
                  placeholder="Swift"
                  onChange={(value) => updateVehicleString("model", value)}
                />
              </div>
            </div>
          </div>
        ) : null}

        {shouldShowIncident ? (
          <div className="rounded-xl border border-blue-100 bg-white/70 p-4">
            <SectionTitle
              title="Incident"
              description="Fix missing incident details or unknown loss type."
            />

            <div className="mt-3 grid gap-3">
              <label className="block">
                <span className="text-xs font-medium text-gray-700">
                  Loss type{" "}
                  {hasConflictForField("incident.lossType") ? (
                    <span className="text-red-600">*</span>
                  ) : null}
                </span>

                <select
                  value={draft.incident.lossType}
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
                  className="mt-1 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-gray-950 outline-none focus:border-blue-400"
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
                value={draft.incident.incidentDate}
                required={needsField("incident.incidentDate")}
                placeholder="2026-05-14"
                onChange={(value) =>
                  updateIncidentString("incidentDate", value)
                }
              />

              <TextField
                label="Incident location"
                value={draft.incident.incidentLocation}
                required={needsField("incident.incidentLocation")}
                placeholder="Sector 17, Chandigarh"
                onChange={(value) =>
                  updateIncidentString("incidentLocation", value)
                }
              />

              <label className="block">
                <span className="text-xs font-medium text-gray-700">
                  Incident description{" "}
                  {needsField("incident.description") ? (
                    <span className="text-red-600">*</span>
                  ) : null}
                </span>

                <textarea
                  value={textValue(draft.incident.description)}
                  onChange={(event) =>
                    updateIncidentString("description", event.target.value)
                  }
                  placeholder="Describe what happened..."
                  className="mt-1 min-h-24 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-gray-950 placeholder:text-gray-400 outline-none focus:border-blue-400"
                />
              </label>
            </div>
          </div>
        ) : null}

        {shouldShowPolice ? (
          <div className="rounded-xl border border-blue-100 bg-white/70 p-4">
            <SectionTitle
              title="Police / FIR details"
              description="For theft claims, FIR and police evidence are usually required."
            />

            <div className="mt-3 grid gap-3">
              <CheckboxField
                label="Reported to police"
                checked={draft.police.wasReportedToPolice === true}
                onChange={(checked) =>
                  setDraft((current) => ({
                    ...current,
                    police: {
                      ...current.police,
                      wasReportedToPolice: checked,
                    },
                  }))
                }
              />

              <TextField
                label="FIR number"
                value={draft.police.firNumber}
                required={
                  needsField("police.firNumber") || needsEvidence("firNumber")
                }
                placeholder="FIR-2026-0142"
                onChange={(value) => updatePoliceString("firNumber", value)}
              />

              <TextField
                label="Police station"
                value={draft.police.policeStation}
                placeholder="Sector 17 Police Station"
                onChange={(value) =>
                  updatePoliceString("policeStation", value)
                }
              />

              <TextField
                label="Police report date"
                value={draft.police.reportDate}
                placeholder="2026-05-14"
                onChange={(value) => updatePoliceString("reportDate", value)}
              />
            </div>
          </div>
        ) : null}

        {shouldShowDamage ? (
          <div className="rounded-xl border border-blue-100 bg-white/70 p-4">
            <SectionTitle
              title="Damage / repair estimate"
              description="Fix repair cost or currency conflicts."
            />

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium text-gray-700">
                  Estimated repair cost
                </span>

                <input
                  type="number"
                  value={draft.damage.estimatedRepairCost ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      damage: {
                        ...current.damage,
                        estimatedRepairCost:
                          event.target.value.trim().length > 0
                            ? Number(event.target.value)
                            : null,
                      },
                    }))
                  }
                  placeholder="25000"
                  className="mt-1 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-gray-950 placeholder:text-gray-400 outline-none focus:border-blue-400"
                />
              </label>

              <TextField
                label="Currency"
                value={draft.damage.currency}
                placeholder="INR"
                onChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    damage: {
                      ...current.damage,
                      currency: emptyToNull(value),
                    },
                  }))
                }
              />
            </div>
          </div>
        ) : null}

        {shouldShowSupportingDocs ? (
          <div className="rounded-xl border border-blue-100 bg-white/70 p-4">
            <SectionTitle
              title="Supporting documents"
              description="Confirm available evidence. This replaces manually editing missingEvidence."
            />

            <div className="mt-3 grid gap-2">
              <CheckboxField
                label="Claim form available"
                checked={draft.supportingDocuments.claimForm}
                onChange={(checked) =>
                  setDraft((current) => ({
                    ...current,
                    supportingDocuments: {
                      ...current.supportingDocuments,
                      claimForm: checked,
                    },
                  }))
                }
              />

              <CheckboxField
                label="Damage photo available"
                checked={draft.supportingDocuments.damagePhoto}
                onChange={(checked) =>
                  setDraft((current) => ({
                    ...current,
                    supportingDocuments: {
                      ...current.supportingDocuments,
                      damagePhoto: checked,
                    },
                  }))
                }
              />

              <CheckboxField
                label="Repair estimate available"
                checked={draft.supportingDocuments.repairEstimate}
                onChange={(checked) =>
                  setDraft((current) => ({
                    ...current,
                    supportingDocuments: {
                      ...current.supportingDocuments,
                      repairEstimate: checked,
                    },
                  }))
                }
              />

              <CheckboxField
                label="Police report available"
                checked={draft.supportingDocuments.policeReport}
                onChange={(checked) =>
                  setDraft((current) => ({
                    ...current,
                    supportingDocuments: {
                      ...current.supportingDocuments,
                      policeReport: checked,
                    },
                  }))
                }
              />
            </div>
          </div>
        ) : null}

        <label className="block">
          <span className="text-xs font-medium text-gray-700">
            Correction notes
          </span>

          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Example: Added policy number from page 1."
            className="mt-1 min-h-20 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-gray-950 placeholder:text-gray-400 outline-none focus:border-blue-400"
          />
        </label>

        {localError ? (
          <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            {localError}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isBusy}
          className="w-full rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {actionInFlight === "edit_and_approve"
            ? "Saving correction..."
            : "Save corrections & approve"}
        </button>

        <p className="text-xs text-blue-700">
          The backend will re-run validation and block approval if any required
          field, conflict, or evidence is still unresolved.
        </p>
      </div>
    </form>
  );
}
