import assert from 'node:assert/strict';
import { spawn, execFile, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { createServer } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { parseEnv, promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import { integrationConfig as config } from './config';

const exec=promisify(execFile);
async function freePort() {
  const server=createServer();await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const address=server.address();assert.ok(address && typeof address!=='string');const port=address.port;
  await new Promise<void>((resolve)=>server.close(()=>resolve()));return port;
}
async function waitFor(predicate:()=>Promise<boolean>, message:string) {
  const deadline=Date.now()+config.installerStartupTimeoutMs;
  while(Date.now()<deadline){if(await predicate())return;await delay(config.readinessIntervalMs);}
  throw new Error(message);
}
export async function testInstaller(root=process.cwd()) {
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'devmentor-installer-e2e-'));
  const project=`devmentor-setup-${randomUUID().slice(0,8)}`;
  const dbPort=await freePort();const appPort=await freePort();
  const env:NodeJS.ProcessEnv={...process.env,COMPOSE_PROJECT_NAME:project,POSTGRES_PORT:String(dbPort),POSTGRES_DB:'devmentor',POSTGRES_USER:'devmentor',PORT:String(appPort),npm_config_offline:'true'};
  delete env.POSTGRES_PASSWORD;delete env.DATABASE_URL;
  let first:ChildProcess|undefined;
  let output='';let ended=false;let initialized=false;
  const npmCli=process.env.npm_execpath;
  assert.ok(npmCli,'Invoke this test through npm');
  try {
    await fs.cp(root,temp,{recursive:true,filter:(source)=>{
      const base=path.basename(source);
      return !['.git','.agents','.ai','node_modules','.next','coverage','test-results','.devmentor'].includes(base) && (!base.startsWith('.env')||base==='.env.example');
    }});
    first=spawn(process.execPath,[npmCli,'run','setup'],{cwd:temp,env,detached:process.platform!=='win32',stdio:['ignore','pipe','pipe']});
    first.once('exit',()=>{ended=true;});first.once('error',()=>{ended=true;});
    first.stdout?.on('data',(data:Buffer)=>{output+=data.toString();});first.stderr?.on('data',(data:Buffer)=>{output+=data.toString();});
    await waitFor(async()=>{
      assert.equal(ended,false,`Fresh installer exited: ${output}`);
      return output.includes('Development: ready at');
    },'Fresh installer did not become ready');
    initialized=true;
    assert.match(output,/Dependencies: installing/);assert.match(output,/Environment: created/);
    const original=await fs.readFile(path.join(temp,'.env'),'utf8');
    const owner=await fs.readFile(path.join(temp,'.devmentor/setup.lock/owner.json'),'utf8');
    const installed=(await fs.stat(path.join(temp,'node_modules/.package-lock.json'))).mtimeMs;
    const credentials=parseEnv(original);
    assert.ok(credentials.POSTGRES_PASSWORD && credentials.DATABASE_URL);
    const client=new Client({connectionString:credentials.DATABASE_URL});
    try {
      await client.connect();await client.query('CREATE TABLE installer_probe (value text NOT NULL)');
      await client.query('INSERT INTO installer_probe (value) VALUES ($1)',['preserved']);
      const rerun=await exec(process.execPath,[npmCli,'run','setup'],{cwd:temp,env,timeout:config.installerStartupTimeoutMs});
      assert.match(rerun.stdout,/Development: skipped; reusing/);
      assert.equal(await fs.readFile(path.join(temp,'.env'),'utf8'),original);
      assert.equal(await fs.readFile(path.join(temp,'.devmentor/setup.lock/owner.json'),'utf8'),owner);
      assert.equal((await fs.stat(path.join(temp,'node_modules/.package-lock.json'))).mtimeMs,installed);
      assert.equal((await client.query<{value:string}>('SELECT value FROM installer_probe')).rows[0].value,'preserved');
      assert.equal(output.includes(credentials.POSTGRES_PASSWORD),false,'Installer leaked credentials');
      assert.equal((await fetch(`http://127.0.0.1:${appPort}`)).status,200);
    } finally {await client.end();}
    console.log('Installer integration passed: fresh checkout, verified server reuse, unchanged credentials/dependencies and preserved SQL data.');
  } finally {
    if(first && !ended){
      if(process.platform==='win32')await exec('taskkill',['/pid',String(first.pid),'/T','/F']);
      else process.kill(-first.pid!,'SIGINT');
      await waitFor(async()=>{try{await fs.access(path.join(temp,'.devmentor/setup.lock'));return false;}catch{return true;}},'Installer ownership was not released on shutdown');
      if(!ended){const exited=new Promise<void>(resolve=>first!.once('exit',()=>resolve()));await Promise.race([exited,delay(5000)]);}
    }
    // This unique fixture project is the only storage this test may delete.
    assert.match(project,/^devmentor-setup-[a-f0-9]+$/);
    try {await exec('docker',['compose','--project-name',project,'down','--volumes','--remove-orphans'],{cwd:temp,env:{...env,POSTGRES_PASSWORD:'cleanup-only'}});}
    finally {await fs.rm(temp,{recursive:true,force:true});}
    if(initialized)console.log('Installer fixture resources cleaned up.');
  }
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await testInstaller();
