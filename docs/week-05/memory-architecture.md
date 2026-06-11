# ClaimFlow AI — Week 5 Memory Architecture

## 1. What memory means in ClaimFlow AI

Memory in ClaimFlow AI is not generic chat history and it is not a second source of claim truth. It is workflow memory: a controlled record of what the claim workflow learned from past human corrections, prior review outcomes, repeated extraction failures, vendor patterns, claimant patterns, and policy/evidence handling.

The central rule is:

```text
Memory is context, not evidence.
```

A memory can help the system decide that a claim should be routed to a reviewer, that a missing field should be verified, or that a known risky vendor pattern should be surfaced. It cannot approve a claim, reject a claim, overwrite extracted JSON, replace current policy evidence, or fill missing values from an older claim.

This distinction is the most important architectural decision in the Week 5 memory system.

---

## 2. Why ClaimFlow needs memory

Before memory, every claim was treated as if the system had no history. That is safe, but it loses useful workflow knowledge.

For example:

```text
A reviewer repeatedly corrected policyNumber for the same claimant.
A vendor had repeated invoice amount conflicts.
Third-party damage claims repeatedly required a police report.
The agent repeatedly drafted the same information request for the same missing evidence.
```

These patterns should not directly decide future claims, but they should influence workflow routing.

Memory lets ClaimFlow answer questions like:

```text
Have we seen this workflow problem before?
Was a similar field corrected by a human reviewer?
Did this vendor or claimant previously require extra review?
Did this type of missing evidence usually lead to an information request?
Is this an isolated event or a recurring workflow pattern?
```

Memory does not answer:

```text
Is this claim covered?
Should this claim be approved?
Should this claim be rejected?
What value should be written into extractedJson?
```

Those answers must still come from the current claim packet, current policy evidence, validation, and human review.

---

## 3. The complete memory pipeline

The full Week 5 memory pipeline is:

```text
Past workflow history
→ normalized memory observations
→ memory writer
→ WorkflowMemory DB records
→ memory retrieval and scoring
→ safe agent context
→ agent uses memory only for routing/verification
→ reviewer outcome
→ memory update loop
→ semantic pattern creation
→ future retrieval
```

This creates a closed learning loop, but with guardrails. The system learns from human review outcomes over time, while keeping memory separate from the source-of-truth claim evidence.

---

## 4. Types of memory in ClaimFlow

ClaimFlow uses three practical memory types: episodic, procedural, and semantic.

### 4.1 Episodic memory

Episodic memory stores a specific past workflow event.

Examples:

```text
A reviewer corrected policyNumber for claimant CUST-W5-001.
A prior claim for claimant CUST-W5-003 was rejected after review.
A vendor invoice amount conflict was escalated to human review.
A reviewer requested policeReport for a third-party damage claim.
```

In the database, these appear as workflow memory cards such as:

```text
HUMAN_CORRECTION
PRIOR_REJECTION
PRIOR_REVIEW_DECISION
POLICY_HISTORY
VENDOR_PATTERN
CLAIMANT_PATTERN
```

Episodic memory is useful because it preserves a compact, auditable lesson from a real workflow event.

### 4.2 Procedural memory

Procedural memory defines how the agent is allowed to use memory.

In ClaimFlow, procedural memory lives in the rules attached to each memory card and in the agent guardrails.

Every memory carries:

```text
safeUse
mustNotDo
riskLevel
kind
```

Example:

```text
Summary:
Reviewer previously corrected policyNumber for this claimant.

Safe use:
Ask the reviewer to verify policyNumber in future similar claims.

Must not do:
Do not overwrite extractedJson.policyNumber.
Do not approve or reject the claim from this memory.
```

This is procedural because it teaches the agent the allowed workflow behavior, not just the fact that something happened.

### 4.3 Semantic memory

Semantic memory is generalized pattern memory created from repeated episodic memories.

Example episodic memories:

```text
Reviewer corrected policyNumber in claim 1.
Reviewer corrected policyNumber in claim 2.
Reviewer corrected policyNumber in claim 3.
```

