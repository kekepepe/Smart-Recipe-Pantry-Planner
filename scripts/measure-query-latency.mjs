import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { createServer } from 'node:net';
import { cpus, totalmem, platform, release, arch, tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

// Usage: node scripts/measure-query-latency.mjs TARGET_CHECKOUT NEW_RESULT.json
const [targetArg, outputArg] = process.argv.slice(2);
if (!targetArg || !outputArg) throw new Error('Provide target checkout and a new output JSON path.');
const target = resolve(targetArg), output = resolve(outputArg);
const git = (...args) => execFileSync('git', ['-C', target, ...args], { encoding: 'utf8' }).trim();
const baseline = git('rev-parse', 'HEAD');
assert.equal(git('status', '--porcelain', '--untracked-files=no'), '', 'Tracked target files must be clean.');
assert.equal(process.versions.node, readFileSync(join(target, '.nvmrc'), 'utf8').trim(), 'Use target .nvmrc runtime.');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const moduleAt = path => import(pathToFileURL(join(target, path)).href);
const { openDatabase } = await moduleAt('server/db/connection.js');
const { migrate } = await moduleAt('server/db/migrate.js');
const { seed, catalogVersion } = await moduleAt('server/db/seed.js');
const { Store } = await moduleAt('server/services/store.js');
const cases = [
  { id: 'list-page-1', query: 'page=1&pageSize=20', total: 100, count: 20, page: 1 },
  { id: 'combined-five-filters', query: 'countries=cn&regions=sichuan&tastes=spicy&meals=dinner&q=宫保', total: 1, count: 1, page: 1, ids: ['gong-bao-chicken'] },
  { id: 'empty-bitter', query: 'tastes=bitter', total: 0, count: 0, page: 1 },
  { id: 'list-page-5', query: 'page=5&pageSize=20', total: 100, count: 20, page: 5 },
];
const runs = 3, warmups = 10, samples = 50;
const percentile = (sorted, p) => sorted[Math.ceil(p * sorted.length) - 1];
function stats(rows) {
  const values = rows.map(r => r.ms).sort((a,b) => a-b);
  return { count: rows.length, errors: rows.filter(r => !r.valid).length, min: values[0], median: (values[(values.length-1)>>1] + values[values.length>>1])/2,
    p95: percentile(values, .95), max: values.at(-1), mean: values.reduce((a,b)=>a+b,0)/values.length };
}
const result = {
  formatVersion: 1, startedAt: new Date().toISOString(), applicationSha: baseline,
  runnerSha256: hash(readFileSync(fileURLToPath(import.meta.url))),
  lockfileSha256: hash(readFileSync(join(target, 'package-lock.json'))), catalogVersion,
  environment: { os: platform(), release: release(), arch: arch(), node: process.version, cpu: cpus()[0]?.model, logicalCpus: cpus().length, memoryBytes: totalmem() },
  protocol: { runs, warmupsPerCasePerRun: warmups, samplesPerCasePerRun: samples, concurrency: 1,
    timing: 'performance.now before fetch until full body text received; JSON parsing/assertions excluded',
    percentile: 'nearest rank ceil(0.95*n); median average of middle pair',
    transport: 'HTTP loopback, Node fetch default connection pooling, no retries',
    cases },
  fixture: { pantry: [{ ingredientId: 'egg', quantity: 2, unit: 'piece' }, { ingredientId: 'tomato', quantity: 1, unit: 'piece' }], shoppingRecipeIds: ['tomato-skillet','tomato-eggs'] },
  raw: [], runSummaries: [],
};
const scratch = mkdtempSync(join(tmpdir(), 'pantry-quality-'));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function freePort() {
  const server = createServer();
  await new Promise((resolve,reject) => { server.once('error',reject);server.listen(0,'127.0.0.1',resolve); });
  const port = server.address().port;
  await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
  return port;
}
async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise((resolve,reject) => {
    const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('Server shutdown timed out'));},5000);
    child.once('exit',()=>{clearTimeout(timer);resolve();});child.kill('SIGTERM');
  });
}
try {
  for (let run=1;run<=runs;run++) {
    const dbPath=join(scratch,`run-${run}.sqlite`);
    const db=openDatabase(dbPath,{create:true});
    try {
      migrate(db);seed(db);const store=new Store(db);
      let snapshot=store.onboard({mode:'sample',expectedRevision:0});
      for(const recipeId of result.fixture.shoppingRecipeIds) snapshot=store.selectRecipe({recipeId,expectedRevision:snapshot.revision});
      assert.equal(snapshot.recipes.length,100);assert.deepEqual(snapshot.pantry,result.fixture.pantry);
    } finally {db.close();}
    const port=await freePort(), origin=`http://127.0.0.1:${port}`;
    const child=spawn(process.execPath,['server/index.js'],{cwd:target,env:{...process.env,DB_PATH:dbPath,HOST:'127.0.0.1',PORT:String(port)},stdio:['ignore','pipe','pipe'],windowsHide:true});
    let logs='',spawnError;
    child.on('error',error=>{spawnError=error;});
    child.stdout.on('data',data=>{logs+=data;});child.stderr.on('data',data=>{logs+=data;});
    try {
      let ready=false;
      for(let attempt=0;attempt<100;attempt++) {
        if(spawnError) throw spawnError;
        if(child.exitCode!==null) throw new Error(`Server exited: ${logs}`);
        try {const response=await fetch(origin+'/api/health',{signal:AbortSignal.timeout(500)});await response.text();if(response.ok){ready=true;break;}}catch{}
        await pause(50);
      }
      assert(ready,`Server startup failed: ${logs}`);
      for(let round=-warmups;round<samples;round++) {
        for(let offset=0;offset<cases.length;offset++) {
          const scenario=cases[(offset+round+warmups)%cases.length];
          const start=performance.now();let ms,status=null,bytes=0,valid=false,error;
          try {
            const response=await fetch(origin+'/api/recipes?'+new URLSearchParams(scenario.query),{signal:AbortSignal.timeout(10000)});
            const body=await response.text();ms=performance.now()-start;status=response.status;bytes=Buffer.byteLength(body);
            const data=JSON.parse(body);
            assert.equal(status,200);assert.equal(data.total,scenario.total);assert.equal(data.recipes.length,scenario.count);assert.equal(data.page,scenario.page);
            assert.equal(data.catalogVersion,catalogVersion);
            if(scenario.ids) assert.deepEqual(data.recipes.map(r=>r.id),scenario.ids);
            valid=true;
          } catch(cause) {ms ??= performance.now()-start;error=cause.message;}
          const row={run,case:scenario.id,sample:round+1,ms,status,bytes,valid,...(error?{error}:{})};
          if(round>=0) result.raw.push(row);
          else assert(valid,`Warmup failed: ${JSON.stringify(row)}`);
        }
      }
      result.runSummaries.push({run,cases:Object.fromEntries(cases.map(c=>[c.id,stats(result.raw.filter(r=>r.run===run&&r.case===c.id))]))});
      console.log(`Run ${run}/${runs} complete`);
    } finally {await stop(child);writeFileSync(join(scratch,`run-${run}.log`),logs);}
  }
  result.summaries=Object.fromEntries(cases.map(c=>[c.id,stats(result.raw.filter(r=>r.case===c.id))]));
  assert(result.raw.every(r=>r.valid),'One or more measured responses failed; see raw results.');
  result.completed=true;
} catch(error) {result.completed=false;result.failure=error.stack;process.exitCode=1;}
finally {
  result.finishedAt=new Date().toISOString();
  mkdirSync(dirname(output),{recursive:true});
  writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({completed:result.completed,summaries:result.summaries,failure:result.failure},null,2));
}
