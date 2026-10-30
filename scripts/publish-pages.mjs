import { execFileSync, spawnSync } from 'node:child_process';
import { cp, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const git=(args,cwd=root)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','inherit']}).trim();
if(git(['status','--porcelain']))throw Error('請先將已驗證的修改提交，工作區乾淨後再發布。');
if(git(['branch','--show-current'])!=='main')throw Error('只從 main 發布已提交版本。');
const sourceCommit=git(['rev-parse','HEAD']);
const origin=git(['remote','get-url','origin']);
if(origin!=='https://github.com/lrw-crypto/ttvs.git')throw Error('發布目標與 ttvs 倉庫不符，停止發布。');
const remote=git(['ls-remote','origin','refs/heads/main']).split(/\s+/)[0];
if(remote!==sourceCommit)throw Error('本機 main 尚未與遠端一致，請先正常推送或整合遠端提交。');
const directory=await mkdtemp(resolve(tmpdir(),'ttvs-publish-'));
try {
  git(['init','--initial-branch=gh-pages'],directory);
  git(['remote','add','origin',origin],directory);
  git(['fetch','--depth=1','origin','gh-pages'],directory);
  git(['checkout','-B','gh-pages','FETCH_HEAD'],directory);
  for(const entry of await readdir(directory))if(entry!=='.git')await rm(resolve(directory,entry),{recursive:true,force:true});
  for(const entry of await readdir(resolve(root,'dist')))await cp(resolve(root,'dist',entry),resolve(directory,entry),{recursive:true});
  git(['add','--all'],directory);
  const changed=spawnSync('git',['diff','--cached','--quiet'],{cwd:directory}).status;
  if(changed===0)console.log('靜態發布分支已是目前版本。');
  else {
    if(changed!==1)throw Error('無法確認發布內容差異。');
    git(['commit','-m',`Deploy data quest ${sourceCommit.slice(0,7)}`],directory);
    git(['push','origin','gh-pages'],directory);
    console.log(`已發布靜態分支，等待 GitHub Pages 原生建置及公開驗證：${sourceCommit}`);
  }
} finally {await rm(directory,{recursive:true,force:true});}
