export type FieldRequest = {
  field: string;
  label: string;
  question: string;
  acceptedEvidence: string[];
  valueKind: "text" | "date" | "identifier" | "money" | "unknown";
};

const FIELD_REQUESTS: Record<string, Omit<FieldRequest, "field">> = {
  policyNumber: {
    label: "Policy number",
    question:
      "Please provide the policy number, or upload a policy schedule / complete claim form that contains it.",
    acceptedEvidence: ["policySchedule", "claimForm"],
    valueKind: "identifier",
  },

  claimantName_or_insuredName: {
    label: "Claimant or insured name",
    question:
      "Please provide the claimant or insured name as shown on the policy or claim form.",
    acceptedEvidence: ["claimForm", "policySchedule"],
    valueKind: "text",
  },

  "vehicle.registrationNumber": {
    label: "Vehicle registration number",
    question:
      "Please provide the vehicle registration number, or upload the registration certificate / claim form.",
    acceptedEvidence: ["registrationCertificate", "claimForm"],
    valueKind: "identifier",
  },

  "incident.incidentDate": {
    label: "Incident date",
    question: "Please provide the incident date.",
    acceptedEvidence: ["claimForm", "incidentReport"],
    valueKind: "date",
  },

  "incident.incidentLocation": {
    label: "Incident location",
    question: "Please provide the incident location.",
    acceptedEvidence: ["claimForm", "incidentReport"],
    valueKind: "text",
  },

  "incident.description": {
    label: "Incident description",
    question: "Please provide a short description of what happened.",
    acceptedEvidence: ["claimForm", "incidentReport"],
    valueKind: "text",
  },

  "police.firNumber": {
    label: "FIR number",
    question:
      "Please provide the FIR number, or upload the FIR copy / police report.",
    acceptedEvidence: ["firCopy", "policeReport"],
    valueKind: "identifier",
  },
};

export function buildFieldRequests(missingFields: string[]): FieldRequest[] {
  return missingFields.map((field) => {
    const known = FIELD_REQUESTS[field];

    if (known) {
      return {
        field,
        ...known,
      };
    }

    return {
      field,
      label: field,
      question: `Please provide the missing claim field: ${field}.`,
      acceptedEvidence: ["claimForm"],
      valueKind: "unknown",
    };
  });
}

export function inferRequestType(input: {
  requestedEvidence: string[];
  requestedFields: string[];
}): "EVIDENCE_REQUEST" | "FIELD_CLARIFICATION" | "MIXED_INFO_REQUEST" {
  const hasEvidence = input.requestedEvidence.length > 0;
  const hasFields = input.requestedFields.length > 0;

  if (hasEvidence && hasFields) {
    return "MIXED_INFO_REQUEST";
  }

  if (hasFields) {
    return "FIELD_CLARIFICATION";
  }

  return "EVIDENCE_REQUEST";
}

export function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    const trimmed = value.trim();

    if (!trimmed) {
      return;
    }

    const key = trimmed.toLowerCase();

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    result.push(trimmed);
  });

  return result;
}