Semantic memory:

```text
policyNumber is a recurring extraction risk.
```

Semantic memory helps ClaimFlow move from isolated recall to pattern learning. It is still not evidence. It only helps future claims route to verification, review, or information request workflows.

---

## 5. How initial memory was created from past evals

At the start of Week 5, ClaimFlow did not yet have real production history. So the first memory layer was bootstrapped from earlier synthetic evaluation data and past workflow-like records.

The historical inputs represented safe summaries of old workflow outcomes:

```text
historical claims
human corrections
prior review decisions
agent action history
recurring workflow issues
```

These raw history records were not inserted directly into agent context. That would be unsafe and noisy.

Instead, they were normalized into memory observations.

A memory observation is a compact candidate lesson with fields like:

```text
sourceType
entityType
entityId
fieldPath
riskLevel
recommendedMemoryKind
summary
safeUse
mustNotDo
evidenceJson
```

This normalized observation layer exists because historical data can come from many places, but the memory writer needs one safe input shape.

Example:

```text
Raw history:
A reviewer edited a claim because policyNumber was missing.

Normalized memory observation:
Entity: claimant CUST-W5-001
Field: policyNumber
Kind: HUMAN_CORRECTION
Summary: Reviewer corrected missing policyNumber for this claimant.
Safe use: Ask future reviewer to verify policyNumber.
Must not do: Do not auto-fill or overwrite policyNumber.
```

The tradeoff was intentional:

```text
Do not use old claims as memory directly.
First convert them into small, constrained, auditable observations.
```

This keeps the memory system explainable and prevents accidental leakage of full old claim packets into future decisions.

---

## 6. Writing memory into the database

The memory writer converts normalized observations into long-term WorkflowMemory records.

A memory card stores:

```text
what happened before
which entity or workflow field it relates to
why it matters
how it may be safely used
what the agent must not do with it
how confident the system is
how risky misuse would be
what evidence created the memory
```

A typical card looks like:

```text
Kind: HUMAN_CORRECTION
Entity type: CLAIMANT
Entity id: CUST-W5-001
Field path: policyNumber
Risk level: MEDIUM
Summary: Reviewer previously corrected a missing policyNumber for this claimant.
Safe use: Ask reviewer to verify policyNumber in future similar claims.
Must not do: Do not overwrite extractedJson.policyNumber or approve from memory.
```

The writer also creates an audit update when memory is created. This matters because memory must be explainable.

For each memory, the system should be able to answer:

```text
Where did this memory come from?
Was it created from an observation, seed history, or a human review decision?
What source fields were used?
When was it created?
Has it been confirmed, contradicted, weakened, retired, or superseded?
```

The initial memory writer was also made idempotent. If the same observation or same memory scope is loaded again, it should not create duplicate memory cards.

The duplicate detection tradeoff was:

```text
Avoid exact-summary-only duplicate detection.
Use stable memory scope: kind + entityType + entityId + fieldPath + source evidence.
```

This matters because two summaries may be worded differently while representing the same memory.

---

## 7. Memory retrieval design

Retrieval starts from the current claim, not from the old memory.

For a future claim, ClaimFlow first builds a structured memory query from the current workflow state:

```text
runId
claimantId / customerId
policyId
vendorId
missingFields
requiredEvidence
fieldPaths
risk tags
lossType
damageType
validation status
retrieval status
policy decision state
```

The retriever then finds candidate memories and scores them.

The design goal is:

```text
retrieve memories that are relevant to the current workflow problem,
not memories that merely look similar by name or text.
```

### 7.1 Identity anchors

Identity anchors match stable entities:

```text
same claimant
same vendor
same policy
```

They are useful, but they are not enough by themselves.

Example:

```text
Same claimant + same missing field = strong signal.
Same claimant only = weak signal unless it is a risk memory such as prior rejection.
```

ClaimFlow does not match claimant memory by fuzzy name similarity. If two people have similar names but different customer IDs, entity-scoped memory should not be retrieved.

