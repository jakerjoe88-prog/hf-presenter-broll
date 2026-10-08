import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';
export const revision='36072d36e777a7de4604eacaa110342f80ae76eb';
export function validate(plan,state,words,director,dir){
  const errors=[],clips=Array.isArray(plan.clips)?plan.clips:[];
  const fail=(c,s)=>errors.push(`${c.id||'?'}: ${s}`);
  if(plan.schema_version!==1||!clips.length)errors.push('Nonempty schema_version 1 plan required');
  const ids=new Set(),outputs=new Set();let end=-1;
  for(const c of clips){
    if(!c.id||ids.has(c.id))fail(c,'duplicate/missing id');ids.add(c.id);
    const b=director.micro_beats?.find(b=>b.id===c.beat_id);
    if(!b||c.start_frame<b.start_frame||c.end_frame>b.end_frame)fail(c,'unknown beat or range outside beat');
    if(!Number.isInteger(c.start_frame)||!Number.isInteger(c.end_frame)||c.start_frame<0||c.end_frame<=c.start_frame||c.start_frame<end)fail(c,'invalid/overlapping ordered range');end=c.end_frame;
    if(!Number.isInteger(c.fps)||c.fps<=0||c.fps!==state.fps||c.fps!==words.fps)fail(c,'unsupported/mismatched FPS');
    for(const k of ['width','height'])if(!Number.isInteger(c[k])||c[k]<=0||c[k]%2||c[k]!==state[k])fail(c,`invalid/mismatched ${k}`);
    if(!['CONTENT_ONLY','CIRCLE_PIP','RECT_PIP','SPLIT'].includes(c.presenter_mode)||c.presenter_mode!==b?.presenter_visibility?.treatment)fail(c,'presenter route mismatch');
    if(c.audio!=='NONE'||c.presenter_embedded!==false||c.subtitles_embedded!==false||c.alpha!==false)fail(c,'plate must be silent opaque content only');
    for(const k of ['carrier','entry_state','exit_state','comp','output'])if(typeof c[k]!=='string'||!c[k].trim())fail(c,`missing ${k}`);
    if(c.comp&&c.output&&path.resolve(dir,c.comp)===path.resolve(dir,c.output))fail(c,'output overwrites composition');
    if(c.output){const out=path.resolve(dir,c.output);if(outputs.has(out))fail(c,'duplicate output');outputs.add(out);}
    if(!Array.isArray(c.evolution)||c.evolution.length<2||c.evolution.some(x=>typeof x!=='string'||!x.trim()))fail(c,'two semantic changes required');
    if(!Array.isArray(c.assets)||!c.assets.length)fail(c,'source assets/specifications required');
    for(const a of c.assets||[])if(!a.path||!a.source||!fs.existsSync(path.resolve(dir,a.path)))fail(c,'missing local source asset/provenance');
    const zones=Array.isArray(c.safe_zones)?c.safe_zones:[];
    if(!zones.some(z=>z.role==='SUBTITLE')||(c.presenter_mode!=='CONTENT_ONLY'&&!zones.some(z=>z.role==='PRESENTER')))fail(c,'missing subtitle/presenter safe zone');
    for(const z of zones)if(![z.x,z.y,z.w,z.h].every(Number.isFinite)||z.x<0||z.y<0||z.w<=0||z.h<=0||z.x+z.w>c.width||z.y+z.h>c.height)fail(c,'safe zone outside canvas');
    const expected=(words.anchors||[]).filter(a=>a.onset_frame>=c.start_frame&&a.onset_frame<c.end_frame);
    const actual=Array.isArray(c.anchors)?c.anchors:[];
    if(actual.length!==expected.length||new Set(actual.map(a=>a.anchor_id)).size!==actual.length)fail(c,'anchor set mismatch');
    for(const a of expected)if(!actual.some(x=>x.anchor_id===a.anchor_id&&x.local_frame===a.onset_frame-c.start_frame))fail(c,`anchor offset mismatch: ${a.anchor_id}`);
  }
  return errors;
}
export function mediaErrors(c,probe){
  const v=probe.streams?.filter(s=>s.codec_type==='video')||[],errors=[];
  const rate=s=>{const [a,b=1]=String(s).split('/').map(Number);return a/b;};
  if(v.length!==1)errors.push('Expected one video stream');
  const s=v[0]||{};
  if(s.width!==c.width||s.height!==c.height)errors.push('Dimensions differ');
  if(rate(s.avg_frame_rate)!==c.fps||rate(s.r_frame_rate)!==c.fps)errors.push('FPS differs');
  if(Number(s.nb_read_frames)!==c.end_frame-c.start_frame)errors.push('Frame count differs');
  if(probe.streams?.some(s=>s.codec_type==='audio'))errors.push('Unexpected audio');
  return errors;
}
export function renderArgs(c,dir,provider){return [path.join(provider,'scripts','render.py'),path.resolve(dir,c.comp),'--out',path.resolve(dir,c.output),'--fps',String(c.fps),'--width',String(c.width),'--height',String(c.height),'--scale','1','--workers','1','--shutter','0','--dur',String((c.end_frame-c.start_frame)/c.fps)];}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const [mode,project,provider]=process.argv.slice(2);
    if(!['preflight','job','verify'].includes(mode)||!project)throw Error('Usage: onetake-contract.mjs preflight <project> | job <project> <provider> | verify <project>');
    const dir=path.resolve(project),read=n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8'));
    if(mode==='preflight'){
      const config=read('.hf-setup/onetake.json'),checks=[];
      const check=(name,exe,args)=>{const r=spawnSync(exe,args,{encoding:'utf8'});checks.push({name,status:r.status===0?'PASS':'BLOCKED',detail:r.error?.message||r.stderr?.trim()||r.stdout?.trim()});return r;};
      const root=path.resolve(dir,config.provider_root),python=config.python||'python';
      const git=check('provider revision','git',['-C',root,'rev-parse','HEAD']);
      if(git.stdout?.trim()!==revision)checks.push({name:'pinned revision',status:'BLOCKED'});
      const dirty=check('provider working tree','git',['-C',root,'status','--porcelain']);
      if(dirty.stdout?.trim())checks.push({name:'modified provider',status:'BLOCKED'});
      check('python renderer dependencies',python,['-c','import numpy; from PIL import Image; import playwright.sync_api; print("imports available")']);
      check('Chromium launch',python,['-c','from playwright.sync_api import sync_playwright\nwith sync_playwright() as p:\n b=p.chromium.launch(headless=True)\n b.close()\n print("launch verified")']);
      for(const exe of ['ffmpeg','ffprobe'])check(exe,exe,['-version']);
      const blocked=checks.some(c=>c.status==='BLOCKED');
      console.log(JSON.stringify({status:blocked?'BLOCKED':'ENVIRONMENT_READY',checked_at:new Date().toISOString(),checks,scope:'Environment only; Windows file URL, deterministic seek and actual renderer unverified'},null,2));process.exitCode=blocked?1:0;
    }else{
    const plan=read('ONETAKE_PLAN.json'),errors=validate(plan,read('WORKFLOW_STATE.json'),read('TRANSCRIPT_WORD_ANCHORS.json'),read('TARGET_DIRECTOR_DECISIONS.json'),dir);
    if(errors.length)throw Error(errors.join('\n'));
    if(mode==='job'){
      if(!provider)throw Error('Provider path required');
      const config=read('.hf-setup/onetake.json');
      if(path.resolve(dir,config.provider_root)!==path.resolve(provider))throw Error('Provider differs from project configuration');
      const root=path.resolve(provider),git=(...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8'}).trim();
      if(git('rev-parse','HEAD')!==revision||git('status','--porcelain'))throw Error('Provider revision mismatch or modified checkout');
      execFileSync(process.execPath,[path.join(path.dirname(fileURLToPath(import.meta.url)),'validate-project.mjs'),'--dir',dir],{stdio:'pipe'});
      execFileSync(process.execPath,[fileURLToPath(import.meta.url),'preflight',dir],{stdio:'pipe'});
      for(const c of plan.clips)if(!fs.existsSync(path.resolve(dir,c.comp)))throw Error(`Missing composition: ${c.id}`);
      for(const c of plan.clips)if(fs.existsSync(path.resolve(dir,c.output)))throw Error('Choose a new output path; existing plate preserved');
      console.log(JSON.stringify({status:'JOB_PREPARED_NOT_RENDERED',revision,jobs:plan.clips.map(c=>({id:c.id,executable:config.python||'python',args:renderArgs(c,dir,root)})),note:'Environment checked; actual renderer and visual verification still required.'},null,2));
    }else{
      for(const c of plan.clips){const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-show_streams','-of','json',path.resolve(dir,c.output)],{encoding:'utf8'}));errors.push(...mediaErrors(c,probe).map(e=>`${c.id}: ${e}`));}
      console.log(JSON.stringify({status:errors.length?'BLOCKED':'MEDIA_PASS',errors,scope:'Media metadata only; visual and anchor-frame review still required'},null,2));process.exitCode=errors.length?1:0;
    }
    }
  }catch(e){console.error(e.message);process.exitCode=1;}
}
