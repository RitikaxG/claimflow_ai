# Week 06 Bug Fixes — AI Gateway, Observability, and Governance

## 1. Real model calls were invisible outside feature-specific records

### Problem

Extraction, coverage answering, and agent planning each called a model, but there was no shared operational record for comparing their behavior.

### Cause

Each feature owned its provider call directly. Model metadata, latency, tokens, cost, retryability, and failures were not governed through one lifecycle.

### Fix

The calls were routed through `callModelThroughGateway()` and persisted as `AiCallLog` rows.

### Result

The main model-backed workflow can now be queried by `runId`, `traceId`, call kind, model, prompt version, status, cost, and latency.

---

## 2. A failed provider call could lose its trace record

### Problem

If logging happened only after a provider response, timeouts and thrown provider errors could disappear from the audit trail.

### Cause

Post-call-only logging assumes the provider returns normally.

### Fix

The gateway creates a `STARTED` row before invoking the provider and updates the same row in success and failure paths.

### Result

Timeouts, provider errors, parse failures, and governance blocks remain visible even when no valid model output exists.

---

## 3. Failure classes were too easy to collapse into one generic error

### Problem

An invalid model response, provider outage, timeout, and policy block require different operational responses.

### Cause

A generic `FAILED` status does not say whether retrying is safe or whether governance intentionally prevented the call.

### Fix

The gateway maps failures into structured status and error types:

```text
FAILED     → malformed/invalid response
RETRYABLE  → timeout or provider error
BLOCKED    → missing governed metadata or cost policy
```

### Result

The workflow and dashboard can distinguish retryable incidents from permanent failures and intentional policy blocks.

---

## 4. Latency spikes were initially at risk of being counted as model failures

### Problem

A slow call can still return a valid answer. Marking it failed would corrupt success and error metrics.

### Cause

Latency is an operational warning, while validity is a call outcome. Treating both as one status blurs those meanings.

### Fix

A valid slow response remains:

```text
status: SUCCEEDED
errorType: LATENCY_SPIKE
metadata.latencySpike: true
```

### Result

Reliability metrics remain accurate while slow calls stay visible for performance investigation.

---

## 5. Missing trace IDs could create untraceable AI calls

### Problem

One synthetic case intentionally omitted `traceId`. Persisting the omission would make the call impossible to correlate reliably.

### Cause

Callers cannot always be trusted to supply complete observability metadata.

### Fix

The gateway generates a trace ID when the incoming value is empty and persists the generated value.

### Result

`missing_trace_rate` measures persisted trace loss and can remain at zero even when a caller omitted the value.

---

## 6. Missing model version needed to block before provider execution

### Problem

A model call without `modelVersion` cannot be reproduced or compared safely.

### Cause

Provider and model names alone are not sufficient governance metadata.

### Fix

The gateway records the attempt and returns:

```text
BLOCKED / MISSING_MODEL_VERSION
```

before invoking the synthetic or real provider.

### Result

Ungoverned calls are audit-visible but cannot proceed.

---

## 7. Gateway logs risked duplicating sensitive source content

### Problem

Copying PDF bytes, full emails, retrieved clauses, or complete agent context into `AiCallLog` would increase privacy and storage risk.

### Cause

Observability often drifts toward logging entire inputs for convenience.

### Fix

Call sites store compact, purpose-specific metadata:

```text
PDF source metadata, not bytes
email length, not full body
retrieved IDs/counts, not complete clauses
agent-state counts, not complete context
```

### Result

Calls remain explainable without turning gateway logs into a duplicate sensitive-data store.

---

## 8. Deterministic workflow steps could be mislabeled as AI calls

### Problem

Logging deterministic routing through the gateway would make provider-call counts, cost, and latency misleading.

### Cause

The agent runner contains both deterministic and model-backed planner paths.

### Fix

Only the model-backed planner path uses the AI gateway. Deterministic actions remain in workflow and agent audit records.

### Result

`AiCallLog` means a provider call actually occurred.

---

## 9. The `cost_spike` synthetic behavior broke TypeScript checking

### Problem

The Week 06 eval runner handled `cost_spike`, but the `GatewaySyntheticBehavior` union did not include that value.

The compiler reported:

```text
Type '"cost_spike"' is not comparable to type 'GatewaySyntheticBehavior'.
```

### Cause

The runner switch and the dataset behavior type had drifted.

### Fix

The synthetic behavior definitions and runner cases were aligned so every supported case is represented by the type system.

### Result

