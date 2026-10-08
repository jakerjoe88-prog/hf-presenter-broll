import fs from 'node:fs';
import path from 'node:path';

const boxOK=b=>Array.isArray(b)&&b.length===4&&b.every(Number.isFinite)&&b[2]>b[0]&&b[3]>b[1];
export function validateCrop(p) {
  const errors=[],metrics=[];
  if(!(Number.isFinite(p.source_width)&&p.source_width>0&&Number.isFinite(p.source_height)&&p.source_height>0))errors.push('Invalid source dimensions');
  if(!['RECT','CIRCLE'].includes(p.shape))errors.push('Invalid mask shape');
  if(!Array.isArray(p.crop)||p.crop.length!==4||!p.crop.every(Number.isFinite)||p.crop[2]<=0||p.crop[3]<=0)errors.push('Invalid crop x/y/width/height');
  if(!Array.isArray(p.samples)||!p.samples.length)errors.push('Measured full-head samples required');
  if(errors.length)return {status:'BLOCKED',errors,metrics};
  const [x,y,w,h]=p.crop;
  if(p.shape==='CIRCLE'&&Math.abs(w/h-1)>0.001)errors.push('Circle crop must be square');
  if(!(p.target_aspect>0)||Math.abs(w/h-p.target_aspect)>0.001)errors.push('Crop/target aspect mismatch; stretching forbidden');
  if((x<0||y<0||x+w>p.source_width||y+h>p.source_height)&&p.padding!=='SOLID_BACKGROUND')errors.push('Crop outside source requires declared solid padding');
  let prev=-1;
  for(const s of p.samples) {
    if(!Number.isInteger(s.frame)||s.frame<0||s.frame<=prev)errors.push('Sample frames must be ordered and unique');
    prev=s.frame;
    if(!boxOK(s.head)){errors.push(`Frame ${s.frame}: invalid full-head bounds`);continue;}
    const [l,t,r,b]=s.head;
    if(l<0||t<0||r>p.source_width||b>p.source_height)errors.push(`Frame ${s.frame}: measured head outside source`);
    const u=(l-x)/w,v=(t-y)/h,rr=(r-x)/w,bb=(b-y)/h;
    const cx=(u+rr)/2,cy=(v+bb)/2,occupancy=bb-v;
    const radius=Math.max(...[[u,v],[rr,v],[u,bb],[rr,bb]].map(([a,b])=>Math.hypot(a-.5,b-.5)));
    const margin=Math.min(u,v,1-rr,1-bb);
    if(margin<.06-1e-6)errors.push(`Frame ${s.frame}: head outside 6% rectangular safety inset`);
    if(p.shape==='CIRCLE'&&radius>.44+1e-6)errors.push(`Frame ${s.frame}: head corners cross circular safety boundary`);
    if(Math.abs(cx-.5)>.12)errors.push(`Frame ${s.frame}: head horizontal centre drift exceeds 12%`);
    if(occupancy<.50||occupancy>.88)errors.push(`Frame ${s.frame}: head scale outside 50%-88% review envelope`);
    metrics.push({frame:s.frame,center_x:cx,center_y:cy,head_height_fraction:occupancy,min_rect_margin:margin,max_corner_radius:radius});
  }
  return {status:errors.length?'BLOCKED':'SAMPLED_GEOMETRY_PASS',errors,metrics,scope:'Only supplied full-head boxes; no automatic head detection, intermediate-frame safety or artistic approval.'};
}

export function solveCrop(p) {
  if(!p.samples?.length||p.samples.some(s=>!boxOK(s.head)))throw new Error('Provide full-head samples, not face detector boxes');
  if(!['RECT','CIRCLE'].includes(p.shape)||!(p.target_aspect>0))throw new Error('Shape and target aspect required');
  if(p.shape==='CIRCLE'&&p.target_aspect!==1)throw new Error('Circle target aspect must be one');
  const l=Math.min(...p.samples.map(s=>s.head[0])),t=Math.min(...p.samples.map(s=>s.head[1]));
  const r=Math.max(...p.samples.map(s=>s.head[2])),b=Math.max(...p.samples.map(s=>s.head[3]));
  const ar=p.target_aspect;
  let h=Math.max((b-t)/.72,(r-l)/(.80*ar));
  if(p.shape==='CIRCLE')h=Math.max(h,Math.hypot(r-l,b-t)/.88);
  const w=h*ar,cx=(l+r)/2,cy=(t+b)/2;
  // Symmetric head centring; source padding is explicit, never stretch or clip hair.
  const crop=[cx-w/2,cy-h/2,w,h];
  const result={...p,crop,padding:crop[0]<0||crop[1]<0||crop[0]+w>p.source_width||crop[1]+h>p.source_height?'SOLID_BACKGROUND':'NONE',strategy:'STATIC_UNION'};
  return {...result,validation:validateCrop(result)};
}

if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)) {
  const args=process.argv.slice(2),file=args[args.indexOf('--input')+1];
  try {
    if(!args.includes('--input')||!file)throw new Error('Use --input <json> [--validate]');
    const p=JSON.parse(fs.readFileSync(file,'utf8'));
    const result=args.includes('--validate')?validateCrop(p):solveCrop(p);
    console.log(JSON.stringify(result,null,2));
    process.exitCode=(result.validation??result).errors.length?1:0;
  }catch(e){console.error(e.message);process.exitCode=2;}
}
