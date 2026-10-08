import fs from 'node:fs';
import path from 'node:path';
import {validate as validateVisualPlan} from './validate-visual-plan.mjs';
import {validateReviewEvidence} from './validate-review-evidence.mjs';
import {validate as validatePresenter} from './validate-presenter-motion-balance.mjs';
import {validate as validateOnetake} from './onetake-contract.mjs';
const args=process.argv.slice(2),i=args.indexOf('--dir');
if(i<0||!args[i+1]){console.error('Usage: node validate-project.mjs --dir <project>');process.exit(2);}
const dir=path.resolve(args[i+1]),errors=[];
const read=name=>{try{return JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));}catch(e){errors.push(`${name}: ${e.message}`);return {};}};
const state=read('WORKFLOW_STATE.json'),words=read('TRANSCRIPT_WORD_ANCHORS.json'),motion=read('MOTION_ACTION_MANIFEST.json'),director=read('TARGET_DIRECTOR_DECISIONS.json'),plan=read('SHOTCRAFT_COVERAGE_PLAN.json');
const setup=read('.hf-setup/preflight.json');
const setupAge=Date.now()-Date.parse(setup.checked_at);
if(setup.status!=='READY_FOR_PRODUCTION'||!(setupAge>=0&&setupAge<=86400000)||path.resolve(setup.paths?.workspace||'.')!==dir)errors.push('Setup gate missing, stale, wrong workspace or not ready.');
for(const key of ['node','npm','ffmpeg','ffprobe','workspace','hyperframes','hyperframes-core','hyperframes-cli','browser','word_alignment'])if(setup.checks?.[key]?.status!=='VERIFIED')errors.push(`Setup requirement not verified: ${key}`);
for(const flag of ['ratio_confirmed','duration_confirmed','style_confirmed','production_approved']) if(state[flag]!==true)errors.push(`Approval missing: ${flag}`);
errors.push(...validateReviewEvidence(dir,state,read('REVIEW_EVIDENCE.json')));
const presenterReport=validatePresenter(director);
errors.push(...presenterReport.errors);
if(!String(state.approval_basis||'').trim())errors.push('Missing actual conversation approval_basis.');
const fps=Number(words.fps),duration=Number(words.duration_sec);
if(!(fps>0&&duration>0))errors.push('Invalid fps/duration.');
if(!Number.isFinite(state.duration_sec)||Math.abs(Number(state.duration_sec)-duration)>1/fps)errors.push('State duration differs from anchor timeline.');
if(state.fps!==fps)errors.push('State fps differs from anchors.');
if(typeof director.presenter_present!=='boolean')errors.push('Explicit presenter_present required.');
const anchors=Array.isArray(words.anchors)?words.anchors:[],beats=Array.isArray(director.micro_beats)?director.micro_beats:[],actions=Array.isArray(motion.actions)?motion.actions:[];
if(!anchors.length)errors.push('No word anchors.');if(!beats.length)errors.push('No micro beats.');if(!actions.length)errors.push('No actions.');
const unique=(arr,key,label)=>{const ids=arr.map(a=>a[key]);if(ids.some(x=>!x)||new Set(ids).size!==ids.length)errors.push(`Missing/duplicate ${label} IDs.`);};
unique(anchors,'anchor_id','anchor');unique(beats,'id','beat');unique(actions,'id','action');
const map=new Map(anchors.map(a=>[a.anchor_id,a])),beatMap=new Map(beats.map(b=>[b.id,b]));
const critical=a=>['NUMBER','PROPER_NOUN','TURN','CAUSE_EFFECT','CONCLUSION'].includes(a.type);
for(const a of anchors){
  const r=a.output_range,s=a.source_range;
  if(!r||!Number.isFinite(r.start)||!Number.isFinite(r.end)||r.start<0||r.end<=r.start||r.end>duration+1/fps)errors.push(`${a.anchor_id}: invalid output range`);
  if(!s||!Number.isFinite(s.start)||!Number.isFinite(s.end)||s.start<0||s.end<=s.start)errors.push(`${a.anchor_id}: invalid source range`);
  if(!Number.isInteger(a.onset_frame)||Math.abs(a.onset_frame-Math.round((r?.start??0)*fps))>1)errors.push(`${a.anchor_id}: onset frame mismatch`);
  if(!['WORD_LEVEL_ASR','MANUAL_VERIFIED'].includes(a.timing_source))errors.push(`${a.anchor_id}: real word timing required`);
  if(!(a.confidence>=0&&a.confidence<=1))errors.push(`${a.anchor_id}: invalid confidence`);
  if((a.confidence<0.85||a.script_audio_match!=='MATCHED')&&a.review_status!=='MANUAL_VERIFIED')errors.push(`${a.anchor_id}: manual review required`);
}
let previousEnd=0;
for(const b of beats){
  if(!Number.isInteger(b.start_frame)||!Number.isInteger(b.end_frame)||b.end_frame<=b.start_frame)errors.push(`${b.id}: invalid beat range`);
  if(b.start_frame!==previousEnd)errors.push(`${b.id}: gap/overlap in ordered beat coverage`);
  previousEnd=b.end_frame;
  if(!map.has(b.anchor_id))errors.push(`${b.id}: unknown anchor`);
  if(b.impact_score>=4&&['HOLD','NO_OP','NONE',null,undefined].includes(b.presenter_direction?.camera_action??b.presenter_camera_action)&&!b.hold_reason)errors.push(`${b.id}: high-impact beat needs response/hold_reason`);
}
if(Math.abs(previousEnd-Math.round(duration*fps))>1)errors.push('Beat coverage does not reach end.');
for(const a of actions){
  const anchor=map.get(a.anchor_id),beat=beatMap.get(a.beat_id);
  if(!anchor)errors.push(`${a.id}: unknown anchor`);if(!beat)errors.push(`${a.id}: unknown beat`);
  if(beat&&(a.hit_frame<beat.start_frame||a.hit_frame>=beat.end_frame||a.settle_frame>=beat.end_frame))errors.push(`${a.id}: action HIT/SETTLE outside parent beat`);
  if(beat&&a.prepare_frame<beat.start_frame&&!((a.cross_beat_preparation?.from_beat_id===beats.find(b=>b.end_frame===beat.start_frame)?.id)&&String(a.cross_beat_preparation?.reason||'').trim()))errors.push(`${a.id}: preparation crosses beat without explicit handoff`);
  if(![a.prepare_frame,a.hit_frame,a.settle_frame].every(Number.isInteger)||a.prepare_frame<0||a.prepare_frame>a.hit_frame||a.hit_frame>a.settle_frame||a.settle_frame>Math.ceil(duration*fps))errors.push(`${a.id}: invalid action phase range`);
  if(anchor&&Math.abs(a.hit_frame-anchor.onset_frame)>(critical(anchor)?3:5))errors.push(`${a.id}: HIT exceeds anchor tolerance`);
  if(a.semantic_payload_visible_before_hit!==false)errors.push(`${a.id}: pre-HIT payload not blocked`);
}
for(const a of anchors.filter(critical))if(!actions.some(x=>x.anchor_id===a.anchor_id))errors.push(`${a.anchor_id}: critical anchor has no action`);
const routing=Array.isArray(plan.beats)?plan.beats:[];
if(!routing.length)errors.push('Empty coverage plan.');
unique(routing,'id','routing');
for(const b of beats)if(!routing.some(r=>r.id===b.id))errors.push(`${b.id}: absent from coverage plan`);
for(const b of routing)if(!beatMap.has(b.id))errors.push(`${b.id}: routing references unknown beat`);
const eligible=routing.filter(x=>x.eligibility==='ELIGIBLE'||x.shotcraft_eligible===true),uncovered=eligible.filter(x=>!['SHOTCRAFT_PRIMARY','SHOTCRAFT_SUPPORT'].includes(x.decision));
for(const b of uncovered)if(!b.coverage_exception_reason)errors.push(`${b.id}: unexplained coverage exception`);
if(eligible.length&&(eligible.length-uncovered.length)/eligible.length<0.8){
  for(const b of uncovered)if(!(state.reviewed_exceptions||[]).includes(b.id))errors.push(`${b.id}: below-floor exception not reviewed`);
}
for(const name of ['HF_STORYBOARD_V1.md','SOURCE_TIMELINE_MAP.json','ASSET_MANIFEST.json'])if(!fs.existsSync(path.join(dir,name))||fs.statSync(path.join(dir,name)).size<3)errors.push(`Missing artifact: ${name}`);
const visualPlan=read('VISUAL_PLAN.json');
const timeline=read('SOURCE_TIMELINE_MAP.json'),segments=Array.isArray(timeline.segments)?timeline.segments:[];
if(!segments.length)errors.push('Source timeline mapping is empty');
let mapEnd=0;
for(const s of segments){
  if(![s.source_start,s.source_end,s.output_start,s.output_end].every(Number.isFinite)||s.source_start<0||s.source_end<=s.source_start||s.output_end<=s.output_start||Math.abs(s.output_start-mapEnd)>1e-6)errors.push(`${s.id}: invalid/gapped source mapping`);
  mapEnd=s.output_end;
}
if(Math.abs(mapEnd-duration)>1/fps)errors.push('Source mapping does not cover output duration');
for(const a of anchors){
  const s=segments.find(s=>a.output_range?.start>=s.output_start&&a.output_range?.end<=s.output_end);
  if(!s)errors.push(`${a.anchor_id}: no containing source mapping`);
  else {const scale=(s.source_end-s.source_start)/(s.output_end-s.output_start);for(const edge of ['start','end']){const expected=s.source_start+(a.output_range[edge]-s.output_start)*scale;if(Math.abs(expected-a.source_range?.[edge])>1/fps)errors.push(`${a.anchor_id}: source/output anchor ${edge} mapping differs`);}}
}
const visualResult=validateVisualPlan(visualPlan,{stage:'production',dir,anchors:new Set(anchors.map(a=>a.anchor_id)),anchorDetails:new Map(anchors.map(a=>[a.anchor_id,a])),beatIds:new Set(beats.map(b=>b.id)),director,sourceMedia:state.source_media,assetManifest:read('ASSET_MANIFEST.json')});
for(const b of beats.filter(b=>b.presenter_visibility?.treatment==='CONTENT_ONLY')) {
  const visual=visualPlan.beats?.find(v=>v.beat_id===b.id);
  if(!visual?.assets?.length)errors.push(`${b.id}: content-only requires registered visual assets or native implementation specifications.`);
}
errors.push(...visualResult.errors);
const onetakePath=path.join(dir,'ONETAKE_PLAN.json');
const usesOnetake=beats.some(b=>b.content_engine==='ONETAKE');
if(usesOnetake&&!fs.existsSync(onetakePath))errors.push('ONETAKE route missing ONETAKE_PLAN.json');
if(fs.existsSync(onetakePath)){
  const onetake=read('ONETAKE_PLAN.json');
  errors.push(...validateOnetake(onetake,state,words,director,dir));
  for(const b of beats.filter(b=>b.content_engine==='ONETAKE'))if(!onetake.clips?.some(c=>c.beat_id===b.id))errors.push(`${b.id}: missing onetake clip`);
}
console.log(JSON.stringify({status:errors.length?'BLOCKED':'STRUCTURAL_PASS',errors,warnings:presenterReport.warnings,presenter_frames:presenterReport.frames_by_treatment,scope:'Pre-code structural gate only; no ASR, source-truth, visual or render verification.'},null,2));
process.exitCode=errors.length?1:0;