This was a key safety tradeoff:

```text
Prefer missing a weak memory over attaching another claimant's history incorrectly.
```

### 7.2 Workflow condition signals

Workflow signals check whether the current claim has the same problem as the old memory.

Examples:

```text
same field path
same missing field
same required evidence
same loss type
full semantic pattern match
partial semantic pattern match
```

This is more important than identity-only matching because ClaimFlow is a workflow system.

A previous memory about `policyNumber` is useful when the current claim is missing or has low confidence on `policyNumber`. A previous memory about police report is useful when the current claim requires police report.

### 7.3 Trust and risk signals

The retriever also adjusts score based on trust and risk:

```text
human-verified memory
confirmed memory
high-risk memory
contradicted memory
```

High-risk memory can be useful for routing, but it is dangerous for final decisions. So high risk can increase retrieval visibility, while guardrails prevent unsafe usage.

Contradicted memory gets penalized because it has been wrong before.

---

## 8. Memory scoring

Scoring combines three ideas:

```text
1. How specifically the memory matches the current workflow issue
2. Whether the memory is attached to the same stable entity
3. Whether the memory is trusted, risky, or previously contradicted
```

The scoring model used:

```text
EXACT_POLICY                  +35
SAME_FIELD                    +30
GENERIC_FIELD_BUCKET_MATCH     +5
MISSING_FIELD_MATCH           +30
REQUIRED_EVIDENCE_MATCH       +30
PATTERN_FULL_MATCH            +45
PATTERN_PARTIAL_MATCH         +10
EXACT_VENDOR                  +25
EXACT_CLAIMANT                +20
SAME_LOSS_TYPE                +10
HIGH_RISK_MEMORY              +10
HUMAN_VERIFIED_MEMORY         +10
CONFIRMED_MEMORY              +10
CONTRADICTED_BEFORE           -20
```

A strong retrieval example:

```text
Current claim:
customerId = CUST-W5-001
missingFields = [policyNumber]

Memory:
Reviewer previously corrected policyNumber for CUST-W5-001.

Score:
SAME_FIELD +30
MISSING_FIELD_MATCH +30
EXACT_CLAIMANT +20
HUMAN_VERIFIED_MEMORY +10
Total = 90
```

A broader semantic pattern receives a lower score unless the full pattern appears.

Example:

```text
Semantic memory:
policyNumber + incidentDate are recurring missing-field risks.

Current claim:
only policyNumber is missing.

Result:
partial pattern match, not full pattern match.
```

This prevents broad pattern memories from outranking precise episodic memories.

The tradeoff is conservative ranking:

```text
specific current workflow relevance > broad historical similarity
```

---

## 9. Retrieval rules and safety criteria

The retrieval layer follows these rules:

### Rule 1 — Do not retrieve retired or superseded memory

Memory with these statuses should not influence future claims:

```text
RETIRED
SUPERSEDED
```

Eligible memory statuses are:

```text
ACTIVE
STRENGTHENED
WEAKENED
```

A weakened memory can still be shown, but with lower confidence and possibly lower ranking.

### Rule 2 — Entity-scoped memory must match the same entity

Claimant, vendor, and policy memories should only apply when the stable ID matches.

```text
CLAIMANT memory → same claimant ID only
VENDOR memory → same vendor ID only
POLICY memory → same policy ID only
```

### Rule 3 — Generic workflow memory can cross entities

Some memories are not about a specific claimant or vendor. They are about workflow conditions.

Example:

```text
requiredEvidence.policeReport is often requested for third-party claims.
```

This can apply across different claimants if the current claim has the same required evidence issue.

### Rule 4 — Return compact memory, not old claim data

Retrieved memory is formatted as:

```text
summary
safeUse
mustNotDo
riskLevel
confidence
score
matchedOn
retrievalReason
```

The old claim packet is not passed into the agent.

### Rule 5 — Retrieval is audited

When memory is retrieved for a real run, the system records a MemoryHit:

