import fs from 'node:fs';
import path from 'node:path';
import {validateSpeechPlan} from './validate-speech-plan.mjs';
export function validate(plan,{stage='planning',dir=process.cwd(),anchors=null,anchorDetails=null,beatIds=null,director=null,sourceMedia=null,assetManifest=null}={}) {
  const errors=[];
  const speech=validateSpeechPlan(plan,{dir,director,sourceMedia});errors.push(...speech.errors);
  const nonempty=x=>typeof x==='string'&&x.trim().length>0;
  if(!['planning','production'].includes(stage)) errors.push('Unknown stage');
  const recipes=JSON.parse(fs.readFileSync(path.join(import.meta.dirname,'../references/visual-motion-recipes.json'),'utf8')).recipes;
  const recipeIds=new Set([...recipes.map(x=>x.id),'presenter','reading-hold','native-custom']);
  const beats=Array.isArray(plan?.beats)?plan.beats:[];
  if(!beats.length) errors.push('Empty visual plan');
  const ids=new Set();
  for(const b of beats) {
    if(!b||typeof b!=='object'){errors.push('Invalid beat');continue;}
    if(!nonempty(b.beat_id)||ids.has(b.beat_id)) errors.push('Missing/duplicate beat_id');
    ids.add(b.beat_id);
    for(const key of ['utterance','purpose','carrier','reading_focus','presenter_handoff','reference_optimization'])
      if(!nonempty(b[key])) errors.push(`${b.beat_id}: missing ${key}`);
    if(!recipeIds.has(b.recipe_id))errors.push(`${b.beat_id}: unknown recipe`);
    const zones=Object.values(b.safe_zones??{});
    if(!zones.length)errors.push(`${b.beat_id}: no measured safety zones`);
    for(const z of zones)if(!Array.isArray(z)||z.length!==4||!z.every(n=>Number.isFinite(n)&&n>=0&&n<=1)||z[0]>=z[2]||z[1]>=z[3])errors.push(`${b.beat_id}: invalid normalized safe zone`);
    if((!Array.isArray(b.events)||new Set(b.events.filter(nonempty)).size<3)&&!nonempty(b.hold_reason))errors.push(`${b.beat_id}: missing semantic evolution or hold reason`);
    if(!Array.isArray(b.assets)) {errors.push(`${b.beat_id}: assets must be an array`);continue;}
    if(!b.assets.length&&!['presenter','reading-hold','native-custom'].includes(b.recipe_id))errors.push(`${b.beat_id}: recipe requires actual carrier assets`);
    const assetIds=new Set();
    for(const a of b.assets) {
      if(!a||typeof a!=='object'){errors.push(`${b.beat_id}: invalid asset`);continue;}
      if(!nonempty(a.id)||assetIds.has(a.id))errors.push(`${b.beat_id}: missing/duplicate asset id`);assetIds.add(a.id);
      if(!['CAPTURE','NATIVE','GENERATE','USER_REQUIRED'].includes(a.kind))errors.push(`${a.id}: unknown asset kind`);
      if(!['EVIDENCE','ILLUSTRATION'].includes(a.role))errors.push(`${a.id}: unknown asset role`);
      if(!nonempty(a.source))errors.push(`${a.id}: missing provenance`);
      if(assetManifest){
        const registered=assetManifest.assets?.find(x=>x.id===a.id);
        if(!registered)errors.push(`${a.id}: missing asset manifest registration`);
        else if(a.path&&(!registered.path||path.resolve(dir,a.path)!==path.resolve(dir,registered.path)))errors.push(`${a.id}: manifest path differs`);
      }
      if(a.kind==='GENERATE') {
        if(a.role==='EVIDENCE')errors.push(`${a.id}: generated image cannot prove real results`);
        for(const k of ['referent','composition','motion_room','prompt'])if(!nonempty(a.generation?.[k]))errors.push(`${a.id}: missing generation ${k}`);
        for(const k of ['layers','native_overlays'])if(!Array.isArray(a.generation?.[k])||!a.generation[k].length)errors.push(`${a.id}: missing generation ${k}`);
      }
      if(stage==='production') {
        if(a.kind==='NATIVE') {if(a.status!=='PLANNED_NATIVE'||!nonempty(a.native_spec))errors.push(`${a.id}: native asset needs implementation spec`);}
        else {
          if(a.status!=='READY'||!nonempty(a.path))errors.push(`${a.id}: asset is not ready`);
          else {try {if(!fs.statSync(path.resolve(dir,a.path)).isFile())errors.push(`${a.id}: not a file`);}catch{errors.push(`${a.id}: missing asset file`);}}
        }
      }
    }
    if(stage==='production') {
      if(!Array.isArray(b.anchor_ids)||!b.anchor_ids.length)errors.push(`${b.beat_id}: missing anchor references`);
      else for(const id of b.anchor_ids)if(!anchors?.has(id))errors.push(`${b.beat_id}: unknown anchor ${id}`);
      for(const r of b.semantic?.referents||[]){
        if(!anchors?.has(r.anchor_id)||!b.anchor_ids?.includes(r.anchor_id))errors.push(`${b.beat_id}: referent needs its own real word anchor`);
        const word=anchorDetails?.get(r.anchor_id)?.text;
        if(word&&!(word.includes(r.phrase)||r.phrase.includes(word)))errors.push(`${b.beat_id}: referent anchor text differs from quote`);
      }
      if(!beatIds?.has(b.beat_id))errors.push(`${b.beat_id}: unknown director beat`);
    }
  }
  if(stage==='production')for(const id of beatIds??[])if(!ids.has(id))errors.push(`${id}: missing visual plan`);
  return {status:errors.length?'BLOCKED':'STRUCTURAL_PASS',stage,errors,warnings:speech.warnings,scope:'Pre-code structural checks; PLANNED_NATIVE is not implemented or rendered evidence.'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)) {
  try {
    const args=process.argv.slice(2),get=(k,d)=>args.includes(k)?args[args.indexOf(k)+1]:d;
    const input=get('--input');if(!input)throw new Error('Pass --input <VISUAL_PLAN.json> [--stage planning|production]');
    const dir=path.dirname(path.resolve(input)),stage=get('--stage','planning');
    const read=name=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
    const result=validate(JSON.parse(fs.readFileSync(input,'utf8')),{dir,stage,
      anchors:stage==='production'?new Set(read('TRANSCRIPT_WORD_ANCHORS.json').anchors.map(a=>a.anchor_id)):null,
      anchorDetails:stage==='production'?new Map(read('TRANSCRIPT_WORD_ANCHORS.json').anchors.map(a=>[a.anchor_id,a])):null,
      beatIds:stage==='production'?new Set(read('TARGET_DIRECTOR_DECISIONS.json').micro_beats.map(b=>b.id)):null,
      director:stage==='production'?read('TARGET_DIRECTOR_DECISIONS.json'):null,
      sourceMedia:stage==='production'?read('WORKFLOW_STATE.json').source_media:null,
      assetManifest:stage==='production'?read('ASSET_MANIFEST.json'):null});
    console.log(JSON.stringify(result,null,2));process.exitCode=result.errors.length?1:0;
  }catch(error){console.error(error.message);process.exitCode=2;}
}
