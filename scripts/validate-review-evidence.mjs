import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function validateReviewEvidence(dir, state, evidence) {
  const errors=[];
  const required=(value,label)=>{if(typeof value!=='string'||!value.trim())errors.push(`Review evidence missing: ${label}`);};
  for(const key of ['approval_ref','approval_quote'])required(evidence[key],key);
  for(const key of ['style','parameters'])for(const field of ['ref','quote'])required(evidence[key]?.[field],`${key}.${field}`);
  required(evidence.style?.id,'style.id');
  if(evidence.style?.id!==state.style)errors.push('Review style differs from workflow state.');
  if(!['NO_GENERIC_CARDS','EXPLICIT_CARD_STYLE'].includes(evidence.card_policy))errors.push('Explicit card policy required.');
  if(evidence.mode==='REVIEWED_TASK') {
    if(state.task_reviewed!==true)errors.push('Reviewed-task state must be true.');
    required(evidence.task_presented_ref,'task_presented_ref');
    try {
      required(evidence.task_file,'task_file');
      const target=path.resolve(dir,evidence.task_file||''),relative=path.relative(path.resolve(dir),target);
      if(!relative||relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw new Error('Task file must remain inside project');
      const data=fs.readFileSync(target);
      if(!data.toString('utf8').trim())throw new Error('Empty task');
      if(crypto.createHash('sha256').update(data).digest('hex')!==evidence.task_sha256)errors.push('Reviewed task hash missing or changed.');
    }catch(e){errors.push(`Reviewed task unavailable: ${e.message}`);}
  } else if(evidence.mode==='EXPLICIT_SKIP') {
    if(evidence.explicit_skip_review!==true||state.task_reviewed!==false)errors.push('Explicit skip must be recorded without claiming task reviewed.');
  } else errors.push('Unknown or missing review mode.');
  return errors;
}
