import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'PACKAGE_MANIFEST.json'),'utf8'));
for(const [name,digest] of Object.entries(manifest.files)){
 const file=path.resolve(root,name);if(!file.startsWith(root+path.sep))throw Error('Escaping manifest path');
 if(createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==digest)throw Error('Digest differs: '+name);
}
console.log(JSON.stringify({status:'PACKAGE_HASHES_PASS',profile:manifest.profile,files:Object.keys(manifest.files).length,scope:'File integrity only; not visual acceptance.'}));
