import fs from 'node:fs/promises';
import { execFile, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createServer as httpServer } from 'node:http';
import { createServer as netServer } from 'node:net';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { digest, SetupError } from './installer.mjs';

export function execute(command, args, options) {
  return new Promise((resolve) => execFile(command, args, options, (error, stdout) => resolve({ code: error ? 1 : 0, stdout })));
}
export async function listen(server, port) {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return server.address().port;
}
export const close = (server) => new Promise((resolve) => server.close(resolve));

export function createRuntime(root, host = process) {
  const state = path.join(root, '.devmentor');
  const lock = path.join(state, 'setup.lock');
  const npmCli = host.env.npm_execpath;
  const abort = new AbortController();
  const io = {
    root, npmCli, environment: host.env, nodeMajor: Number(host.versions.node.split('.')[0]),
    now: Date.now, sleep,
    log: (message) => console.log(message),
    run: (command, args, env = {}) => execute(command, args, { cwd: root, env: { ...host.env, ...env }, maxBuffer: 16 * 1024 * 1024, signal: abort.signal }),
    npm: (args, env) => io.run(host.execPath, [npmCli, ...args], env),
    async read(name) {
      try { return await fs.readFile(path.join(root, name), 'utf8'); }
      catch (error) { if (error.code === 'ENOENT') return null; throw new SetupError('Filesystem: unable to read setup files. Check repository permissions.'); }
    },
    async fingerprint() {
      const entries = await fs.readdir(path.join(root, 'packages'), { withFileTypes: true });
      const files = ['package.json', 'package-lock.json', ...entries.filter((entry) => entry.isDirectory()).map((entry) => `packages/${entry.name}/package.json`).sort()];
      return digest(await Promise.all(files.map((file) => io.read(file))));
    },
    async dependenciesReady() {
      const actual = await io.read('node_modules/.package-lock.json');
      if (!actual) return false;
      let expected, installed;
      try { expected = JSON.parse(await io.read('package-lock.json')).packages; installed = JSON.parse(actual).packages; }
      catch { return false; }
      if (!expected || !installed) return false;
      for (const [name, metadata] of Object.entries(expected)) {
        if (!name.includes('node_modules/') || metadata.link) continue;
        if (!installed[name] && metadata.optional) continue;
        if (!installed[name] || ['version', 'integrity', 'resolved'].some((key) => installed[name][key] !== metadata[key])) return false;
      }
      return (await io.npm(['ls', '--all', '--json'])).code === 0;
    },
    async saveFingerprint(value) { await fs.writeFile(path.join(state, 'dependencies.sha256'), value, { mode: 0o600 }); },
    async volumeExists(env) {
      const config = await io.run('docker', ['compose', 'config', '--format', 'json'], { ...env, POSTGRES_PASSWORD: 'setup-inspection-only' });
      if (config.code) throw new SetupError('PostgreSQL: cannot inspect Compose configuration; verify Docker and docker-compose.yml.');
      const name = JSON.parse(config.stdout).volumes.postgres_data.name;
      const volumes = await io.run('docker', ['volume', 'ls', '--format', '{{.Name}}']);
      if (volumes.code) throw new SetupError('PostgreSQL: cannot inspect volumes; no credentials generated.');
      return volumes.stdout.split('\n').includes(name);
    },
    async publishEnvironment(values) {
      const temp = path.join(state, `env-${randomUUID()}.tmp`);
      await fs.writeFile(temp, Object.entries(values).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n') + '\n', { flag: 'wx', mode: 0o600 });
      try { await fs.link(temp, path.join(root, '.env')); }
      catch { throw new SetupError('Environment: could not publish .env without overwrite. Preserve existing files or configure .env manually.'); }
      finally { await fs.unlink(temp); }
    },
    async databaseHealthy(env) {
      const result = await io.run('docker', ['compose', 'ps', '--format', 'json', 'postgres'], env);
      return result.code === 0 && result.stdout.trim() !== '' && JSON.parse(result.stdout).Health === 'healthy';
    },
    async portFree(port) {
      const server = netServer();
      try { await listen(server, port); await close(server); return true; }
      catch { return false; }
    },
    async appHealthy(port) {
      try { const res = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(2000) }); const body = await res.json(); return res.ok && body.ok === true && body.data?.status === 'ok'; }
      catch { return false; }
    },
    signals(stop) {
      let interrupted = false;
      const handler = () => { interrupted = true; abort.abort(); void stop(); };
      host.on('SIGINT', handler); host.on('SIGTERM', handler);
      return { interrupted: () => interrupted, dispose: () => { host.off('SIGINT', handler); host.off('SIGTERM', handler); } };
    },
    async startDev(port, env) {
      const child = spawn(host.execPath, [npmCli, 'run', 'dev', '--', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: root, env: { ...host.env, ...env, PORT: String(port) }, detached: host.platform !== 'win32', stdio: 'ignore' });
      let alive = true;
      const wait = new Promise((resolve) => { child.once('error', () => { alive = false; resolve(1); }); child.once('exit', (code) => { alive = false; resolve(code ?? 0); }); });
      return { alive: () => alive, wait, async stop() {
        if (!alive) return;
        if (host.platform === 'win32') await io.run('taskkill', ['/pid', String(child.pid), '/T', '/F']);
        else { try { host.kill(-child.pid, 'SIGTERM'); } catch { /* Child already exited; wait below confirms cleanup. */ } }
        await Promise.race([wait, io.sleep(5000, undefined, { ref: false })]);
        if (alive) { host.kill(child.pid, 'SIGKILL'); await wait; }
      } };
    },
    async claim(identity) {
      await fs.mkdir(state, { recursive: true, mode: 0o700 });
      try { await fs.mkdir(lock, { mode: 0o700 }); }
      catch (error) {
        if (error.code !== 'EEXIST') throw new SetupError('Ownership: unable to create installer lock. Check permissions.');
        try {
          const owner = JSON.parse(await fs.readFile(path.join(lock, 'owner.json'), 'utf8'));
          if (!Number.isInteger(owner.port) || !owner.token) throw new SetupError('invalid');
          const res = await fetch(`http://127.0.0.1:${owner.port}/${owner.token}`, { signal: AbortSignal.timeout(2000) });
          const value = await res.json();
          if (!res.ok || value.token !== owner.token || value.url !== `http://127.0.0.1:${identity.port}` || JSON.stringify(value.identity) !== JSON.stringify(identity)) throw new SetupError('mismatch');
          return { reused: true, url: value.url };
        } catch { throw new SetupError('Ownership: setup is preparing, stale, or uses different configuration. Stop its server and retry; for stale metadata verify no installer is running before removing only .devmentor/setup.lock.'); }
      }
      let ready;
      const token = randomUUID();
      const server = httpServer((req, res) => {
        if (req.method !== 'GET' || req.url !== `/${token}` || !ready) { res.writeHead(409); res.end('{}'); return; }
        res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ ...ready, token }));
      });
      try {
        const port = await listen(server, 0);
        await fs.writeFile(path.join(lock, 'owner.json'), JSON.stringify({ port, token }), { flag: 'wx', mode: 0o600 });
      } catch { await close(server); await fs.rm(lock, { recursive: true }); throw new SetupError('Ownership: could not publish setup ownership. Check filesystem and localhost access.'); }
      return { reused: false, ready: (newIdentity, url) => { ready = { identity: newIdentity, url }; }, release: async () => { await close(server); await fs.rm(lock, { recursive: true }); } };
    },
  };
  return io;
}
