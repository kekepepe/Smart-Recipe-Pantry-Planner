import assert from 'node:assert/strict';
import { _electron, expect } from '@playwright/test';
import { mkdir, readdir, copyFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import os from 'node:os';
const base=process.env.PANTRY_ACCEPTANCE_DIR;
if(!base) throw new Error('Set PANTRY_ACCEPTANCE_DIR to the isolated candidate installation/evidence directory.');
const profile=join(base,'profile-'+Date.now());
const exe=join(base,'installed','Pantry & Plate.exe');
await mkdir(profile,{recursive:true});
const launch=p=>_electron.launch({executablePath:exe,args:[`--user-data-dir=${p}`],env:{...process.env,PATH:process.env.SystemRoot+'/System32'}});
let app; const evidence={source:'84ec45e65d8955cb3b8ce62a8ead49050bc86601',os:os.version(),release:os.release(),arch:os.arch(),profile,steps:[]};
try {
 app=await launch(profile); let page=await app.firstWindow();
 await page.getByRole('button',{name:'Use sample pantry',exact:true}).click();
 await page.getByRole('link',{name:'View recipe: Tomato & egg stir-fry',exact:true}).click();
 await expect.poll(()=>page.locator('main img').first().evaluate(i=>i.complete&&i.naturalWidth>0)).toBe(true);
 await page.getByRole('button',{name:'Add missing ingredients to list',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Shopping list',exact:true})).toBeVisible();
 const snapshot=()=>page.evaluate(async()=>{const r=await fetch('/api/snapshot');if(!r.ok)throw Error(r.status);return r.json()});
 const before=await snapshot();assert.equal(before.recipes.length,100);assert.deepEqual(before.shoppingRecipeIds,['tomato-eggs']);
 evidence.steps.push('Fresh profile: bundled runtime, sample pantry, local image, shopping list and 100 recipes passed with child PATH containing only Windows System32.');
 const origin=new URL(page.url()).origin;
 const unauth=await fetch(origin+'/api/snapshot');assert.equal(unauth.status,403);await unauth.body.cancel();
 const externalBlocked=await page.evaluate(async()=>{try{await fetch('https://example.com/');return false}catch{return true}});assert.equal(externalBlocked,true);
 await page.screenshot({path:join(base,'shopping-list.png'),fullPage:true});
 await app.close();app=null;
 app=await launch(profile);page=await app.firstWindow();assert.deepEqual(await snapshot(),before);
 evidence.steps.push('Cold restart preserved exact snapshot; unauthenticated loopback request rejected with 403; renderer external fetch blocked.');
 await app.evaluate(async({app})=>{
 const {createRequire}=process.getBuiltinModule('module');const req=createRequire(app.getAppPath()+'/package.json');const DB=req('better-sqlite3');const db=new DB(app.getPath('userData')+'/pantry.sqlite');
 try{db.prepare('UPDATE catalog_metadata SET version=? WHERE id=1').run('hao-previous-catalog-fixture')}finally{db.close()}
 });
 await app.close();app=null;
 app=await launch(profile);page=await app.firstWindow();const upgraded=await snapshot();
 assert.deepEqual(upgraded.pantry,before.pantry);assert.deepEqual(upgraded.shoppingRecipeIds,before.shoppingRecipeIds);assert.deepEqual(upgraded.shopping,before.shopping);
 const backups=(await readdir(profile)).filter(n=>/^pantry-before-upgrade-.*\.sqlite$/.test(n));assert.equal(backups.length,1);
 evidence.steps.push('Simulated catalog upgrade created one pre-upgrade backup and preserved pantry, selection and shopping quantities.');
 await app.close();app=null;
 const restored=profile+'-restored';await mkdir(restored);await copyFile(join(profile,backups[0]),join(restored,'pantry.sqlite'));
 app=await launch(restored);page=await app.firstWindow();const recovery=await snapshot();assert.deepEqual(recovery.pantry,before.pantry);assert.deepEqual(recovery.shoppingRecipeIds,before.shoppingRecipeIds);assert.deepEqual(recovery.shopping,before.shopping);
 evidence.steps.push('Restored pre-upgrade backup into a new profile; bundled app upgraded it and retained pantry/selection/shopping data.');
 evidence.limitations=['Host has development tools; fresh app profile and PATH isolation are not a clean Windows VM.','Physical network adapters were not disabled; application-level external request blocking tested.','Unsigned installer used silent NSIS installation; browser SmartScreen/download UX and final Release access untested.','Candidate contains baseline features only, not unmerged V2 additions.'];
 evidence.result='candidate checks passed';
}finally{if(app)await app.close();await writeFile(join(base,'acceptance-result.json'),JSON.stringify(evidence,null,2));}
console.log(JSON.stringify(evidence,null,2));
