import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
console.log('靜態網站已產生於 dist/。首頁：/；直接進入店面：/#shop。此命令不會上傳或部署。');