`bun run check-types` no longer fails on the Week 06 runner, and new synthetic behaviors must be added consistently.

---

## 10. Eval pass rate was confused with intentional failure rates

### Problem

A healthy synthetic eval showed non-zero error rates, which could look like the eval itself failed.

### Cause

The suite intentionally produces timeouts, provider errors, invalid JSON, and blocks. These are test inputs, not assertion failures.

### Fix

The reporting model separates:

```text
eval_pass_rate = assertion correctness
gateway signal rates = intentionally detected production risks
```

### Result

The dashboard can show `eval_pass_rate = 100%` alongside non-zero controlled failure rates without contradiction.

---

## 11. Eval results originally proved behavior only in memory

### Problem

A runner could return the expected status while failing to persist the `AiCallLog` needed by the product.

### Cause

Asserting only returned function values does not prove the database audit path works.

### Fix

Each case reads the persisted log and checks status, error type, trace ID, versions, latency, cost, and dashboard-compatible fields.

### Result

Week 06 proves both gateway behavior and durable observability.

---

## 12. Trace and workflow visibility was placed too close to extraction details

### Problem

Putting full trace/eval visibility inside the extraction run content made observability look like another extraction panel and overloaded the run screen.

### Cause

The first UI placement did not distinguish doing claim work from inspecting operational evidence.

### Fix

A clear link from the run page opens the dedicated route:

```text
/runs/[runId]/trace
```

### Result

Coverage, memory, eval evidence, and trace evidence remain discoverable while keeping distinct responsibilities.

---

## 13. Moving a review to pending could succeed without the requested information

### Problem

After an information-request draft was created, a reviewer could click “move to pending” without providing the actual required field or evidence. The workflow advanced even though the blocking requirement remained unresolved.

### Cause

The transition checked that an information-request workflow existed, not that the current claim data satisfied its outstanding requirements.

### Fix

The transition was hardened to re-check the requested fields/evidence against the updated claim state before changing review status.

### Result

Workflow state can no longer claim that information was received merely because a draft or request record exists.

---

## 14. Revalidation checked unrelated requirements after the requested field was supplied

### Problem

When `vehicle.registrationNumber` was the requested missing field and the reviewer supplied it, the transition could still return an error for unrelated historical or non-required items.

### Cause

The completion check was too broad and treated all validation output as part of the active information request.

### Fix

The pending transition validates the specific outstanding requirements captured by the information request, while normal claim validation remains responsible for the complete claim.

### Result

Providing the requested field resolves that request without silently ignoring it or being blocked by unrelated state.

---

## 15. Edit-and-approve corrections did not always create recurring-field memory

### Problem

A first claim could be edited and approved with a missing field supplied, but a later claim with the same missing field returned no recurring memory.

### Cause

The live memory writer did not consistently turn the trusted `extractedJson → correctedJson` field addition into a reusable field-scoped observation, or created it with scope too narrow for recurring retrieval.

### Fix

The review-decision path treats an added/corrected required field as a trusted human-correction observation and preserves its `fieldPath`. Repeated cross-claim corrections can form a recurring-error pattern.

### Result

The fix applies to recurring missing fields generally, not only `vehicle.registrationNumber`.

---

## 16. Recurring memory retrieval was too dependent on exact entity scope

### Problem

A correction from one claim was not useful when the same field was missing in another claim whose stable entity IDs differed or were absent.

### Cause

Entity-scoped episodic memory and cross-claim semantic pattern memory were not cleanly separated in retrieval.

### Fix

Retrieval keeps claimant/policy/vendor history restricted to stable-ID matches, while field-scoped recurring patterns can match the same current missing field across claims.

### Result

ClaimFlow can surface:

```text
This field has required repeated human correction.
```

without leaking another claimant’s value or auto-filling the current claim.

---

## 17. Trace evidence could imply memory was used when it was only retrieved

### Problem

Showing a memory hit beside an agent action could imply causation even when the agent ignored that memory.

### Cause

Retrieval and decision-path usage are separate events.

### Fix

Trace data preserves `MemoryHit.usedByAgent` and the linked agent action when usage occurs.

### Result

The trace distinguishes retrieved memory, agent-used memory, and later human-confirmed or contradicted memory.

---

## Final safety outcome

The Week 06 fixes enforce four boundaries:

```text
no invisible model calls
no unclassified operational failures
no invalid workflow progress without required information
no use of historical memory as current claim evidence
```

Observability was therefore implemented as both telemetry and workflow correctness. The system must log what happened, but it must also prevent an incorrect state from becoming an apparently successful trace.
