import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const args=process.argv.slice(2),options={};
const valueFlags=['--workspace','--input','--capabilities','--skills-root','--hf-cli'];
for(let i=0;i<args.length;i++){
  if(valueFlags.includes(args[i])&&args[i+1]&&!args[i+1].startsWith('--'))options[args[i]]=args[++i];
  else if(['--require-assets','--no-word-alignment'].includes(args[i]))options[args[i]]=true;
  else {console.error('Invalid/missing argument. See references/setup-gate.md.');process.exit(2);}
}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const workspace=path.resolve(options['--workspace']||process.cwd()),win=process.platform==='win32';
const checks={};
const set=(key,status,reason,details={})=>checks[key]={status,reason,...details};
const run=(file,argv,extra={})=>spawnSync(file,argv,{encoding:'utf8',windowsHide:true,timeout:12000,maxBuffer:262144,...extra});
function discover(name){
  // Only hardcoded command names enter this function.
  if(win){
    for(const shell of ['pwsh.exe','powershell.exe']){
      const r=run(shell,['-NoProfile','-NonInteractive','-Command',`$c=Get-Command ${name} -ErrorAction SilentlyContinue | Select-Object -First 1; if($c){$c.Source}`]);
      if(r.status===0&&r.stdout.trim())return r.stdout.trim();
    }
  }else for(const dir of (process.env.PATH||'').split(path.delimiter)){
    const p=path.join(dir,name);try{fs.accessSync(p,fs.constants.X_OK);return p;}catch{}
  }
  return null;
}
function invoke(file,argv){
  if(win&&/\.ps1$/i.test(file)){
    for(const shell of ['pwsh.exe','powershell.exe']){
      const r=run(shell,['-NoProfile','-NonInteractive','-File',file,...argv]);
      if(!r.error||r.error.code!=='ENOENT')return r;
    }
  }
  if(win&&/\.(ps1|cmd|bat)$/i.test(file)){
    for(const shell of ['pwsh.exe','powershell.exe']){
      // Pass paths through environment, never concatenate them into shell code.
      const r=run(shell,['-NoProfile','-NonInteractive','-Command','$a=ConvertFrom-Json $env:HF_PREFLIGHT_ARGS; & $env:HF_PREFLIGHT_EXE @a; exit $LASTEXITCODE'],
        {env:{...process.env,HF_PREFLIGHT_EXE:file,HF_PREFLIGHT_ARGS:JSON.stringify(argv)}});
      if(!r.error||r.error.code!=='ENOENT')return r;
    }
  }
  return run(file,argv);
}
function tool(key,file,argv=['--version']){
  if(!file){set(key,'MISSING','Executable not found');return;}
  const r=/\.(js|mjs|cjs)$/i.test(file)?run(process.execPath,[file,...argv]):invoke(file,argv);
  set(key,r.status===0?'VERIFIED':'UNVERIFIED',r.status===0?'Existing version command succeeded':'Version check failed or timed out',
    {path:file,version:r.status===0?(r.stdout||'').trim().split(/\r?\n/)[0].slice(0,180):null});
}
set('node',Number(process.versions.node.split('.')[0])>=22?'VERIFIED':'MISSING','Requires Node.js 22+', {path:process.execPath,version:process.version});
for(const name of ['npm','ffmpeg','ffprobe'])tool(name,discover(name),[name==='npm'?'--version':'-version']);
try{
  if(!fs.statSync(workspace).isDirectory())throw Error();
  fs.accessSync(workspace,fs.constants.R_OK|fs.constants.W_OK);
  const disk=fs.statfsSync(workspace);
  set('workspace','VERIFIED','Readable/writable; Agent must plan render disk space against input size',{path:workspace,free_bytes:disk.bavail*disk.bsize});
}catch{set('workspace','MISSING','Workspace missing or not readable/writable',{path:workspace});}
if(options['--input']){
  const input=path.resolve(workspace,options['--input']);
  try{fs.accessSync(input,fs.constants.R_OK);if(!fs.statSync(input).isFile())throw Error();set('input','VERIFIED','Input readable',{path:input,size_bytes:fs.statSync(input).size});}
  catch{set('input','MISSING','Input missing/not readable; ask for correct path, do not reinstall',{path:input});}
}else set('input','NOT_REQUIRED','No media supplied yet; recheck when supplied');
const skillRoots=[
  options['--skills-root']&&path.resolve(options['--skills-root']),
  path.join(workspace,'.agents','skills'),path.join(workspace,'.codex','skills'),
  path.join(workspace,'.workbuddy','skills'),path.join(workspace,'.codebuddy','skills'),
  path.dirname(root),
  path.join(process.env.CODEX_HOME||path.join(os.homedir(),'.codex'),'skills'),
  path.join(os.homedir(),'.agents','skills'),path.join(os.homedir(),'.workbuddy','skills'),
  path.join(os.homedir(),'.codebuddy','skills')
].filter(Boolean);
for(const name of ['hyperframes-core','hyperframes-cli']){
  const found=skillRoots.map(p=>path.join(p,name,'SKILL.md')).find(p=>{try{fs.accessSync(p,fs.constants.R_OK);return fs.statSync(p).size>20;}catch{return false;}});
  set(name,found?'VERIFIED':'MISSING',found?'Skill file readable; Agent must read contract':'Skill not found; host may provide alternate registered path',{path:found||null});
}
let hf=options['--hf-cli']?path.resolve(options['--hf-cli']):null;
if(!hf){
  let cursor=workspace;
  while(true){
    const manifest=path.join(cursor,'node_modules','hyperframes','package.json');
    try{const pkg=JSON.parse(fs.readFileSync(manifest,'utf8'));const bin=typeof pkg.bin==='string'?pkg.bin:pkg.bin?.hyperframes;
      if(bin){const candidate=path.resolve(path.dirname(manifest),bin);if(fs.existsSync(candidate)){hf=candidate;break;}}}catch{}
    const parent=path.dirname(cursor);if(parent===cursor)break;cursor=parent;
  }
}
tool('hyperframes',hf||discover('hyperframes'));
let capabilities={};
if(options['--capabilities']){
  try{capabilities=JSON.parse(fs.readFileSync(path.resolve(workspace,options['--capabilities']),'utf8')).capabilities||{};}
  catch{set('capability_record','UNVERIFIED','Capability record missing or invalid JSON');}
}
for(const [name,required] of [['browser',true],['word_alignment',!options['--no-word-alignment']],['asset_acquisition',!!options['--require-assets']]]){
  if(!required){set(name,'NOT_REQUIRED','Not required by this invocation; recheck on scope changes');continue;}
  const c=capabilities[name],age=Date.now()-Date.parse(c?.checked_at);
  const valid=c?.status==='VERIFIED'&&typeof c.evidence==='string'&&c.evidence.trim()&&typeof c.provider==='string'&&c.provider.trim()&&age>=0&&age<=86400000;
  set(name,valid?'VERIFIED':'UNVERIFIED',valid?'Recent Agent verification recorded; not independently tested here':'Agent must verify capability and record provider, timestamp, evidence',{verification_method:valid?'AGENT_ATTESTATION':'PENDING'});
}
const missing=Object.entries(checks).filter(([,c])=>!['VERIFIED','NOT_REQUIRED'].includes(c.status)).map(([key,c])=>({key,status:c.status,reason:c.reason}));
console.log(JSON.stringify({schema_version:'hf-setup-1.1',checked_at:new Date().toISOString(),status:missing.length?'NEEDS_ATTENTION':'READY_FOR_PRODUCTION',paths:{skill_root:root,workspace,skill_search_roots:[...new Set(skillRoots)]},checks,missing,
  next_action:missing.length?'Explain concrete missing/unverified items and setup plan; ask whether user wants configuration assistance before installing.':'Continue workflow; do not ask to reinstall working dependencies.',
  scope:'Read-only local discovery; no installs, downloads, service calls or video-quality verification. Capability records are Agent attestations.'},null,2));
process.exitCode=missing.length?1:0;
