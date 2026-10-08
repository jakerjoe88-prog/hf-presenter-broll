# Motion selection contract

Use this contract after Micro Beat and real-carrier analysis. Shotcraft descriptions are candidate evidence, not the final decision.

## Pool order

1. Recall from the 60-card core library in `core-motion-selection.json`.
2. Prefer Tier A when it passes the same semantic and carrier thresholds.
3. Use Tier B when its stronger duration, source, layout, or energy conditions are satisfied.
4. Search the full 152-card catalog only when no core candidate reaches the primary threshold.

## Four-pass decision

### 1. Eligibility

Classify the beat before retrieval. Motion is `ELIGIBLE` only when it materially improves explanation and has a concrete carrier/ROI plus enough time. Pure presenter turns, factual reading holds, unavailable/sensitive assets, and already motion-complete source intervals are `INELIGIBLE`.

### 2. Recall

Normalize the text into a semantic job and retrieve 6–8 candidates. Do not choose by a noun match alone.

### 3. Independent reranking

Score each candidate out of 100:

| Dimension | Max |
|---|---:|
| semantic relationship match | 30 |
| real-carrier / ROI match | 20 |
| duration and phase fit | 10 |
| narration-anchor fit | 10 |
| readability | 8 |
| confirmed-style fit | 8 |
| source availability and HF portability | 8 |
| continuity with adjacent beats | 6 |

Apply penalties after the positive score:

- same or near-identical grammar within the previous three beats: `-15`;
- presenter/subtitle/ROI competition that can be repaired but is not yet repaired: `-15`;
- decorative match with no explanatory state change: reject;
- real-carrier replacement, pre-anchor reveal, unavailable sensitive data, or impossible duration: reject;
- `NATIVE_REWRITE_REQUIRED` without an explicit native rewrite plan: reject as primary.

Thresholds:

- `>=75`: primary candidate;
- `65..74`: support or backup only;
- `<65`: reject.

Retrieval confidence and selection score are separate. A `HIGH` retrieval result may still be rejected by the independent scene evaluation.

### 4. Whole-video scheduling

- Default eligible-beat target is 90%; 80% remains the hard floor unless documented exceptions are approved.
- One beat has at most one primary motion grammar and zero to two subordinate presenter/camera/reading actions.
- Do not repeat the same primary grammar within three beats unless it is an intentional motif with a written reason.
- Alternate high-energy explanation with readable settle/hold windows. Continuous decoration does not count as motion coverage.
- Evaluate neighboring beats together so presenter exits, carrier continuity, camera pose inheritance, and transitions form one sequence.

## Required decision output

Record the selected primary, at most one backup, score breakdown, penalties, rejected alternatives, carrier, required source state, anchor, presenter competition, duration pressure, core tier, source availability, catalog status, and implementation status.

The final decision belongs in the reviewable task and later in `SHOTCRAFT_COVERAGE_PLAN.json`; it is not proof of implementation.
