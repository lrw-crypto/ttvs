import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const [address,manifestPath]=process.argv.slice(2);
if(!address||!manifestPath)throw Error('Usage: node scripts/verify-live.mjs <site-url> <expected-release.json>');
const base=new URL(address.endsWith('/')?address:address+'/');
if(!['https:','http:'].includes(base.protocol)||base.username||base.password)throw Error('Invalid public site URL');
const expected=JSON.parse(await readFile(manifestPath,'utf8'));
if(expected.schema!==1||!/^[a-f0-9]{40}$/.test(expected.sourceCommit))throw Error('Invalid deployment manifest');
const get=async name=>{
  if(name.startsWith('/')||name.includes('..'))throw Error('Invalid asset path');
  const url=new URL(name,base);url.searchParams.set('release',expected.sourceCommit);
  const response=await fetch(url,{signal:AbortSignal.timeout(15000),cache:'no-store'});
  if(!response.ok)throw Error(`${name}: HTTP ${response.status}`);
  return response;
};
const attempts=Number(process.env.VERIFY_ATTEMPTS||24);
for(let i=0;i<attempts;i++){
  try {
    const actual=await (await get('release.json')).json();
    if(actual.sourceCommit!==expected.sourceCommit)throw Error('GitHub Pages still serves an earlier commit');
    await Promise.all(Object.entries(expected.files).map(async([name,hash])=>{
      const body=await (await get(name)).arrayBuffer();
      if(createHash('sha256').update(Buffer.from(body)).digest('hex')!==hash)throw Error(`${name}: deployed content differs`);
    }));
    console.log(`Verified public RPG homepage and ${Object.keys(expected.files).length} files: ${base.href}#shop (${expected.sourceCommit})`);
    break;
  } catch(error){
    if(i===attempts-1)throw error;
    console.log(`Waiting for Pages (${i+1}/${attempts}): ${error.message}`);
    await new Promise(resolve=>setTimeout(resolve,Number(process.env.VERIFY_DELAY_MS||5000)));
  }
}
