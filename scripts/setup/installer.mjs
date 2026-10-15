import { createHash, randomBytes } from 'node:crypto';
import { parseEnv } from 'node:util';

export class SetupError extends Error {}

const keys = ['POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_PORT', 'DATABASE_URL'];
export const defaults = { port: 3000, startupMs: 120_000, pollMs: 250 };
export const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function portNumber(value) {
  if (!/^\d+$/.test(String(value)) || Number(value) < 1024 || Number(value) > 65535) throw new SetupError('Configuration: PORT/POSTGRES_PORT must be an integer between 1024 and 65535.');
  return Number(value);
}
export function configuration(text, overrides) {
  const values = parseEnv(text);
  for (const key of keys) if (overrides[key] !== undefined) values[key] = overrides[key];
  return Object.fromEntries(keys.map((key) => [key, values[key]]));
}
export function validateEnvironment(values) {
  if (!values.POSTGRES_DB || !values.POSTGRES_USER || !values.POSTGRES_PASSWORD || !values.DATABASE_URL) throw new SetupError('Environment: complete POSTGRES_DB/USER/PASSWORD/PORT and DATABASE_URL in .env; existing values were not changed.');
  const port = portNumber(values.POSTGRES_PORT);
  let url;
  try { url = new URL(values.DATABASE_URL); } catch { throw new SetupError('Environment: DATABASE_URL must be a valid PostgreSQL URL.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['localhost', '127.0.0.1'].includes(url.hostname) || url.search || url.hash ||
      Number(url.port || 5432) !== port || decodeURIComponent(url.username) !== values.POSTGRES_USER ||
      decodeURIComponent(url.password) !== values.POSTGRES_PASSWORD || decodeURIComponent(url.pathname.slice(1)) !== values.POSTGRES_DB) {
    throw new SetupError('Environment: DATABASE_URL must match the local POSTGRES settings; correct .env or process overrides.');
  }
  return values;
}
export function newEnvironment(values, volumeExists) {
  const next = { ...values };
  if (!next.POSTGRES_PASSWORD) {
    if (volumeExists) throw new SetupError('Environment: existing PostgreSQL volume found without credentials. Recover the original credentials; setup will not rotate them or reset data.');
    next.POSTGRES_PASSWORD = randomBytes(32).toString('hex');
  }
  if (!next.DATABASE_URL || next.DATABASE_URL.includes('YOUR_URL_ENCODED_PASSWORD')) {
    next.DATABASE_URL = `postgresql://${encodeURIComponent(next.POSTGRES_USER)}:${encodeURIComponent(next.POSTGRES_PASSWORD)}@127.0.0.1:${next.POSTGRES_PORT}/${encodeURIComponent(next.POSTGRES_DB)}`;
  }
  return validateEnvironment(next);
}
export async function setup(io) {
  if (io.nodeMajor < 24 || !io.npmCli) throw new SetupError('Prerequisites: use Node >=24 and invoke npm run setup.');
  const port = portNumber(io.environment.PORT ?? defaults.port);
  for (const args of [['compose', 'version'], ['info']]) {
    if ((await io.run('docker', args)).code !== 0) throw new SetupError('Prerequisites: install Docker Compose v2 and start the Docker engine, then rerun setup.');
  }
  const fingerprint = await io.fingerprint();
  const existing = await io.read('.env');
  const values = configuration(existing ?? await io.read('.env.example'), io.environment);
  const identity = { root: io.root, port, fingerprint, config: digest(values) };
  const lease = await io.claim(identity);
  if (lease.reused) {
    if (!(await io.dependenciesReady()) || (await io.npm(['run', 'db:check'], validateEnvironment(values))).code !== 0) throw new SetupError('Reuse: dependency/database health changed; stop the existing setup server and rerun setup.');
    io.log(`Development: skipped; reusing ${lease.url}`);
    return;
  }
  let child;
  const signals = io.signals(() => child?.stop());
  try {
    if (await io.dependenciesReady()) io.log('Dependencies: skipped; installed lockfile is healthy.');
    else {
      io.log('Dependencies: installing with npm ci.');
      if ((await io.npm(['ci'])).code !== 0 || !(await io.dependenciesReady())) throw new SetupError('Dependencies: npm ci failed or installation remains unhealthy. Run npm ci to diagnose, then retry setup.');
    }
    await io.saveFingerprint(fingerprint);
    let effective;
    if (existing === null) {
      const volume = await io.volumeExists(values);
      effective = newEnvironment(values, volume);
      await io.publishEnvironment(effective);
      io.log('Environment: created local .env (credentials hidden).');
    } else {
      effective = validateEnvironment(values);
      io.log('Environment: skipped; preserving existing .env.');
    }
    if (await io.databaseHealthy(effective)) io.log('PostgreSQL: skipped; already healthy.');
    else if ((await io.npm(['run', 'db:up'], effective)).code !== 0) throw new SetupError('PostgreSQL: db:up failed. Check Docker, credentials and port availability; no volume was removed.');
    if ((await io.npm(['run', 'db:check'], effective)).code !== 0) throw new SetupError('PostgreSQL: authenticated db:check failed. Recover original credentials; no data was reset.');
    if (signals.interrupted()) throw new SetupError('Development: setup interrupted before server startup; rerun when ready.');
    if (!(await io.portFree(port))) throw new SetupError('Development: requested port is occupied by an unverified process. Stop that process yourself or choose PORT; setup did not kill it.');
    child = await io.startDev(port, effective);
    const deadline = io.now() + defaults.startupMs;
    let ready = false;
    while (io.now() < deadline && child.alive()) {
      ready = await io.appHealthy(port);
      if (ready) break;
      await io.sleep(defaults.pollMs);
    }
    if (!ready || !child.alive()) throw new SetupError('Development: server failed to become healthy on the requested port. Stop any conflicting process and rerun setup.');
    const url = `http://127.0.0.1:${port}`;
    await lease.ready({ ...identity, config: digest(effective) }, url);
    io.log(`Development: ready at ${url}. Ctrl+C stops this server; database data is preserved.`);
    const code = await child.wait;
    if (code !== 0 && !signals.interrupted()) throw new SetupError('Development: server exited unsuccessfully. Rerun npm run dev to diagnose.');
  } finally {
    try { if (child) await child.stop(); }
    finally { signals.dispose(); await lease.release(); }
  }
}
