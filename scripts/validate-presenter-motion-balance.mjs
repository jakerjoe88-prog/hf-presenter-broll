import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (name, fallback = '') => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : fallback;
};
const allowedDominance = new Set(['PRESENTER_DOMINANT','EFFECT_DOMINANT','HYBRID_BALANCED','REAL_ASSET_DOMINANT','READING_HOLD']);
const preservedTracks = ['narration_editing','subtitles','presenter_direction','explanatory_picture','continuity'];

export const validate = (data) => {
  const errors = [];
  const warnings = [];
  if (data.presenter_present === false) return {status: 'NOT_APPLICABLE', errors, warnings, beat_count: 0};
  if (data.presenter_present !== true) errors.push('Explicit presenter_present boolean required.');
  const tracks = data.tracks ?? {};
  for (const track of preservedTracks) if (!['PRESERVED','ACTIVE'].includes(tracks[track])) errors.push(`Track ${track} must be PRESERVED or ACTIVE.`);
  if (data.presenter_movement_counts_as_shotcraft_coverage === true) errors.push('Presenter movement cannot count as Shotcraft coverage.');
  if (data.presenter_removed_for_motion_coverage === true) errors.push('Presenter may not be removed merely to raise motion coverage.');
  const rawBeats = data.micro_beats ?? data.decisions;
  const beats = Array.isArray(rawBeats) ? rawBeats : [];
  if (!Array.isArray(beats) || beats.length === 0) errors.push('No presenter Micro Beats found.');
  for (const beat of beats) {
    const id = beat.id ?? beat.beat_id ?? 'UNKNOWN_BEAT';
    if (!allowedDominance.has(beat.visual_dominance)) errors.push(`${id}: invalid or missing visual_dominance.`);
    if (!beat.balance_reason) errors.push(`${id}: missing balance_reason.`);
    const direction = beat.presenter_direction ?? {};
    if (!direction.layout_current || !direction.layout_target || !direction.camera_action) errors.push(`${id}: incomplete presenter_direction current/target/camera action.`);
    const v = beat.presenter_visibility ?? {};
    const layouts = {
      FULL_FRAME: /^(FULL_CENTER|FULL_OFFSET_(LEFT|RIGHT))$/,
      CONTENT_ONLY: /^HIDDEN$/,
      CIRCLE_PIP: /^AVATAR_CIRCLE_(LEFT|RIGHT|BOTTOM_LEFT|BOTTOM_RIGHT)$/,
      RECT_PIP: /^RECT_PIP_(LEFT|RIGHT|BOTTOM_LEFT|BOTTOM_RIGHT)$/,
      SPLIT: /^SOFT_SPLIT_(LEFT|RIGHT)$/
    };
    const hasText = value => typeof value === 'string' && value.trim().length > 0;
    if (!layouts[v.treatment]?.test(direction.layout_target ?? '')) errors.push(`${id}: missing or inconsistent presenter treatment/layout.`);
    if (!['NONE','IDENTITY','GESTURE','JUDGMENT'].includes(v.presenter_value)) errors.push(`${id}: presenter value required.`);
    if (!['FULL_CANVAS','SHARED','LIGHT'].includes(v.content_need)) errors.push(`${id}: content space requirement required.`);
    if (!['READY','NATIVE_PLANNED','MISSING','NOT_REQUIRED'].includes(v.material_readiness)) errors.push(`${id}: material readiness required.`);
    for (const key of ['reason','handoff_in','handoff_out']) if (!hasText(v[key])) errors.push(`${id}: presenter visibility ${key} required.`);
    if (v.source_audio !== 'PRESERVED') errors.push(`${id}: preserve source audio independently of presenter visibility.`);
    if (v.content_need === 'FULL_CANVAS' && v.treatment !== 'CONTENT_ONLY') errors.push(`${id}: full-canvas content must not compete with presenter; split the beat if both are essential.`);
    if (v.presenter_value === 'NONE' && ['READY','NATIVE_PLANNED'].includes(v.material_readiness) && v.treatment !== 'CONTENT_ONLY') errors.push(`${id}: no presenter value with available content; select CONTENT_ONLY.`);
    if (v.treatment === 'CONTENT_ONLY') {
      if (!['READY','NATIVE_PLANNED'].includes(v.material_readiness)) errors.push(`${id}: content-only beat needs an available carrier.`);
      if (!hasText(beat.main_carrier)) errors.push(`${id}: content-only beat needs main_carrier.`);
      if (['GESTURE','JUDGMENT'].includes(v.presenter_value)) errors.push(`${id}: indispensable presenter information cannot be hidden; split or reroute the beat.`);
    }
    if (v.treatment === 'CIRCLE_PIP' && v.presenter_value === 'GESTURE') errors.push(`${id}: gesture requires body framing, not a head-only circle.`);
    if (['EFFECT_DOMINANT','HYBRID_BALANCED','REAL_ASSET_DOMINANT'].includes(beat.visual_dominance) && !beat.main_carrier) errors.push(`${id}: dominant explanatory beat needs main_carrier.`);
    if (beat.visual_dominance === 'PRESENTER_DOMINANT' && beat.shotcraft_primary) warnings.push(`${id}: verify that the primary effect remains subordinate to presenter dominance.`);
    if (beat.presenter_deleted_for_effect === true) errors.push(`${id}: destructive presenter deletion is forbidden; use reversible CONTENT_ONLY visibility instead.`);
  }
  if (beats.length && beats.every(b => b.presenter_visibility?.treatment !== 'CONTENT_ONLY') && beats.some(b => ['REAL_ASSET_DOMINANT','EFFECT_DOMINANT','READING_HOLD'].includes(b.visual_dominance))) warnings.push('Presenter visible throughout content-led beats: review whether identity adds value; no fixed hidden-duration quota.');
  const frames_by_treatment = {};
  for (const b of beats) {
    const key = b.presenter_visibility?.treatment ?? 'UNDECLARED';
    const frames = Number.isInteger(b.start_frame) && Number.isInteger(b.end_frame) ? Math.max(0,b.end_frame-b.start_frame) : 0;
    frames_by_treatment[key] = (frames_by_treatment[key] ?? 0) + frames;
  }
  return {status: errors.length ? 'FAIL' : 'PASS', errors, warnings, beat_count: beats.length, frames_by_treatment};
};

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
let data;
if (argv.includes('--self-test')) {
  data = {
    presenter_present: true,
    tracks: {narration_editing:'PRESERVED',subtitles:'PRESERVED',presenter_direction:'ACTIVE',explanatory_picture:'ACTIVE',continuity:'ACTIVE'},
    presenter_movement_counts_as_shotcraft_coverage: false,
    micro_beats: [{id:'b1',visual_dominance:'HYBRID_BALANCED',balance_reason:'Presenter reaction accompanies the UI.',main_carrier:'REAL_UI',presenter_visibility:{treatment:'CIRCLE_PIP',presenter_value:'IDENTITY',content_need:'SHARED',material_readiness:'READY',reason:'Reaction matters',source_audio:'PRESERVED',handoff_in:'Reframe head before UI',handoff_out:'Return at personal judgment'},presenter_direction:{layout_current:'FULL_CENTER',layout_target:'AVATAR_CIRCLE_LEFT',camera_action:'ENTER_AVATAR'}}]
  };
} else {
  const inputPath = arg('--input');
  if (!inputPath) throw new Error('Pass --input <TARGET_DIRECTOR_DECISIONS.json> or --self-test.');
  data = JSON.parse(fs.readFileSync(path.resolve(inputPath), 'utf8'));
}
const report = {schema_version:'presenter-motion-balance-validation-1.1',...validate(data)};
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.status === 'FAIL' ? 1 : 0;
}
