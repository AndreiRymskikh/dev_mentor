import { test, vi, expect, afterEach } from 'vitest';
const fake=vi.hoisted(()=>({setup:vi.fn(),runtime:vi.fn(()=>({}))}));
vi.mock('../scripts/setup/installer.mjs',async(original)=>({...await original<typeof import('../scripts/setup/installer.mjs')>(),setup:fake.setup}));
vi.mock('../scripts/setup/runtime.mjs',()=>({createRuntime:fake.runtime}));
afterEach(()=>{process.exitCode=0;vi.restoreAllMocks();});
test('dependency-free CLI invokes installer and exits nonzero with safe stage diagnostics',async()=>{
 const {SetupError}=await import('../scripts/setup/installer.mjs');
 const log=vi.spyOn(console,'error').mockImplementation(()=>{});
 for(const error of [new SetupError('Environment: correct .env'),new Error('secret')]) {
  vi.resetModules();fake.setup.mockRejectedValueOnce(error);await (await import('../scripts/setup.mjs')).completion;
  expect(process.exitCode).toBe(1);expect(log).not.toHaveBeenLastCalledWith(expect.stringContaining('secret'));
 }
 vi.resetModules();fake.setup.mockResolvedValueOnce(undefined);await (await import('../scripts/setup.mjs')).completion;expect(fake.runtime).toHaveBeenCalled();
});
