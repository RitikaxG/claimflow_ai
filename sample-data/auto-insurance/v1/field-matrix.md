# Auto Insurance Claim Field Matrix

This matrix explains the fields used in ClaimFlow AI's `auto_claim_v1` extraction schema.

## Common observed fields

| Field | Required in v1? | Reason |
|---|---:|---|
| policyNumber | Yes | Links claim to an active policy |
| claimNumber | No | May not exist at intake time |
| insuredName | Conditional | Required if claimantName is missing |
| claimantName | Conditional | Required if insuredName is missing |
| contactEmail | No | Useful for follow-up |
| contactPhone | No | Useful for follow-up |
| vehicle.registrationNumber | Yes | Main vehicle identifier |
| vehicle.make | No | Useful but often missing |
| vehicle.model | No | Useful but often missing |
| incident.incidentDate | Yes | Core claim fact |
| incident.incidentTime | No | Useful but sometimes absent |
| incident.incidentLocation | Yes | Core claim fact |
| incident.lossType | Yes | Drives evidence requirements |
| incident.description | Yes | Needed for reviewer understanding |
| damage.damagedParts | No | Useful for repair analysis |
| damage.estimatedRepairCost | Conditional | Required when damage/repair estimate exists |
| damage.currency | Conditional | Required if repair cost exists |
| police.wasReportedToPolice | Conditional | Important for theft/third-party |
| police.firNumber | Conditional | Required/recommended for theft claims |
| supportingDocuments.damagePhoto | Conditional | Required/recommended for damage claims |
| supportingDocuments.repairEstimate | Conditional | Required/recommended for damage claims |
| supportingDocuments.policeReport | Conditional | Required/recommended for theft/third-party claims |

## v1 validation rules

- policyNumber is required for auto claim forms.
- claimantName or insuredName is required.
- vehicle.registrationNumber is required.
- incident.incidentDate is required.
- incident.incidentLocation is required.
- incident.lossType must not be unknown.
- incident.description is required.
- if estimatedRepairCost exists, currency is required.
- if estimatedRepairCost <= 0, mark conflict.
- if lossType is third_party, policeReport is required/recommended.
- if lossType is theft, firNumber and policeReport are required/recommended.
- if overallConfidence < 0.75, mark NEEDS_REVIEW.