import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
export const sha256=data=>createHash('sha256').update(data).digest('hex');
const text=x=>typeof x==='string'&&!!x.trim();
export function validateSpeechPlan(plan,{dir=process.cwd(),director=null,sourceMedia=null}={}){
  const errors=[],warnings=[],beats=Array.isArray(plan?.beats)?plan.beats:[];
  const add=(id,msg)=>errors.push(`${id}: ${msg}`);
  if(plan?.schema_version!=='2.0')errors.push('VISUAL_PLAN schema_version 2.0 required; migrate explicitly, do not mark old plans verified.');
  const n=plan?.narration;let transcript='';
  try{
    if(!text(n?.path)||!text(n?.sha256))throw Error('transcript path and SHA256 required');
    const bytes=fs.readFileSync(path.resolve(dir,n.path));
    if(sha256(bytes)!==n.sha256)throw Error('transcript digest differs');
    transcript=bytes.toString('utf8');
  }catch(e){errors.push(`narration: ${e.message}`);}
  if(!text(n?.topic))errors.push('narration: whole-video topic required');
  const span=s=>s&&Number.isInteger(s.start)&&Number.isInteger(s.end)&&s.start>=0&&s.end>s.start&&s.end<=transcript.length;
  if(!span(n?.topic_span))errors.push('narration: topic source span required');
  const map=new Map(beats.map(b=>[b.beat_id,b])),ds=new Map((director?.micro_beats||[]).map(b=>[b.id,b]));
  let previous=0;
  for(const b of beats){
    const id=b.beat_id,s=b.semantic,d=ds.get(id),br=b.broll_decision;
    if(!span(s?.source_span)||transcript.slice(s?.source_span?.start,s?.source_span?.end)!==b.utterance)add(id,'utterance must equal cited transcript span');
    if(span(s?.source_span)){if(s.source_span.start<previous)add(id,'transcript spans overlap or run backwards');previous=s.source_span.end;}
    if(!['CLAIM','EVIDENCE','STEP','EXAMPLE','JUDGMENT','TRANSITION','CTA'].includes(s?.function))add(id,'sentence function required');
    if(!text(s?.viewer_goal)||!text(s?.topic_relation))add(id,'viewer goal and relation to whole topic required');
    const assets=Array.isArray(b.assets)?b.assets:[],assetMap=new Map(assets.map(a=>[a.id,a]));
    const refs=Array.isArray(s?.referents)?s.referents:[];
    for(const match of String(b.utterance||'').matchAll(/这样|那个|这个效果|这些效果/g)){
      const start=(s?.source_span?.start??0)+match.index;
      if(!refs.some(r=>r.phrase===match[0]&&r.span?.start===start&&r.span?.end===start+match[0].length))add(id,`unmapped referent at transcript ${start}: ${match[0]}`);
    }
    for(const r of refs){
      if(!span(r.span)||transcript.slice(r.span?.start,r.span?.end)!==r.phrase)add(id,'referent quote/span mismatch');
      if(!span(s?.source_span)||r.span?.start<s.source_span.start||r.span?.end>s.source_span.end)add(id,'referent outside sentence');
      if(!['EXISTING','PLANNED'].includes(r.status)||!map.has(r.target_beat_id)||!text(r.description))add(id,'referent unresolved or unknown target');
      const target=map.get(r.target_beat_id);
      if(!Array.isArray(r.asset_ids)||!r.asset_ids.length||r.asset_ids.some(a=>!target?.assets?.some(x=>x.id===a)))add(id,'referent must point to declared target assets, not a free-text effect');
    }
    if(!['SUPPORT','CUTAWAY','CONTENT_TAKEOVER','NONE'].includes(br?.mode))add(id,'explicit B-roll decision required, including presenter beats');
    for(const k of ['purpose','reason'])if(!text(br?.[k]))add(id,`B-roll ${k} required`);
    if(!['INFORMATION','PROOF','PROCESS','COMPARISON','EMOTION','RHYTHM','IDENTITY'].includes(br?.purpose))add(id,'B-roll purpose invalid');
    if(br?.mode==='NONE'){
      if(br?.asset_ids?.length)add(id,'NONE cannot claim supplemental assets');
      if(!text(br?.hold_subject))add(id,'pure presenter/reading hold requires the specific subject to hold');
    }else{
      if(!text(br?.subject)||!text(br?.action)||!text(br?.expected_change))add(id,'B-roll subject, action and expected viewer-visible change required');
      if(!Array.isArray(br?.asset_ids)||!br.asset_ids.length||br.asset_ids.some(a=>!assetMap.has(a)))add(id,'supplemental asset references missing');
      for(const a of br?.asset_ids||[]){
        const asset=assetMap.get(a);
        if(br?.purpose==='PROOF'&&asset?.role!=='EVIDENCE')add(id,'illustration cannot fulfil a proof purpose');
        if(sourceMedia&&asset?.path&&path.resolve(dir,asset.path)===path.resolve(dir,sourceMedia))add(id,'whole presenter source is not supplemental B-roll; register the actual extracted object');
      }
      const f=br?.frames;
      if(!f||!Number.isInteger(f.start)||!Number.isInteger(f.end)||f.start<0||f.end<=f.start)add(id,'B-roll frame range invalid');
      if(d&&f&&(f.start<d.start_frame||f.end>d.end_frame))add(id,'B-roll outside parent beat');
      if(!Number.isInteger(br?.min_read_frames)||br.min_read_frames<1||br.min_read_frames>(f?.end-f?.start))add(id,'reading budget invalid');
      const mode=d?.presenter_visibility?.treatment;
      if(d&&br?.mode==='CONTENT_TAKEOVER'&&mode!=='CONTENT_ONLY')add(id,'content takeover requires hidden presenter');
      if(d&&br?.mode==='SUPPORT'&&mode==='CONTENT_ONLY')add(id,'support cannot describe content-only composition');
    }
    if(br?.mode==='NONE')warnings.push(`${id}: hold rationale needs human review; no minimum B-roll quota.`);
  }
  warnings.push('Span, digest and reference checks do not prove transcript authenticity, semantic relevance, utility or visual quality.');
  return {errors,warnings};
}
