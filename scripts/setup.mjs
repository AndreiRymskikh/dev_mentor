import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setup, SetupError } from './setup/installer.mjs';
import { createRuntime } from './setup/runtime.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const completion = setup(createRuntime(root)).catch((error) => {
  // Only stage errors are safe to print; unexpected filesystem/process errors may
  // contain credentials. The runtime and orchestrator surface safe diagnostics.
  console.error(error instanceof SetupError ? error.message : 'Setup failed. Verify prerequisites, local configuration, ports and installer ownership; existing data was preserved.');
  process.exitCode = 1;
});
