# Week 1 Gemini Extraction + Validation Eval

## Summary

- Samples evaluated: **5**
- Blockers: **0**

## Results

| Sample | Extraction Score | Extraction Schema | Validation Schema | Validation Match | Expected Status | Actual Status | Blockers |
|---|---:|---|---|---|---|---|---:|
| missing-policy-number | 15/15 | pass | pass | pass | NEEDS_REVIEW | NEEDS_REVIEW | 0 |
| repair-estimate-only | 15/15 | pass | pass | fail | NEEDS_REVIEW | NEEDS_REVIEW | 0 |
| theft-claim-missing-fir | 15/15 | pass | pass | pass | NEEDS_REVIEW | NEEDS_REVIEW | 0 |
| third-party-without-police-report | 15/15 | pass | pass | pass | NEEDS_REVIEW | NEEDS_REVIEW | 0 |
| valid-own-damage-claim | 15/15 | pass | pass | pass | COMPLETED | COMPLETED | 0 |

## missing-policy-number

### Extraction fields

| Field | Expected | Actual | Result |
|---|---|---|---|
| documentType | `auto_insurance_claim_form` | `auto_insurance_claim_form` | PASS |
| policyNumber | `null` | `null` | PASS |
| claimNumber | `CLM-2026-1002` | `CLM-2026-1002` | PASS |
| insuredName | `Priya Mehta` | `Priya Mehta` | PASS |
| claimantName | `Priya Mehta` | `Priya Mehta` | PASS |
| vehicle.registrationNumber | `MH12CD4567` | `MH12CD4567` | PASS |
| incident.incidentDate | `2026-04-20` | `2026-04-20` | PASS |
| incident.incidentLocation | `Pune Highway` | `Pune Highway` | PASS |
| incident.lossType | `own_damage` | `own_damage` | PASS |
| damage.estimatedRepairCost | `18500` | `18500` | PASS |
| damage.currency | `INR` | `INR` | PASS |
| police.firNumber | `null` | `null` | PASS |
| supportingDocuments.claimForm | `true` | `true` | PASS |
| supportingDocuments.repairEstimate | `true` | `true` | PASS |
| supportingDocuments.policeReport | `false` | `false` | PASS |

### Validation checks

| Check | Expected | Actual | Result |
|---|---|---|---|
| finalStatus | `NEEDS_REVIEW` | `NEEDS_REVIEW` | PASS |
| missingFields | `["policyNumber"]` | `["policyNumber"]` | PASS |
| requiredEvidence | `[]` | `[]` | PASS |
| conflicts.ruleId | `[]` | `[]` | PASS |
| warnings.ruleId | `[]` | `[]` | PASS |

## repair-estimate-only

### Extraction fields

| Field | Expected | Actual | Result |
|---|---|---|---|
| documentType | `repair_estimate` | `repair_estimate` | PASS |
| policyNumber | `null` | `null` | PASS |
| claimNumber | `null` | `null` | PASS |
| insuredName | `null` | `null` | PASS |
| claimantName | `null` | `null` | PASS |
| vehicle.registrationNumber | `DL01AB1234` | `DL01AB1234` | PASS |
| incident.incidentDate | `null` | `null` | PASS |
| incident.incidentLocation | `null` | `null` | PASS |
| incident.lossType | `unknown` | `unknown` | PASS |
| damage.estimatedRepairCost | `42000` | `42000` | PASS |
| damage.currency | `INR` | `INR` | PASS |
| police.firNumber | `null` | `null` | PASS |
| supportingDocuments.claimForm | `false` | `false` | PASS |
| supportingDocuments.repairEstimate | `true` | `true` | PASS |
| supportingDocuments.policeReport | `false` | `false` | PASS |

### Validation checks

| Check | Expected | Actual | Result |
|---|---|---|---|
| finalStatus | `NEEDS_REVIEW` | `NEEDS_REVIEW` | PASS |
| missingFields | `["claimantName_or_insuredName","incident.description","incident.incidentDate","incident.incidentLocation","policyNumber"]` | `["claimantName_or_insuredName","incident.description","incident.incidentDate","incident.incidentLocation","policyNumber"]` | PASS |
| requiredEvidence | `["claimForm"]` | `["claimForm"]` | PASS |
| conflicts.ruleId | `["LOSS_TYPE_UNKNOWN"]` | `["LOSS_TYPE_UNKNOWN"]` | PASS |
| warnings.ruleId | `["DOCUMENT_TYPE_REPAIR_ESTIMATE_ONLY","LOW_CONFIDENCE_REVIEW"]` | `["DOCUMENT_TYPE_REPAIR_ESTIMATE_ONLY"]` | FAIL |

## theft-claim-missing-fir

### Extraction fields

