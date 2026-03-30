import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { inspectPackage } from '../../src/package/inspect.js';
import { runCli } from './run-cli.js';

export type EditScenarioOptions = {
  appName?: string;
  icon?: string;
  versionName?: string;
  versionCode?: number;
  packageName?: string;
};

export async function runEditScenario(input: string, options: EditScenarioOptions) {
  const workDir = await mkdtemp(join(tmpdir(), 'apk-cli-edit-scenario-'));
  const outputFile = join(workDir, `edited${extname(input) || '.apk'}`);

  const args = [
    'edit',
    input,
    '--output',
    outputFile,
    '--keystore',
    'tests/fixtures/keystore/debug.jks',
    '--store-pass',
    'android',
    '--key-alias',
    'debug',
    '--key-pass',
    'android'
  ];

  if (options.appName) {
    args.push('--app-name', options.appName);
  }

  if (options.icon) {
    args.push('--icon', options.icon);
  }

  if (options.versionName) {
    args.push('--version-name', options.versionName);
  }

  if (options.versionCode !== undefined) {
    args.push('--version-code', String(options.versionCode));
  }

  if (options.packageName) {
    args.push('--package-name', options.packageName);
  }

  const result = await runCli(args);

  if (result.exitCode !== 0) {
    await rm(workDir, { recursive: true, force: true });
    throw new Error(result.stderr.trim() || 'edit command failed');
  }

  const verify = await inspectPackage(outputFile);
  return {
    outputFile,
    verify,
    cleanup: async () => {
      await rm(workDir, { recursive: true, force: true });
    }
  };
}
