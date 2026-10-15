import { test, expect, vi } from 'vitest';
import { configuration, validateEnvironment, newEnvironment, portNumber, setup } from '../scripts/setup/installer.mjs';

const values = { POSTGRES_DB: 'devmentor', POSTGRES_USER: 'devmentor', POSTGRES_PASSWORD: 'safe-password', POSTGRES_PORT: '5432', DATABASE_URL: 'postgresql://devmentor:safe-password@127.0.0.1:5432/devmentor' };
const text = Object.entries(values).map(([k,v]) => `${k}=${v}`).join('\n');
function fixture() {
  const child = { alive: vi.fn(() => true), wait: Promise.resolve(0), stop: vi.fn(async () => {}) };
  const lease = { reused: false, url: 'http://127.0.0.1:3000', ready: vi.fn(async () => {}), release: vi.fn(async () => {}) };
  const signal = { interrupted: vi.fn(() => false), dispose: vi.fn() };
  const io = {
    root: '/repo', nodeMajor: 24, npmCli: '/npm', environment: {} as Record<string,string>,
    run: vi.fn(async (_command: string, _args: string[]) => { void _command; void _args; return { code: 0, stdout: '' }; }), fingerprint: vi.fn(async () => 'hash'),
    read: vi.fn(async (_name: string): Promise<string|null> => { void _name; return text; }), claim: vi.fn(async () => lease),
    dependenciesReady: vi.fn(async () => true), npm: vi.fn(async (_args: string[], _env?: Record<string,string>) => { void _args; void _env; return { code: 0, stdout: '' }; }),
    log: vi.fn(), signals: vi.fn((_stop: () => void) => { void _stop; return signal; }), saveFingerprint: vi.fn(async () => {}),
    volumeExists: vi.fn(async () => false), publishEnvironment: vi.fn(async () => {}),
    databaseHealthy: vi.fn(async () => true), portFree: vi.fn(async () => true),
    startDev: vi.fn(async (_port: number, _env: Record<string,string>) => { void _port; void _env; return child; }), appHealthy: vi.fn(async () => true), now: vi.fn(() => 0), sleep: vi.fn(async () => {}),
  };
  return { io, child, lease, signal };
}
test('configuration preserves explicit values and validates encoded credentials', () => {
  expect(configuration(text, {})).toEqual(values);
  expect(configuration(text, { POSTGRES_DB: 'changed' }).POSTGRES_DB).toBe('changed');
  expect(validateEnvironment(values)).toEqual(values);
  expect(validateEnvironment({ ...values, DATABASE_URL: 'postgres://devmentor:safe-password@localhost/devmentor' })).toEqual({ ...values, DATABASE_URL: 'postgres://devmentor:safe-password@localhost/devmentor' });
  expect(portNumber(3000)).toBe(3000);
  for (const value of ['a', 0, 65536]) expect(() => portNumber(value)).toThrow(/Configuration/);
  expect(() => validateEnvironment({})).toThrow(/complete/);
  expect(() => validateEnvironment({ ...values, DATABASE_URL: 'invalid' })).toThrow(/valid PostgreSQL/);
  for (const url of ['https://devmentor:safe-password@127.0.0.1:5432/devmentor','postgres://devmentor:safe-password@remote:5432/devmentor','postgres://devmentor:safe-password@localhost:5432/devmentor?x=1','postgres://devmentor:safe-password@localhost:5432/devmentor#x','postgres://devmentor:safe-password@localhost:5555/devmentor','postgres://other:safe-password@localhost:5432/devmentor','postgres://devmentor:other@localhost:5432/devmentor','postgres://devmentor:safe-password@localhost:5432/other']) expect(() => validateEnvironment({ ...values, DATABASE_URL: url })).toThrow(/must match/);
});
test('new credentials are generated only for new storage and URL-encoded', () => {
  const generated = newEnvironment({ ...values, POSTGRES_PASSWORD: '', DATABASE_URL: 'YOUR_URL_ENCODED_PASSWORD' }, false);
  expect(generated.POSTGRES_PASSWORD).toMatch(/^[a-f0-9]{64}$/);
  expect(newEnvironment(values, true)).toEqual(values);
  expect(() => newEnvironment({ ...values, POSTGRES_PASSWORD: '' }, true)).toThrow(/existing PostgreSQL volume/);
  const encoded = newEnvironment({ ...values, POSTGRES_PASSWORD: 'a@b:$', DATABASE_URL: '' }, false);
  expect(encoded.DATABASE_URL).toContain('a%40b%3A%24');
});
test('healthy rerun skips mutations and starts foreground dev with identical environment', async () => {
  const {io,lease,child} = fixture(); await setup(io);
  expect(io.npm).toHaveBeenCalledWith(['run','db:check'], values);
  expect(io.startDev).toHaveBeenCalledWith(3000, values);
  expect(io.publishEnvironment).not.toHaveBeenCalled();
  expect(io.npm).not.toHaveBeenCalledWith(['ci']);
  expect(lease.ready).toHaveBeenCalled(); expect(child.stop).toHaveBeenCalled(); expect(lease.release).toHaveBeenCalled();
});
test('fresh setup installs dependencies, creates environment and starts database', async () => {
  const {io} = fixture(); io.environment.PORT='4000';
  io.read.mockImplementation(async (name) => name === '.env' ? null : text.replace('safe-password','').replace(values.DATABASE_URL,'YOUR_URL_ENCODED_PASSWORD'));
  io.dependenciesReady.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  io.databaseHealthy.mockResolvedValue(false);
  await setup(io);
  expect(io.npm).toHaveBeenCalledWith(['ci']);
  expect(io.publishEnvironment).toHaveBeenCalled(); expect(io.startDev.mock.calls[0][0]).toBe(4000);
  expect(io.npm.mock.calls.some(([args]) => args.includes('db:up'))).toBe(true);
});
test('verified active owner is reused only after live dependency and DB checks', async () => {
  const {io,lease} = fixture(); lease.reused=true; await setup(io);
  expect(io.startDev).not.toHaveBeenCalled(); expect(io.signals).not.toHaveBeenCalled();
  expect(lease.release).not.toHaveBeenCalled(); expect(io.log).toHaveBeenCalledWith(expect.stringContaining('reusing'));
  io.dependenciesReady.mockResolvedValue(false); await expect(setup(io)).rejects.toThrow(/Reuse/);
  io.dependenciesReady.mockResolvedValue(true);io.npm.mockResolvedValue({code:1,stdout:''});await expect(setup(io)).rejects.toThrow(/Reuse/);
});
test('prerequisites fail before any mutations', async () => {
  const {io}=fixture();io.nodeMajor=23;await expect(setup(io)).rejects.toThrow(/Prerequisites/);
  io.nodeMajor=24;io.npmCli='';await expect(setup(io)).rejects.toThrow(/Prerequisites/);
  io.npmCli='/npm';io.run.mockResolvedValue({code:1,stdout:''});await expect(setup(io)).rejects.toThrow(/Docker/);
  expect(io.claim).not.toHaveBeenCalled();
});
test('install, database and port failures short circuit and release only own lock', async () => {
  for (const failure of ['install','unhealthy','db-up','db-check','port','interrupted']) {
    const {io,lease,signal}=fixture();
    if (failure==='install' || failure==='unhealthy') io.dependenciesReady.mockResolvedValue(false);
    if (failure==='install') io.npm.mockResolvedValue({code:1,stdout:'sensitive'});
    if (failure==='db-up') {io.databaseHealthy.mockResolvedValue(false);io.npm.mockResolvedValue({code:1,stdout:''});}
    if (failure==='db-check') io.npm.mockResolvedValue({code:1,stdout:''});
    if (failure==='port') io.portFree.mockResolvedValue(false);
    if (failure==='interrupted') signal.interrupted.mockReturnValue(true);
    await expect(setup(io)).rejects.toThrow();expect(io.startDev).not.toHaveBeenCalled();expect(lease.release).toHaveBeenCalled();
  }
});
test('readiness retries and timeout/exit/shutdown paths are bounded and clean', async () => {
  const retry=fixture();retry.io.appHealthy.mockResolvedValueOnce(false).mockResolvedValue(true);await setup(retry.io);expect(retry.io.sleep).toHaveBeenCalled();
  const timeout=fixture();timeout.io.now.mockReturnValueOnce(0).mockReturnValue(200000);await expect(setup(timeout.io)).rejects.toThrow(/healthy/);
  const dead=fixture();dead.child.alive.mockReturnValue(false);await expect(setup(dead.io)).rejects.toThrow(/healthy/);
  const exiting=fixture();exiting.child.alive.mockReturnValueOnce(true).mockReturnValue(false);await expect(setup(exiting.io)).rejects.toThrow(/healthy/);
  const failed=fixture();failed.child.wait=Promise.resolve(1);await expect(setup(failed.io)).rejects.toThrow(/exited unsuccessfully/);
  const interrupted=fixture();interrupted.signal.interrupted.mockReturnValueOnce(false).mockReturnValue(true);interrupted.child.wait=Promise.resolve(1);await setup(interrupted.io);
  const stopFailure=fixture();stopFailure.child.stop.mockRejectedValue(new Error('stop'));await expect(setup(stopFailure.io)).rejects.toThrow('stop');expect(stopFailure.lease.release).toHaveBeenCalled();
  const signal=fixture();signal.io.signals.mockImplementation((stop?: () => void) => {stop?.();return signal.signal;});await setup(signal.io);
});
