import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const args=process.argv.slice(2);
const arg=n=>args[args.indexOf(n)+1];
if (!args.includes('--input') || !args.includes('--output')) {
  console.error('Usage: node probe-media.mjs --input <media> --output <metadata.json>');process.exit(2);
}
const input=path.resolve(arg('--input')),output=path.resolve(arg('--output'));
if(input===output || fs.existsSync(output)){console.error('Output must be a new metadata file.');process.exit(2);}
const r=spawnSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',input],{encoding:'utf8',windowsHide:true});
if(r.error || r.status!==0){console.error(r.error?.message || r.stderr);process.exit(1);}
const raw=JSON.parse(r.stdout),v=raw.streams?.find(s=>s.codec_type==='video'),a=raw.streams?.find(s=>s.codec_type==='audio');
const fraction=(s,sep='/')=>{const [n,d]=String(s||'0/1').split(sep).map(Number);return d>0?n/d:0;};
const rotation=Number(v?.tags?.rotate??v?.side_data_list?.find(s=>'rotation' in s)?.rotation??0);
const sar=v?(fraction(v.sample_aspect_ratio,':')||1):null;
const dw=v?v.width*sar:null,dh=v?.height??null,swap=Math.abs(rotation)%180===90;
const displayWidth=swap?dh:dw,displayHeight=swap?dw:dh;
const duration=Number(raw.format?.duration??v?.duration??a?.duration);
if(!Number.isFinite(duration)||duration<=0){console.error('No finite positive duration.');process.exit(1);}
const report={schema_version:'presenter-media-1.0',file_name:path.basename(input),duration_sec:duration,
  video:v?{coded_width:v.width,coded_height:v.height,rotation_deg:rotation,sample_aspect_ratio:v.sample_aspect_ratio,
    display_width:displayWidth,display_height:displayHeight,display_ratio:displayWidth/displayHeight,
    avg_fps:fraction(v.avg_frame_rate),nominal_fps:fraction(v.r_frame_rate),time_base:v.time_base,
    vfr_status:'NOT_CONFIRMED_REQUIRES_FRAME_PTS',codec:v.codec_name}:null,
  audio:a?{present:true,codec:a.codec_name,sample_rate:Number(a.sample_rate),channels:a.channels,start_time:Number(a.start_time||0)}:{present:false},
  raw,visual_review:'NOT_RUN',full_decode:'NOT_RUN'};
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:'PROBED',output,duration_sec:duration,video:report.video,audio:report.audio},null,2));