| Field | Expected | Actual | Result |
|---|---|---|---|
| documentType | `auto_insurance_claim_form` | `auto_insurance_claim_form` | PASS |
| policyNumber | `AUTO-2026-7710` | `AUTO-2026-7710` | PASS |
| claimNumber | `CLM-2026-1004` | `CLM-2026-1004` | PASS |
| insuredName | `Neha Iyer` | `Neha Iyer` | PASS |
| claimantName | `Neha Iyer` | `Neha Iyer` | PASS |
| vehicle.registrationNumber | `TN09XY2222` | `TN09XY2222` | PASS |
| incident.incidentDate | `2026-04-10` | `2026-04-10` | PASS |
| incident.incidentLocation | `Chennai Central Parking Area` | `Chennai Central Parking Area` | PASS |
| incident.lossType | `theft` | `theft` | PASS |
| damage.estimatedRepairCost | `null` | `null` | PASS |
| damage.currency | `null` | `null` | PASS |
| police.firNumber | `null` | `null` | PASS |
| supportingDocuments.claimForm | `true` | `true` | PASS |
| supportingDocuments.repairEstimate | `false` | `false` | PASS |
| supportingDocuments.policeReport | `false` | `false` | PASS |

### Validation checks

| Check | Expected | Actual | Result |
|---|---|---|---|
| finalStatus | `NEEDS_REVIEW` | `NEEDS_REVIEW` | PASS |
| missingFields | `["police.firNumber"]` | `["police.firNumber"]` | PASS |
| requiredEvidence | `["firNumber","policeReport"]` | `["firNumber","policeReport"]` | PASS |
| conflicts.ruleId | `[]` | `[]` | PASS |
| warnings.ruleId | `["THEFT_POLICE_REPORT_REQUIRED"]` | `["THEFT_POLICE_REPORT_REQUIRED"]` | PASS |

## third-party-without-police-report

### Extraction fields

| Field | Expected | Actual | Result |
|---|---|---|---|
| documentType | `auto_insurance_claim_form` | `auto_insurance_claim_form` | PASS |
| policyNumber | `AUTO-2026-5512` | `AUTO-2026-5512` | PASS |
| claimNumber | `CLM-2026-1003` | `CLM-2026-1003` | PASS |
| insuredName | `Rohan Verma` | `Rohan Verma` | PASS |
| claimantName | `Rohan Verma` | `Rohan Verma` | PASS |
| vehicle.registrationNumber | `KA05MN7890` | `KA05MN7890` | PASS |
| incident.incidentDate | `2026-04-21` | `2026-04-21` | PASS |
| incident.incidentLocation | `Bengaluru Outer Ring Road` | `Bengaluru Outer Ring Road` | PASS |
| incident.lossType | `third_party` | `third_party` | PASS |
| damage.estimatedRepairCost | `68000` | `68000` | PASS |
| damage.currency | `INR` | `INR` | PASS |
| police.firNumber | `null` | `null` | PASS |
| supportingDocuments.claimForm | `true` | `true` | PASS |
| supportingDocuments.repairEstimate | `true` | `true` | PASS |
| supportingDocuments.policeReport | `false` | `false` | PASS |

### Validation checks

| Check | Expected | Actual | Result |
|---|---|---|---|
| finalStatus | `NEEDS_REVIEW` | `NEEDS_REVIEW` | PASS |
| missingFields | `[]` | `[]` | PASS |
| requiredEvidence | `["policeReport"]` | `["policeReport"]` | PASS |
| conflicts.ruleId | `[]` | `[]` | PASS |
| warnings.ruleId | `["THIRD_PARTY_POLICE_REPORT_RECOMMENDED"]` | `["THIRD_PARTY_POLICE_REPORT_RECOMMENDED"]` | PASS |

## valid-own-damage-claim

### Extraction fields

| Field | Expected | Actual | Result |
|---|---|---|---|
| documentType | `auto_insurance_claim_form` | `auto_insurance_claim_form` | PASS |
| policyNumber | `AUTO-2026-8841` | `AUTO-2026-8841` | PASS |
| claimNumber | `CLM-2026-1001` | `CLM-2026-1001` | PASS |
| insuredName | `Amit Sharma` | `Amit Sharma` | PASS |
| claimantName | `Amit Sharma` | `Amit Sharma` | PASS |
| vehicle.registrationNumber | `DL01AB1234` | `DL01AB1234` | PASS |
| incident.incidentDate | `2026-04-18` | `2026-04-18` | PASS |
| incident.incidentLocation | `Delhi Ring Road` | `Delhi Ring Road` | PASS |
| incident.lossType | `own_damage` | `own_damage` | PASS |
| damage.estimatedRepairCost | `42000` | `42000` | PASS |
| damage.currency | `INR` | `INR` | PASS |
| police.firNumber | `null` | `null` | PASS |
| supportingDocuments.claimForm | `true` | `true` | PASS |
| supportingDocuments.repairEstimate | `true` | `true` | PASS |
| supportingDocuments.policeReport | `false` | `false` | PASS |

### Validation checks

| Check | Expected | Actual | Result |
|---|---|---|---|
| finalStatus | `COMPLETED` | `COMPLETED` | PASS |
| missingFields | `[]` | `[]` | PASS |
| requiredEvidence | `[]` | `[]` | PASS |
| conflicts.ruleId | `[]` | `[]` | PASS |
| warnings.ruleId | `[]` | `[]` | PASS |
