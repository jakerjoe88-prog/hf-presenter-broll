import fs from 'node:fs';
import path from 'node:path';
import {validateSpeechPlan} from './validate-speech-plan.mjs';
const args=process.argv.slice(2);
const at=args.indexOf('--text');
const text=at>=0?args[at+1]:'';
const inputAt=args.indexOf('--input'),input=inputAt>=0?args[inputAt+1]:null;
if(input){
  try{
    const dir=path.dirname(path.resolve(input)),plan=JSON.parse(fs.readFileSync(input,'utf8'));
    const result=validateSpeechPlan(plan,{dir});
    if(result.errors.length){console.log(JSON.stringify({status:'CONTEXT_BLOCKED',...result},null,2));process.exitCode=1;}
    else {
      const data=JSON.parse(fs.readFileSync(path.join(import.meta.dirname,'../references/visual-motion-recipes.json'),'utf8'));
      console.log(JSON.stringify({status:'CONTEXT_CANDIDATES_ONLY',topic:plan.narration.topic,beats:plan.beats.map(b=>{
        const query=[b.semantic.viewer_goal,b.broll_decision.subject,b.broll_decision.action,...b.semantic.referents.map(r=>r.description)].filter(Boolean).join(' ');
        const normalized=query.toLowerCase().replace(/\s+/g,'');
        return {beat_id:b.beat_id,utterance:b.utterance,query,broll_mode:b.broll_decision.mode,candidates:b.broll_decision.mode==='NONE'?[]:data.recipes.map(r=>({...r,matched_triggers:r.triggers.filter(t=>normalized.includes(t.toLowerCase()))})).filter(r=>r.matched_triggers.length).sort((a,b)=>b.matched_triggers.length-a.matched_triggers.length).slice(0,4)};
      }),warnings:result.warnings,scope:'Lexical retrieval from a context-bound plan; relevance still requires independent review.'},null,2));
    }
  }catch(e){console.error(e.message);process.exitCode=2;}
}else {
if(!text?.trim()) { console.error('Usage: node plan-visuals.mjs --input <VISUAL_PLAN.json>; --text is discovery only'); process.exit(2); }
const data=JSON.parse(fs.readFileSync(path.join(import.meta.dirname,'../references/visual-motion-recipes.json'),'utf8'));
const normalized=text.toLowerCase().replace(/\s+/g,'');
const candidates=data.recipes.map(r=>({...r,matched_triggers:r.triggers.filter(t=>normalized.includes(t.toLowerCase()))}))
  .filter(r=>r.matched_triggers.length).sort((a,b)=>b.matched_triggers.length-a.matched_triggers.length).slice(0,4);
console.log(JSON.stringify({status:'CONTEXT_REQUIRED',utterance:text,
  decision_required:'Agent must check full meaning, negation, authentic carrier, duration, safe zones and narration anchors; lexical hits are not final selection.',
  presenter_decision_required:'Before layout, assess relevant assets, reading space and presenter value. Choose FULL_FRAME, CONTENT_ONLY, CIRCLE_PIP, RECT_PIP or SPLIT using references/presenter-visibility-routing.md. Talking-head input does not require an always-visible presenter. Preserve source audio when hiding the presenter.',
  fallback:candidates.length?null:'Review meaning; choose authentic asset, native HF, presenter or justified reading hold. Do not force an unrelated effect.',
  candidates,scope:'Standalone sentence discovery cannot qualify a production visual.'},null,2));
}