```text
which memory was retrieved
which run it matched
why it matched
what score it received
whether the agent later used it
```

This gives the system explainability and supports later memory updates.

---

## 10. How memory is integrated into agent context

Memory is added after ClaimFlow builds the current claim context.

The agent context contains:

```text
current extracted JSON
validated JSON / validation state
missing fields
required evidence
policy retrieval state
review task state
previous agent actions
relevant workflow memories
```

The memory section is intentionally compact.

The agent sees:

```text
Memory summary
Safe use
Must not do
Risk level
Score
Matched reason
```

The agent does not receive full historical claims or unbounded old data.

This is the prompt-level meaning of memory:

```text
Here are workflow lessons that may help you route this claim safely.
Use them only to decide whether to ask for information, retrieve policy clauses, or escalate to review.
Do not use them as claim evidence.
```

---

## 11. When the agent uses memory

The agent can use retrieved memory for safe workflow actions.

Allowed actions include:

```text
DRAFT_INFORMATION_REQUEST
ESCALATE_TO_HUMAN
RETRIEVE_POLICY_CLAUSES
CREATE_REVIEW_TASK
ASK_REVIEWER_TO_VERIFY_FIELD
```

Examples:

### Example 1 — Missing field memory

```text
Current claim:
vehicleRegistrationNumber is missing.

Memory:
A prior claim with the same missing field was resolved by asking the claimant for registration details.

Safe agent action:
Draft an information request for vehicleRegistrationNumber.
```

The agent must not fill the missing value from memory.

### Example 2 — Vendor risk memory

```text
Current claim:
Invoice is complete, but vendor has repeated invoice conflict memory.

Memory:
This vendor previously had invoice amount conflicts.

Safe agent action:
Escalate to human review.
```

The agent must not reject the claim or choose an invoice amount from memory.

### Example 3 — Prior rejection memory

```text
Current claim:
Same claimant has a prior rejected claim.

Memory:
A previous claim was rejected after review.

Safe agent action:
Route to human review.
```

The agent must not auto-reject the current claim.

---

## 12. Guardrails around memory usage

Memory guardrails block unsafe behavior.

Blocked behaviors include:

```text
approving a claim from memory
rejecting a claim from memory
drafting denial reasoning without current policy evidence
overwriting extracted JSON from memory
auto-correcting missing fields from memory
using prior rejection as current claim truth
using vendor or claimant risk memory as final evidence
```

Safe behavior remains allowed:

```text
ask for missing information
route to human review
ask reviewer to verify a risky field
retrieve current policy clauses
surface memory as context
```

The main design tradeoff is:

```text
Memory may increase review friction, but it must not reduce decision safety.
```

That is why high-risk memory can push a claim toward human review, but never toward automatic approval or denial.

---

## 13. MemoryHit: tracking retrieved and used memory

MemoryHit connects retrieval to agent behavior.

When memory is retrieved, ClaimFlow records:

```text
memoryId
runId
score
matchedOn
retrievalReason
usedByAgent = false
```

If the memory enters the agent decision path, ClaimFlow marks:

```text
usedByAgent = true
agentActionLogId = current agent action
```

This is important because memory should not be strengthened just because it was retrieved. Retrieval means “possibly relevant.” Agent usage means “used for routing.” Neither proves the memory was correct.

Only a reviewer outcome can confirm or contradict memory.

---

## 14. The memory update loop

The initial `memory-observations` dataset is only a bootstrap layer. ClaimFlow does not keep manually updating that file forever.

Once the product workflow is running, new memory comes from real future claims:

```text
new claim is extracted
validation runs
agent routes the claim
human reviewer approves, edits, rejects, or requests more information
system compares extractedJson with correctedJson
system reads the review decision
system creates or updates memory
```

The key learning signal is the human review outcome.

The memory update loop is:

```text
retrieved memory
→ agent uses memory safely
→ reviewer makes decision
→ system checks whether reviewer outcome confirmed or contradicted the used memory
→ memory confidence/status is updated
→ audit row is written
```

