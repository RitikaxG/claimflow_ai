import { Type } from "@google/genai";

// Here required means key must exist in JSON object although it can be null
export const CLAIM_EXTRACTION_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  required: [
    "documentType",
    "claimNumber",
    "policyNumber",
    "insuredName",
    "claimantName",
    "contactEmail",
    "contactPhone",
    "vehicle",
    "incident",
    "damage",
    "police",
    "supportingDocuments",
    "missingEvidence",
    "overallConfidence",
  ],
  properties: {
    documentType: {
      type: Type.STRING,
      enum: [
        "auto_insurance_claim_form",
        "repair_estimate",
        "police_report",
        "claim_email",
        "damage_image",
        "unknown",
      ],
    },

    claimNumber: {
      type: Type.STRING,
      nullable: true,
    },
    policyNumber: {
      type: Type.STRING,
      nullable: true,
    },
    insuredName: {
      type: Type.STRING,
      nullable: true,
    },
    claimantName: {
      type: Type.STRING,
      nullable: true,
    },
    contactEmail: {
      type: Type.STRING,
      nullable: true,
    },
    contactPhone: {
      type: Type.STRING,
      nullable: true,
    },

    vehicle: {
      type: Type.OBJECT,
      required: [
        "registrationNumber",
        "make",
        "model",
        "year",
        "engineNumber",
        "chassisNumber",
      ],
      properties: {
        registrationNumber: {
          type: Type.STRING,
          nullable: true,
        },
        make: {
          type: Type.STRING,
          nullable: true,
        },
        model: {
          type: Type.STRING,
          nullable: true,
        },
        year: {
          type: Type.STRING,
          nullable: true,
        },
        engineNumber: {
          type: Type.STRING,
          nullable: true,
        },
        chassisNumber: {
          type: Type.STRING,
          nullable: true,
        },
      },
    },

    incident: {
      type: Type.OBJECT,
      required: [
        "incidentDate",
        "incidentTime",
        "incidentLocation",
        "lossType",
        "description",
      ],
      properties: {
        incidentDate: {
          type: Type.STRING,
          nullable: true,
        },
        incidentTime: {
          type: Type.STRING,
          nullable: true,
        },
        incidentLocation: {
          type: Type.STRING,
          nullable: true,
        },
        lossType: {
          type: Type.STRING,
          enum: [
            "own_damage",
            "third_party",
            "theft",
            "personal_accident",
            "unknown",
          ],
        },
        description: {
          type: Type.STRING,
          nullable: true,
        },
      },
    },

    damage: {
      type: Type.OBJECT,
      required: [
        "damagedParts",
        "damageSeverity",
        "estimatedRepairCost",
        "currency",
      ],
      properties: {
        damagedParts: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
          },
        },
        damageSeverity: {
          type: Type.STRING,
          enum: ["minor", "moderate", "severe", "unknown"],
        },
        estimatedRepairCost: {
          type: Type.NUMBER,
          nullable: true,
        },
        currency: {
          type: Type.STRING,
          nullable: true,
        },
      },
    },

    police: {
      type: Type.OBJECT,
      required: [
        "wasReportedToPolice",
        "policeStation",
        "firNumber",
        "reportDate",
      ],
      properties: {
        wasReportedToPolice: {
          type: Type.BOOLEAN,
        },
        policeStation: {
          type: Type.STRING,
          nullable: true,
        },
        firNumber: {
          type: Type.STRING,
          nullable: true,
        },
        reportDate: {
          type: Type.STRING,
          nullable: true,
        },
      },
    },

    supportingDocuments: {
      type: Type.OBJECT,
      required: [
        "claimForm",
        "damagePhoto",
        "repairEstimate",
        "policeReport",
      ],
      properties: {
        claimForm: {
          type: Type.BOOLEAN,
        },
        damagePhoto: {
          type: Type.BOOLEAN,
        },
        repairEstimate: {
          type: Type.BOOLEAN,
        },
        policeReport: {
          type: Type.BOOLEAN,
        },
      },
    },

    missingEvidence: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
    },

    overallConfidence: {
      type: Type.NUMBER,
    },
  },
} as const;