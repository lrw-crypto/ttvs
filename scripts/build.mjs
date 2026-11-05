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
// 草商探索趣（3D 校園探索地圖）：單一 HTML，公開在 /explore/
await mkdir(resolve(output, 'explore'), { recursive: true });
await cp(resolve(root, 'explore/index.html'), resolve(output, 'explore/index.html'));
await cp(resolve(root, 'explore/stats.html'), resolve(output, 'explore/stats.html'));
// 科別簡介用的照片（取自各科簡報，已壓縮）
await cp(resolve(root, 'explore/media'), resolve(output, 'explore/media'), { recursive: true });
await writeFile(resolve(output, '.nojekyll'), '');
const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const version=sourceCommit.slice(0,12);
const deployedHtml=(await readFile(resolve(output,'index.html'),'utf8')).replace(/((?:src|href)=")(\.\/[^"?]+\.(?:js|css|svg))(")/g,`$1$2?v=${version}$3`);
await writeFile(resolve(output,'index.html'),deployedHtml);
for(const entry of await readdir(resolve(output,'src'))){
  if(!entry.endsWith('.js'))continue;
  const path=resolve(output,'src',entry);
  const code=(await readFile(path,'utf8')).replace(/\bfrom\s+(['"])(\.\/[^'"]+\.js)\1/g,(_,quote,path)=>`from ${quote}${path}?v=${version}${quote}`);
  await writeFile(path,code);
}
await mkdir(resolve(output,'.github/workflows'),{recursive:true});
await cp(resolve(root,'.github/workflows/verify-deployment.yml'),resolve(output,'.github/workflows/verify-deployment.yml'));
await cp(resolve(root,'scripts/verify-live.mjs'),resolve(output,'.github/verify-live.mjs'));
const files={};
async function fingerprint(directory,prefix='') {
  for(const entry of await readdir(directory,{withFileTypes:true})){
    if(entry.name.startsWith('.'))continue;
    const name=prefix+entry.name;
    if(entry.isDirectory())await fingerprint(resolve(directory,entry.name),name+'/');
    else if(!entry.name.startsWith('.'))files[name]=createHash('sha256').update(await readFile(resolve(directory,entry.name))).digest('hex');
  }
}
await fingerprint(output);
await writeFile(resolve(output,'release.json'),JSON.stringify({schema:1,sourceCommit,files},null,2)+'\n');
console.log('RPG 靜態網站已產生於 dist/。首頁：/；冒險地圖：/#shop；草商探索趣：/explore/。建置本身不會上傳。');