This means memory evolves from actual workflow feedback, not from continuously editing static seed files.

---

## 15. Creating new memory from future claims

When a reviewer edits a claim, the system compares:

```text
extractedJson
correctedJson
```

The diff identifies fields that changed:

```text
ADDED
REMOVED
CHANGED
```

Examples:

```text
policyNumber changed from null to POL-CORRECTED
insuredName changed from Dev Aroa to Dev Arora
invoice.amount changed from 8000 to 12000
requiredEvidence changed to include policeReport
```

The review decision adds meaning to the diff.

Examples:

```text
EDIT_AND_APPROVE + policyNumber changed
→ create HUMAN_CORRECTION memory

REJECT
→ create PRIOR_REJECTION memory

REQUEST_MORE_INFO + policeReport requested
→ create PRIOR_REVIEW_DECISION / evidence memory

Repeated vendor invoice conflict
→ later contributes to VENDOR_PATTERN memory
```

The tradeoff is that memory is created from trusted workflow outcomes, not from raw model guesses.

---

## 16. Strengthening memory

A memory is strengthened when it was used by the agent and the reviewer outcome confirms the same issue.

Example:

```text
Old memory:
Reviewer previously corrected policyNumber for this claimant.

Future claim:
Agent used that memory to escalate policyNumber verification.

Reviewer outcome:
Reviewer again corrected policyNumber.

Update:
Memory is strengthened.
```

Typical update:

```text
status: ACTIVE → STRENGTHENED
confirmedCount +1
confidence +0.05
```

Strengthening means the memory has been useful again in a future real workflow.

---

## 17. Weakening memory

A memory is weakened when it was used by the agent but the reviewer outcome contradicts it.

Example:

```text
Old memory:
Prior rejection memory for this claimant.

Future claim:
Agent escalated because of prior rejection memory.

Reviewer outcome:
Reviewer approved the claim as-is.

Update:
Memory is weakened.
```

Typical update:

```text
status: ACTIVE → WEAKENED
contradictedCount +1
confidence -0.10
```

Weakening does not immediately delete the memory. It reduces trust while preserving audit history.

---

## 18. Retiring memory

A memory is retired when it is contradicted repeatedly.

Example:

```text
A prior rejection memory is used in two future claims.
Both times, reviewers approve the claims as-is.
```

Update:

```text
status: RETIRED
```

Retired memory should no longer be retrieved.

The tradeoff is conservative forgetting:

```text
One contradiction weakens memory.
Repeated contradiction retires it.
```

This avoids deleting potentially useful memory too aggressively.

---

## 19. Superseding memory

A memory is superseded when a newer same-scope memory replaces an older one.

Same scope usually means:

```text
same kind
same entityType
same entityId
same fieldPath
```

Example:

```text
Old memory:
Reviewer corrected policyNumber for claimant CUST-001.

New memory:
Reviewer corrected policyNumber again for claimant CUST-001 with newer evidence.

Update:
Old memory becomes SUPERSEDED.
Old memory points to the newer memory.
```

Superseding is different from retiring.

```text
Retired = memory became unreliable.
Superseded = memory was replaced by a newer, better version.
```

This preserves lineage while keeping retrieval focused on the latest memory.

---

## 20. Feedback recorded without confidence change

Sometimes the reviewer outcome does not clearly confirm or contradict the memory.

Example:

```text
Memory warned about vendor invoice conflict.
Agent escalated.
Reviewer requested unrelated missing evidence.
```

In this case, the system records feedback but does not change confidence.

```text
updateType: FEEDBACK_RECORDED
confidenceDelta: 0
```

This avoids forcing every outcome into confirm/contradict when the signal is ambiguous.

---

## 21. Review decision to memory behavior

The update loop can be summarized like this:

