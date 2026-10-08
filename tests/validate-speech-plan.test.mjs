import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {sha256,validateSpeechPlan} from '../scripts/validate-speech-plan.mjs';
import {validateDeliveryEvidence} from '../scripts/validate-delivery-evidence.mjs';
import {validate as validateVisualPlan} from '../scripts/validate-visual-plan.mjs';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'speech 中文 '));
const raw='这是口播剪辑。效果是这样。';fs.writeFileSync(path.join(dir,'transcript.txt'),raw);
fs.writeFileSync(path.join(dir,'index.html'),'<div id="broll-operation">actual native object fixture</div>');
fs.writeFileSync(path.join(dir,'render.bin'),'synthetic fixture, not a video');
for(const frame of [20,40])fs.writeFileSync(path.join(dir,`frame${frame}.bin`),`synthetic ${frame}, not visual evidence`);
const native={id:'operation',kind:'NATIVE',native_spec:'Select and remove an unwanted take',source:'Synthetic fixture',role:'ILLUSTRATION'};
const beat=(id,start,end,utterance,from,to)=>({beat_id:id,utterance,semantic:{source_span:{start:from,end:to},function:'EXAMPLE',viewer_goal:'Understand editing change',topic_relation:'Illustrates the full-video editing topic',referents:[]},assets:[structuredClone(native)],broll_decision:{mode:'SUPPORT',purpose:'PROCESS',reason:'Keep narrator while showing the action',subject:'Timeline segment',action:'Select and remove unwanted take',expected_change:'Gap closes and output becomes shorter',asset_ids:['operation'],frames:{start,end},min_read_frames:15}});
const plan={schema_version:'2.0',narration:{path:'transcript.txt',sha256:sha256(raw),topic:'口播剪辑',topic_span:{start:0,end:7}},beats:[beat('b1',0,60,raw.slice(0,7),0,7),beat('b2',60,120,raw.slice(7),7,raw.length)]};
plan.beats[1].semantic.referents=[{phrase:'这样',span:{start:10,end:12},status:'PLANNED',target_beat_id:'b1',asset_ids:['operation'],description:'The preceding talking-head editing result'}];
const director={micro_beats:plan.beats.map((b,i)=>({id:b.beat_id,start_frame:i*60,end_frame:(i+1)*60,presenter_visibility:{treatment:'FULL_FRAME'}}))};
const run=p=>validateSpeechPlan(p,{dir,director,sourceMedia:'source.mp4'});
assert.deepEqual(run(plan).errors,[]);
const production=structuredClone(plan);
for(const b of production.beats){Object.assign(b,{purpose:'Synthetic fixture',recipe_id:'native-custom',carrier:'Native workspace',reading_focus:'Object state',safe_zones:{subtitles:[.1,.85,.9,.98]},presenter_handoff:'Retain',reference_optimization:'Fixture only',events:['input','select','result'],anchor_ids:['a1','this1']});for(const a of b.assets)a.status='PLANNED_NATIVE';}
production.beats[1].semantic.referents[0].anchor_id='this1';
const pOpts={stage:'production',dir,director,anchors:new Set(['a1','this1']),anchorDetails:new Map([['a1',{text:'口播'}],['this1',{text:'这样'}]]),beatIds:new Set(['b1','b2'])};
assert.deepEqual(validateVisualPlan(production,pOpts).errors,[]);
for(const id of [undefined,'a1']){const bad=structuredClone(production);bad.beats[1].semantic.referents[0].anchor_id=id;assert(validateVisualPlan(bad,pOpts).errors.length,'Missing or unrelated referent word anchor must block');}
let count=0;
for(const [label,mutate] of [
 ['old schema',p=>p.schema_version='1.0'],
 ['changed transcript digest',p=>p.narration.sha256='f'.repeat(64)],
 ['wrong quote span',p=>p.beats[0].semantic.source_span.end=6],
 ['missing whole-video relation',p=>p.beats[0].semantic.topic_relation=''],
 ['unresolved referent',p=>p.beats[1].semantic.referents=[]],
 ['made-up referent target',p=>p.beats[1].semantic.referents[0].target_beat_id='camera'],
 ['unknown referent asset',p=>p.beats[1].semantic.referents[0].asset_ids=['lens']],
 ['missing presenter B-roll decision',p=>delete p.beats[0].broll_decision],
 ['range outside beat',p=>p.beats[0].broll_decision.frames.end=61],
 ['unreadable time budget',p=>p.beats[0].broll_decision.min_read_frames=90],
 ['illustration passed off as proof',p=>p.beats[0].broll_decision.purpose='PROOF'],
 ['source video passed off as B-roll',p=>p.beats[0].assets[0].path='source.mp4'],
 ['hidden presenter labelled support',p=>p.beats[0].broll_decision.mode='CONTENT_TAKEOVER']
 ]){const p=structuredClone(plan);mutate(p);assert.ok(run(p).errors.length,label);count++;}
const pure=structuredClone(plan);pure.beats[0].broll_decision={mode:'NONE',purpose:'EMOTION',reason:'Expression carries the emotional turn',hold_subject:'Speaker reaction',asset_ids:[]};assert.deepEqual(run(pure).errors,[]);
const ref=file=>({path:file,sha256:sha256(fs.readFileSync(path.join(dir,file)))});
const report={render:ref('render.bin'),usages:plan.beats.map(b=>({beat_id:b.beat_id,asset_id:'operation',start_frame:b.broll_decision.frames.start,end_frame:b.broll_decision.frames.end,native_spec_sha256:sha256(native.native_spec),implementation:{...ref('index.html'),object_id:'broll-operation'},frames:[{...ref('frame20.bin'),frame:b.broll_decision.frames.start+20},{...ref('frame40.bin'),frame:b.broll_decision.frames.start+40}],observation:{viewer_effect:'Synthetic placeholder, not verified',status:'UNVERIFIED'}}))};
assert.equal(validateDeliveryEvidence(plan,report,{dir,director}).status,'EVIDENCE_LINKS_PASS');
for(const [label,mutate] of [
 ['unimplemented object',r=>r.usages[0].implementation.object_id='missing'],
 ['missing rendered usage',r=>r.usages.pop()],
 ['changed native plan',r=>r.usages[0].native_spec_sha256='bad'],
 ['invented frame file',r=>r.usages[0].frames[0].path='missing.png'],
 ['frame outside usage',r=>r.usages[0].frames[0].frame=61],
 ['changed render',r=>r.render.sha256='bad'],
 ['unattributed review',r=>r.usages[0].observation.status='REVIEWED']
 ]){const r=structuredClone(report);mutate(r);assert.equal(validateDeliveryEvidence(plan,r,{dir,director}).status,'BLOCKED',label);count++;}
console.log(JSON.stringify({status:'PASS',negative_cases:count,production_anchor_negative_cases:2,positive_cases:['context-bound planned referent','justified pure presenter','evidence hashes explicitly not visual PASS'],fixture:dir,scope:'Synthetic contract checks only; no generated media or runtime rendering'}));
