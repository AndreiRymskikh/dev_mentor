import { test, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { EventEmitter } from 'node:events';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:http';
import { createRuntime, execute, listen, close } from '../scripts/setup/runtime.mjs';

vi.mock('node:child_process', async (original) => { const actual=await original<typeof import('node:child_process')>(); return {...actual,spawn:vi.fn(actual.spawn)}; });
afterEach(() => {vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();});
async function fixture() {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'installer-unit-'));
  await fs.mkdir(path.join(root,'packages/app'),{recursive:true});await fs.mkdir(path.join(root,'.devmentor'));await fs.mkdir(path.join(root,'node_modules'));
  await fs.writeFile(path.join(root,'packages/app/package.json'),'{}');await fs.writeFile(path.join(root,'packages/README.md'),'ignored');
  await fs.writeFile(path.join(root,'package.json'),'{"private":true}');
  await fs.writeFile(path.join(root,'package-lock.json'),'{"packages":{}}');
  const io=createRuntime(root);
  return {root,io,write:async(name:string,value:unknown)=>fs.writeFile(path.join(root,name),typeof value==='string'?value:JSON.stringify(value)),dispose:()=>fs.rm(root,{recursive:true,force:true})};
}
test('native process execution returns safe status, not raw failures',async()=>{
  expect((await execute(process.execPath,['-e','process.stdout.write("ok")'],{})).stdout).toBe('ok');
  expect((await execute(process.execPath,['-e','process.exit(2)'],{})).code).toBe(1);
  expect((await createRuntime('/tmp').run(process.execPath,['-e','process.stdout.write("adapter")'])).stdout).toBe('adapter');
});
test('filesystem, dependency fingerprint and installed-lock drift checks',async()=>{
 const f=await fixture();try {
  expect(await f.io.read('missing')).toBeNull();await expect(f.io.read('packages')).rejects.toThrow(/Filesystem/);
  const hash=await f.io.fingerprint();await f.write('packages/app/package.json','{"version":"2"}');expect(await f.io.fingerprint()).not.toBe(hash);
  await f.io.saveFingerprint(hash);expect(await f.io.read('.devmentor/dependencies.sha256')).toBe(hash);
  expect(await f.io.dependenciesReady()).toBe(false);
  await f.write('node_modules/.package-lock.json','{');expect(await f.io.dependenciesReady()).toBe(false);
  await f.write('node_modules/.package-lock.json',{});expect(await f.io.dependenciesReady()).toBe(false);
  await f.write('node_modules/.package-lock.json',{packages:{}});await f.write('package-lock.json',{});expect(await f.io.dependenciesReady()).toBe(false);
  const meta={version:'1',integrity:'hash',resolved:'registry'};
  await f.write('package-lock.json',{packages:{'':{},'node_modules/link':{link:true},'node_modules/optional':{optional:true},'node_modules/a':meta}});
  expect(await f.io.dependenciesReady()).toBe(false);
  for(const key of ['version','integrity','resolved']) {await f.write('node_modules/.package-lock.json',{packages:{'node_modules/a':{...meta,[key]:'drift'}}});expect(await f.io.dependenciesReady()).toBe(false);}
  await f.write('node_modules/.package-lock.json',{packages:{'node_modules/a':meta}});
  vi.spyOn(f.io,'npm').mockResolvedValue({code:0,stdout:''});expect(await f.io.dependenciesReady()).toBe(true);
  vi.mocked(f.io.npm).mockResolvedValue({code:1,stdout:''});expect(await f.io.dependenciesReady()).toBe(false);
 }finally{await f.dispose();}
});
test('environment publication is complete, private and never overwrites',async()=>{
 const f=await fixture();try {
  await f.io.publishEnvironment({POSTGRES_PASSWORD:'a@:$',DATABASE_URL:'encoded'});
  const original=await f.io.read('.env');expect(original).toContain('a@:$');
  await expect(f.io.publishEnvironment({POSTGRES_PASSWORD:'changed'})).rejects.toThrow(/without overwrite/);expect(await f.io.read('.env')).toBe(original);
  expect((await fs.readdir(path.join(f.root,'.devmentor'))).filter(name=>name.endsWith('.tmp'))).toEqual([]);
 }finally{await f.dispose();}
});
test('database inspection distinguishes absent, healthy and failed runtime state',async()=>{
 const f=await fixture();try {
  const run=vi.spyOn(f.io,'run');
  run.mockResolvedValueOnce({code:1,stdout:''});await expect(f.io.volumeExists({})).rejects.toThrow(/configuration/);
  const config={code:0,stdout:JSON.stringify({volumes:{postgres_data:{name:'unit_data'}}})};
  run.mockResolvedValueOnce(config).mockResolvedValueOnce({code:1,stdout:''});await expect(f.io.volumeExists({})).rejects.toThrow(/volumes/);
  run.mockResolvedValueOnce(config).mockResolvedValueOnce({code:0,stdout:'unit_data\n'});expect(await f.io.volumeExists({})).toBe(true);
  run.mockResolvedValueOnce(config).mockResolvedValueOnce({code:0,stdout:'other\n'});expect(await f.io.volumeExists({})).toBe(false);
  for(const output of [{code:1,stdout:''},{code:0,stdout:''},{code:0,stdout:'{"Health":"starting"}'}]){run.mockResolvedValueOnce(output);expect(await f.io.databaseHealthy({})).toBe(false);}
  run.mockResolvedValueOnce({code:0,stdout:'{"Health":"healthy"}'});expect(await f.io.databaseHealthy({})).toBe(true);
 }finally{await f.dispose();}
});
test('ownership control channel verifies ready identity, token and configuration',async()=>{
 const f=await fixture();const identity={root:f.root,port:3000,fingerprint:'hash',config:'config'};
 const lease=await f.io.claim(identity);
 try {
  await expect(f.io.claim(identity)).rejects.toThrow(/Ownership/);
  await lease.ready!(identity,'http://127.0.0.1:3000');
  expect((await f.io.claim(identity)).reused).toBe(true);
  const owner=JSON.parse((await f.io.read('.devmentor/setup.lock/owner.json'))!);
  expect((await fetch(`http://127.0.0.1:${owner.port}/${owner.token}`,{method:'POST'})).status).toBe(409);
  expect((await fetch(`http://127.0.0.1:${owner.port}/wrong`)).status).toBe(409);
  await expect(f.io.claim({...identity,port:4000})).rejects.toThrow(/Ownership/);
  await expect(f.io.claim({...identity,config:'other'})).rejects.toThrow(/Ownership/);
  vi.stubGlobal('fetch',async()=>Response.json({token:'wrong'}));await expect(f.io.claim(identity)).rejects.toThrow(/Ownership/);vi.unstubAllGlobals();
 }finally{await lease.release!();}
 await fs.mkdir(path.join(f.root,'.devmentor/setup.lock'));await f.write('.devmentor/setup.lock/owner.json','{"port":"invalid"}');await expect(f.io.claim(identity)).rejects.toThrow(/Ownership/);
 await f.write('.devmentor/setup.lock/owner.json','{"port":1234}');await expect(f.io.claim(identity)).rejects.toThrow(/Ownership/);
 await fs.rm(path.join(f.root,'.devmentor/setup.lock'),{recursive:true});
 const mkdir=vi.spyOn(fs,'mkdir');mkdir.mockResolvedValueOnce(undefined).mockRejectedValueOnce(Object.assign(new Error('permission'),{code:'EACCES'}));await expect(f.io.claim(identity)).rejects.toThrow(/unable to create/);mkdir.mockRestore();
 const write=vi.spyOn(fs,'writeFile').mockRejectedValueOnce(new Error('write'));await expect(f.io.claim(identity)).rejects.toThrow(/publish setup/);write.mockRestore();
 await f.dispose();
});
test('port and health probes are bounded and reject non-DevMentor responses',async()=>{
 const f=await fixture();const server=createServer((_req,res)=>res.end('{}'));const port=await listen(server,0);
 try{
  expect(await f.io.portFree(port)).toBe(false);
  expect(await f.io.appHealthy(port)).toBe(false);
  vi.stubGlobal('fetch',async()=>Response.json({ok:true,data:{status:'ok'}}));expect(await f.io.appHealthy(port)).toBe(true);
  vi.stubGlobal('fetch',async()=>Response.json({ok:true}, {status:500}));expect(await f.io.appHealthy(port)).toBe(false);
  vi.stubGlobal('fetch',async()=>Response.json({ok:false}));expect(await f.io.appHealthy(port)).toBe(false);
  vi.stubGlobal('fetch',async()=>Response.json({ok:true}));expect(await f.io.appHealthy(port)).toBe(false);
  vi.stubGlobal('fetch',async()=>{throw new Error('offline');});expect(await f.io.appHealthy(port)).toBe(false);
 }finally{await close(server);await f.dispose();}
 expect(await createRuntime('/tmp').portFree(0)).toBe(true);
});
test('native npm forwarding, signals and process-tree shutdown',async()=>{
 const f=await fixture();try {
  vi.spyOn(f.io,'run').mockResolvedValue({code:0,stdout:''});await f.io.npm(['run','dev'],{PORT:'3000'});expect(f.io.run).toHaveBeenCalledWith(process.execPath,[process.env.npm_execpath,'run','dev'],{PORT:'3000'});
  f.io.log('Installer adapter test');
  const host=Object.assign(new EventEmitter(),{env:{npm_execpath:'npm-cli'},versions:{node:'24.0.0'},execPath:process.execPath,platform:'linux',kill:vi.fn()});
  const io=createRuntime(f.root,host as unknown as NodeJS.Process);const stop=vi.fn();const signal=io.signals(stop);host.emit('SIGINT');host.emit('SIGTERM');expect(signal.interrupted()).toBe(true);expect(stop).toHaveBeenCalledTimes(2);signal.dispose();
  const child=Object.assign(new EventEmitter(),{pid:123});vi.mocked(spawn).mockReturnValueOnce(child as unknown as ChildProcess);
  host.kill.mockImplementation(()=>{queueMicrotask(()=>child.emit('exit',null));});
  const running=await io.startDev(3000,{});expect(running.alive()).toBe(true);await running.stop();expect(await running.wait).toBe(0);expect(running.alive()).toBe(false);await running.stop();
  const bad=new EventEmitter();vi.mocked(spawn).mockReturnValueOnce(bad as ChildProcess);const errorChild=await io.startDev(3000,{});bad.emit('error',new Error('spawn'));expect(await errorChild.wait).toBe(1);
  const exited=new EventEmitter();vi.mocked(spawn).mockReturnValueOnce(exited as ChildProcess);const good=await io.startDev(3000,{});exited.emit('exit',0);expect(await good.wait).toBe(0);
  const race=Object.assign(new EventEmitter(),{pid:123});vi.mocked(spawn).mockReturnValueOnce(race as unknown as ChildProcess);host.kill.mockImplementation(()=>{queueMicrotask(()=>race.emit('exit',0));throw new Error('gone');});await (await io.startDev(3000,{})).stop();
  const windows=Object.assign(new EventEmitter(),{...host,env:{npm_execpath:'npm-cli'},versions:{node:'24'},execPath:process.execPath,platform:'win32'});const win=createRuntime(f.root,windows as unknown as NodeJS.Process);const winChild=Object.assign(new EventEmitter(),{pid:456});vi.mocked(spawn).mockReturnValueOnce(winChild as unknown as ChildProcess);vi.spyOn(win,'run').mockImplementation(async()=>{winChild.emit('exit',0);return{code:0,stdout:''};});await (await win.startDev(3000,{})).stop();expect(win.run).toHaveBeenCalledWith('taskkill',['/pid','456','/T','/F']);
  vi.spyOn(io,'sleep').mockResolvedValue(undefined);const stubborn=Object.assign(new EventEmitter(),{pid:789});vi.mocked(spawn).mockReturnValueOnce(stubborn as unknown as ChildProcess);host.kill.mockImplementation((_pid:number,signal:string)=>{if(signal==='SIGKILL')stubborn.emit('exit',0);});const forced=await io.startDev(3000,{});const stopping=forced.stop();await stopping;expect(host.kill).toHaveBeenCalledWith(789,'SIGKILL');
 }finally{await f.dispose();}
});