| Reviewer outcome | Memory creation/update behavior |
| --- | --- |
| APPROVE_AS_IS | Usually no new memory. May weaken a used risk memory if it suggested a problem that reviewer did not confirm. |
| EDIT_AND_APPROVE | Creates human-correction memory from extractedJson vs correctedJson diff. Strengthens matching field memory if used. May supersede older same-scope correction memory. |
| REJECT | Creates prior-rejection memory. Strengthens used entity-risk memory if the rejection confirms the risk. |
| REQUEST_MORE_INFO | Creates or strengthens missing-field / required-evidence memory when the requested info matches the retrieved memory. |

This keeps the learning loop tied to human decisions.

---

## 22. Semantic memory creation

Semantic memory is created when repeated episodic memories show a stable pattern.

The system does not use an LLM to invent patterns. It uses deterministic grouping rules.

Eligible source memories are usually:

```text
ACTIVE
STRENGTHENED
WEAKENED
```

Ignored source memories:

```text
RETIRED
SUPERSEDED
```

Semantic memory can be created from episodic memory kinds such as:

```text
HUMAN_CORRECTION
PRIOR_REJECTION
PRIOR_REVIEW_DECISION
POLICY_HISTORY
```

The semantic layer creates generalized workflow memories such as:

```text
RECURRING_ERROR_PATTERN
VENDOR_PATTERN
CLAIMANT_PATTERN
```

---

## 23. Semantic memory thresholds

The thresholds were chosen to be simple, deterministic, and conservative enough for a demo system.

### 23.1 Recurring field correction pattern

Threshold:

```text
3 HUMAN_CORRECTION memories with the same fieldPath
→ create RECURRING_ERROR_PATTERN
```

Example:

```text
policyNumber corrected in three different review outcomes
→ policyNumber is a recurring extraction risk
```

Safe use:

```text
Ask reviewer to verify policyNumber when missing or low-confidence.
```

Must not do:

```text
Do not auto-fill policyNumber.
Do not overwrite extractedJson.
Do not approve or reject from the pattern.
```

### 23.2 Vendor pattern

Threshold:

```text
2 vendor-scoped memories with the same vendorId and similar risk tag
→ create VENDOR_PATTERN
```

Example:

```text
Vendor VEND-201 has two invoice conflict review signals
→ future matching vendor claims should be routed to review
```

Safe use:

```text
Route matching vendor invoice conflicts to human review.
```

Must not do:

```text
Do not choose invoice amount automatically.
Do not reject based only on vendor memory.
```

### 23.3 Claimant pattern

Threshold:

```text
2 claimant-scoped memories with the same claimantId and similar risk tag
→ create CLAIMANT_PATTERN
```

Example:

```text
Claimant CUST-101 has two duplicate-like review signals
→ future similar claims should be reviewed
```

Safe use:

```text
Route similar future claims to review.
```

Must not do:

```text
Do not auto-reject as duplicate.
Do not draft denial from memory alone.
```

---

## 24. How semantic memory is stored

Semantic memory stores its source trail.

Its evidence includes:

```text
patternKey
generalizedFromMemoryIds
source memory kinds
source observations or packets
source memory snapshots
generalizedAt
```

This makes semantic memory explainable.

ClaimFlow can answer:

```text
Why does this pattern exist?
Which earlier memories created it?
How many examples supported it?
Which entities or fields were involved?
When was it generalized?
```

This is important because generalized memory is more powerful than episodic recall. The more generalized the memory, the more important its audit trail becomes.

---

## 25. Semantic memory tradeoffs

The semantic thresholds are intentionally low because this is a controlled demo dataset, but the usage is conservative.

The risk is:

```text
Low thresholds can create patterns too early.
```

The mitigation is:

```text
Semantic memory cannot decide claims.
It can only route to review, ask for verification, or request missing evidence.
```

So a false-positive semantic pattern may add reviewer friction, but it should not create an unsafe claim decision.

In a production system, thresholds could become dynamic based on claim volume, contradiction rate, entity type, and reviewer confidence.

---

## 26. Important architecture tradeoffs

### Tradeoff 1 — Memory is not evidence

This reduces automation power but keeps the claim decision safe.

Memory can say:

```text
Verify this field.
```

It cannot say:

