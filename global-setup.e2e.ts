import { execSync } from 'child_process';
import { setup as globalSetup } from './global-setup';
import { teardownTestFolder } from './testing-utils/src';
import startLocalRegistry from './tools/scripts/start-local-registry';
import stopLocalRegistry from './tools/scripts/stop-local-registry';

export async function setup() {
  await globalSetup();
  await startLocalRegistry();
  execSync('npm install -D @code-pushup/cli@e2e');
  execSync('npm install -D @code-pushup/eslint-plugin@e2e');
}

export async function teardown() {
  stopLocalRegistry();
  execSync('npm uninstall @code-pushup/cli');
  execSync('npm uninstall @code-pushup/eslint-plugin');
  await teardownTestFolder('tmp');
}
