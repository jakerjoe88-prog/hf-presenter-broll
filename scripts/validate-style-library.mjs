import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../references/styles');
const registry=JSON.parse(fs.readFileSync(path.join(dir,'style-registry.json'),'utf8'));
const errors=[];
if(registry.schema_version!=='hf-presenter-style-registry-1.0')errors.push('Unknown schema version');
if(!Array.isArray(registry.styles)||registry.styles.length!==7)errors.push('Expected seven registered styles');
const ids=registry.styles?.map(x=>x.id)??[];
if(new Set(ids).size!==ids.length)errors.push('Duplicate style id');
if(!ids.includes(registry.talking_head_default))errors.push('Talking-head default is not registered');
for(const style of registry.styles??[]){
  if(!['DEFAULT_TALKING_HEAD','SELECTABLE','EXPLICIT_ONLY'].includes(style.status))errors.push(`${style.id}: invalid status`);
  if(!Array.isArray(style.aliases)||!style.aliases.length)errors.push(`${style.id}: aliases missing`);
  const guide=path.resolve(dir,style.guide||'');
  if(!guide.startsWith(dir+path.sep)||!fs.existsSync(guide)||fs.statSync(guide).size<120)errors.push(`${style.id}: guide missing`);
}
const result={status:errors.length?'FAIL':'PASS',style_count:ids.length,selectable_count:(registry.styles??[]).filter(x=>x.status!=='EXPLICIT_ONLY').length,default:registry.talking_head_default,errors};
console.log(JSON.stringify(result,null,2));
process.exitCode=errors.length?1:0;
