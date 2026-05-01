import { z } from "zod";

export const ClaimDocumentTypeSchema = z.enum([
    "auto_insurance_claim_form",
    "repair_estimate",
    "police_report",
    "claim_email",
    "damage_image",
    "unknown"
]);

export const LossTypeSchema = z.enum([
    "own_damage",
    "third_party",
    "theft",
    "personal_accident",
    "unknown"
]);

export const DamageSeveritySchema = z.enum([
    "minor",
    "moderate",
    "severe",
    "unknown",
]);

export const VehicleDetailsSchema = z.object({
    registrationNumber: z.string().nullable(),
    make: z.string().nullable(),
    model: z.string().nullable(),
    year: z.string().nullable(),
    engineNumber : z.string().nullable(),
    chassisNumber : z.string().nullable(),
});

export const IncidentDetailsSchema = z.object({
    incidentDate : z.string().nullable(),
    incidentTime : z.string().nullable(),
    incidentLocation : z.string().nullable(),
    lossType : LossTypeSchema,
    description : z.string().nullable(),
});

export const DamageDetailsSchema = z.object({
    damagedParts : z.array(z.string()).default([]),
    damageSeverity : DamageSeveritySchema,
    estimatedRepairCost : z.number().nullable(),
    currency : z.string().nullable(),
});

export const PoliceDetailsSchema = z.object({
    wasReportedToPolice : z.boolean().default(false),
    policeStation : z.string().nullable(),
    firNumber : z.string().nullable(),
    reportDate : z.string().nullable(),
});

export const SupportingDocumentsSchema = z.object({
    claimForm : z.boolean().default(false),
    damagePhoto : z.boolean().default(false),
    repairEstimate : z.boolean().default(false),
    policeReport : z.boolean().default(false),
});

export const ClaimExtractionSchema = z.object({
    documentType : ClaimDocumentTypeSchema,

    claimNumber : z.string().nullable(),
    policyNumer : z.string().nullable(),

    insuredName : z.string().nullable,
    claimantName : z.string().nullable(),
    contactEmail : z.string().email().nullable(),
    contactPhone : z.string().nullable(),

    vehicle : VehicleDetailsSchema,
    incident : IncidentDetailsSchema,
    damage : DamageDetailsSchema,
    police : PoliceDetailsSchema,
    supportingDocuments : SupportingDocumentsSchema,

    missingEvidence : z.array(z.string()).default([]),
    overallConfidence : z.number().min(0).max(1),
});

export type ClaimExtraction = z.infer<typeof ClaimExtractionSchema>;