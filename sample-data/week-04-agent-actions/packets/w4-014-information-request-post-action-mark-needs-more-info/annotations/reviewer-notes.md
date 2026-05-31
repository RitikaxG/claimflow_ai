# Information request post-action

This packet tests the two-step behavior introduced later in Week 4:

1. The agent chooses `DRAFT_INFORMATION_REQUEST`.
2. ClaimFlow deterministically follows it with `MARK_NEEDS_MORE_INFO`.

This matters because the agent should not directly own workflow mutation. The agent drafts the request. ClaimFlow applies the safe workflow transition.