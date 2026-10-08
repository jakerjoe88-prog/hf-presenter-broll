import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {sha256} from './validate-speech-plan.mjs';
export function validateDeliveryEvidence(plan,report,{dir=process.cwd(),director}={}){
  const errors=[],checked=new Map();
  const check=(ref,label)=>{
    try{
      if(!ref?.path||!ref.sha256)throw Error('path and SHA256 required');
      const file=path.resolve(dir,ref.path),bytes=fs.readFileSync(file);
      if(sha256(bytes)!==ref.sha256)throw Error('digest differs');checked.set(file,bytes);return bytes;
    }catch(e){errors.push(`${label}: ${e.message}`);return null;}
  };
  check(report?.render,'render');
  const rows=Array.isArray(report?.usages)?report.usages:[],ds=new Map((director?.micro_beats||[]).map(b=>[b.id,b]));
  const expected=new Set();
  for(const b of plan.beats||[]){
    const br=b.broll_decision;if(!br||br.mode==='NONE')continue;
    for(const id of br.asset_ids||[]){
      const key=`${b.beat_id}/${id}`;expected.add(key);
      const matches=rows.filter(u=>u.beat_id===b.beat_id&&u.asset_id===id);
      if(matches.length!==1){errors.push(`${key}: exactly one usage record required`);continue;}
      const u=matches[0],asset=b.assets?.find(a=>a.id===id),d=ds.get(b.beat_id);
      if(u.start_frame!==br.frames.start||u.end_frame!==br.frames.end)errors.push(`${key}: usage range differs from reviewed plan`);
      if(d&&(u.start_frame<d.start_frame||u.end_frame>d.end_frame))errors.push(`${key}: usage outside beat`);
      if(asset?.kind==='NATIVE'){
        if(!u.native_spec_sha256||u.native_spec_sha256!==sha256(asset.native_spec||''))errors.push(`${key}: native specification changed`);
      }else if(asset?.path){check({path:asset.path,sha256:u.asset_sha256},`${key} source`);}
      const impl=check(u.implementation,`${key} implementation`);
      // Check a stable named DOM object, not an arbitrary prose claim of implementation.
      const token=u.implementation?.object_id;
      if(typeof token!=='string'||!/^[A-Za-z][\w:-]*$/.test(token)||!impl?.toString('utf8').includes(`id="${token}"`))errors.push(`${key}: named implementation object not found`);
      const frames=Array.isArray(u.frames)?u.frames:[];
      if(frames.length<2||new Set(frames.map(f=>f.frame)).size<2)errors.push(`${key}: at least two distinct actual-output frame references required`);
      for(const f of frames){
        check(f,`${key} frame`);
        if(!Number.isInteger(f.frame)||f.frame<u.start_frame||f.frame>=u.end_frame)errors.push(`${key}: evidence frame outside usage`);
      }
      if(!u.observation?.viewer_effect||!['FIX_REQUIRED','UNVERIFIED','REVIEWED'].includes(u.observation?.status))errors.push(`${key}: explicit observation and status required`);
      if(u.observation?.status==='REVIEWED'&&(!u.observation.evaluator||!u.observation.review_basis))errors.push(`${key}: reviewed claim lacks evaluator/basis`);
    }
  }
  for(const u of rows)if(!expected.has(`${u.beat_id}/${u.asset_id}`))errors.push('Unexpected usage record');
  return {status:errors.length?'BLOCKED':'EVIDENCE_LINKS_PASS',errors,scope:'Hashes and references only. Files/frames can be mislabelled; no automatic proof of visibility, semantic relevance, utility or full playback. Human review remains mandatory.'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const at=process.argv.indexOf('--dir');if(at<0||!process.argv[at+1])throw Error('Usage: validate-delivery-evidence.mjs --dir <project>');
    const dir=path.resolve(process.argv[at+1]),read=n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8'));
    const report=validateDeliveryEvidence(read('VISUAL_PLAN.json'),read('BROLL_DELIVERY_EVIDENCE.json'),{dir,director:read('TARGET_DIRECTOR_DECISIONS.json')});
    console.log(JSON.stringify(report,null,2));process.exitCode=report.errors.length?1:0;
  }catch(e){console.error(e.message);process.exitCode=2;}
}
