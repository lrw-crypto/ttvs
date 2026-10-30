import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'dist');
const html = await readFile(resolve(root, 'index.html'), 'utf8');
for (const match of html.matchAll(/(?:src|href)="\.\/([^"#]+)"/g)) {
  await readFile(resolve(root, match[1]));
}
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const name of ['index.html', 'src', 'assets']) {
  await cp(resolve(root, name), resolve(output, name), { recursive: true });
}
await writeFile(resolve(output, '.nojekyll'), '');
const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const files={};
async function fingerprint(directory,prefix='') {
  for(const entry of await readdir(directory,{withFileTypes:true})){
    const name=prefix+entry.name;
    if(entry.isDirectory())await fingerprint(resolve(directory,entry.name),name+'/');
    else if(!entry.name.startsWith('.'))files[name]=createHash('sha256').update(await readFile(resolve(directory,entry.name))).digest('hex');
  }
}
await fingerprint(output);
await writeFile(resolve(output,'release.json'),JSON.stringify({schema:1,sourceCommit,files},null,2)+'\n');
console.log('RPG 靜態網站已產生於 dist/。首頁：/；冒險地圖：/#shop。建置本身不會上傳。');
