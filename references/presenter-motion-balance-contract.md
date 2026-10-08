# Presenter and motion balance contract

Preserve narration editing and presenter direction while making motion and real carriers the dominant explanatory layer.

## Parallel tracks

Every talking-head production maintains four coordinated tracks:

1. narration/editing: source audio, cuts, silence cleanup, subtitles, and word anchors;
2. presenter direction: layout, crop, scale, position, mask, and camera response;
3. explanatory picture: real assets, UI, documents, charts, MG, and Shotcraft grammar;
4. continuity: handoffs, transitions, pose inheritance, and reading holds.

Shotcraft enriches the explanatory and continuity tracks. Preserve source media and narration timing. The presenter visual layer may be hidden for content-led passages; retaining the presenter direction track does not require showing a face in every frame. Read [visibility routing](presenter-visibility-routing.md) before choosing layouts.

## Dominance state

Every Micro Beat declares one:

- `PRESENTER_DOMINANT`: trust, emotion, personal judgment, opening, or direct conclusion;
- `EFFECT_DOMINANT`: process, data change, cause/effect, comparison, replacement, or operation;
- `HYBRID_BALANCED`: presenter remains visible while the explanatory carrier evolves;
- `REAL_ASSET_DOMINANT`: evidence, product, browser, document, footage, or factual UI needs the main canvas;
- `READING_HOLD`: stable evidence or conclusion needs protected reading time.

For a typical explanation-led talking-head video, use a soft planning range of 50–60% effect/real-asset dominant, 20–30% hybrid, 15–20% presenter dominant, and about 5% deliberate reading holds. Script meaning overrides the percentages.

## Presenter choreography

- Establish presenter identity at the opening when a presenter exists.
- Begin presenter reframe before dense explanatory content enters.
- First decide whether the presenter adds information. Use CONTENT_ONLY when useful content stands on its own, or needs the full canvas. Use split, avatar, or PIP only when visible presenter information is valuable.
- Require a camera, presenter, or composition response for high-impact beats unless a concrete `hold_reason` is recorded.
- Return the presenter for personal judgment, strong turns, emotional trust, and the conclusion when appropriate.
- Preserve face/head safety, subtitle safety, and spatial continuity. A planned editorial cut to content and back is valid; no compulsory shrinking/flying transition is required.

## Motion density

- One primary semantic effect per eligible beat.
- Up to one presenter/camera support action and one reading/annotation support action.
- Presenter movement does not count as Shotcraft coverage by itself.
- Subtitle bounce, background drift, looping rotation, and ambient particles do not count as explanatory motion.
- The primary effect must reach HIT on the narration anchor, then leave a readable settle.

## Required fields

```yaml
visual_dominance: EFFECT_DOMINANT
presenter_role: SUPPORTING_EXPLAINER
presenter_layout_current: FULL_CENTER
presenter_layout_target: AVATAR_LEFT
presenter_camera_action: ENTER_AVATAR
main_carrier: REAL_BROWSER
shotcraft_primary: bezier-source-converge-merge
shotcraft_support: ROI_PUSH_IN
anchor_id: a_source_to_answer
reading_hold_frames: 18
balance_reason: Multiple sources need the main canvas while the presenter remains for continuity.
```

## Hard failures

- deleting useful presenter or editorial flow only to raise motion coverage;
- making the presenter permanently static while calling the video presenter-led;
- using a full-screen effect where real evidence or a readable interface should dominate;
- multiple primary effects competing in one beat;
- presenter, subtitle, or effect covering the critical carrier ROI;
- no designed transition between presenter-dominant and effect-dominant states.

For every Micro Beat, presenter_visibility is required as defined in [visibility routing](presenter-visibility-routing.md). Layout and visibility must agree; CONTENT_ONLY maps to HIDDEN while source audio continues.