```text
This field value is true.
```

### Tradeoff 2 — Stable IDs over fuzzy names

The system avoids matching by similar claimant names.

This may miss some useful memories, but it prevents attaching one customer’s risk history to another customer.

### Tradeoff 3 — Structured memory cards over old claim dumps

The agent receives compact memory cards, not old claim JSON.

This reduces context size, prevents leakage, and makes every memory auditable.

### Tradeoff 4 — Deterministic scoring before embeddings

The first retrieval system uses explicit scoring signals instead of vector similarity.

This makes retrieval easier to debug:

```text
same field +30
missing field +30
same claimant +20
human verified +10
```

The downside is less semantic flexibility. The upside is predictable behavior in a regulated workflow.

### Tradeoff 5 — Human review outcomes update memory, not agent actions

The agent using a memory does not prove the memory is correct.

Only reviewer outcomes strengthen, weaken, retire, or supersede memory.

### Tradeoff 6 — Keep weakened memory retrievable

A weakened memory is not immediately deleted.

This preserves signal while reducing confidence. Repeated contradiction retires it.

### Tradeoff 7 — Semantic patterns are deterministic

The system does not ask an LLM to invent abstract patterns.

It groups repeated memories by field, vendor risk, or claimant risk. This is less creative but safer and explainable.

---

## 27. How the complete loop works in one example

### Step 1 — Past review creates memory

```text
Reviewer corrected policyNumber for claimant CUST-001.
```

ClaimFlow creates:

```text
HUMAN_CORRECTION memory
entityType: CLAIMANT
entityId: CUST-001
fieldPath: policyNumber
safeUse: ask reviewer to verify policyNumber
mustNotDo: do not overwrite policyNumber
```

### Step 2 — Future claim arrives

```text
customerId: CUST-001
policyNumber: missing
```

### Step 3 — Memory retrieval

The memory matches because:

```text
same claimant
same field
current claim missing the field
human-verified memory
```

It receives a high score.

### Step 4 — Agent context

The agent sees:

```text
Reviewer previously corrected policyNumber for this claimant.
Safe use: ask reviewer to verify.
Must not do: do not overwrite extractedJson or approve/reject from memory.
```

### Step 5 — Agent action

The agent chooses:

```text
ESCALATE_TO_HUMAN
```

or:

```text
DRAFT_INFORMATION_REQUEST
```

depending on the current validation state.

### Step 6 — Reviewer outcome

Reviewer edits and approves the claim, correcting policyNumber again.

### Step 7 — Memory update

The old memory was used and the reviewer confirmed the same issue.

ClaimFlow updates:

```text
status: STRENGTHENED
confirmedCount +1
confidence +0.05
```

It may also create a newer same-scope human correction memory and supersede the older one.

### Step 8 — Semantic memory

After enough similar field correction memories exist, ClaimFlow generalizes:

```text
policyNumber is a recurring extraction risk.
```

Future claims with missing or low-confidence policyNumber can retrieve this semantic memory even if they are for a different claimant, because the memory is now about a workflow pattern, not a specific claimant.

---

## 28. Final architecture summary

ClaimFlow memory is built in layers:

```text
Episodic memory:
Specific past reviewer corrections, rejections, and review decisions.

Procedural memory:
Rules describing how memory may and may not be used by the agent.

Semantic memory:
Generalized recurring patterns created from repeated episodic memories.
```

The memory lifecycle is:

```text
bootstrap from past eval history
→ normalize into observations
→ write safe WorkflowMemory cards
→ retrieve using structured current-claim signals
→ score by workflow relevance, entity match, trust, and risk
→ pass compact memory into agent context
→ allow only safe routing/verification actions
→ audit retrieval with MemoryHit
→ update memory after human review outcomes
→ strengthen, weaken, retire, or supersede memory
→ generalize repeated episodic memory into semantic memory
```

The most important safety principle remains:

```text
Memory can influence workflow routing.
Memory cannot decide claim truth.
```

That is the core design of ClaimFlow AI memory.
