import { rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { KeystoreCredentials } from '../validators/keystore.js';
import { ensureManagedToolchain, type ManagedToolchain } from './download.js';

const execFileAsync = promisify(execFile);

async function run(command: string, args: string[], cwd?: string): Promise<void> {
  await execFileAsync(command, args, { cwd, encoding: 'utf8' });
}

export async function getManagedToolchain(): Promise<ManagedToolchain> {
  return await ensureManagedToolchain();
}

export async function runApktoolDecode(input: string, outputDir: string) {
  const tools = await getManagedToolchain();
  await run(tools.javaCommand, ['-jar', tools.apktoolJar, 'd', '-f', input, '-o', outputDir]);
}

export async function runApktoolBuild(decodedDir: string, outputFile: string) {
  const tools = await getManagedToolchain();
  await run(tools.javaCommand, ['-jar', tools.apktoolJar, 'b', decodedDir, '-o', outputFile]);
}

export async function runZipalign(inputApk: string, outputApk: string) {
  const tools = await getManagedToolchain();
  await run(tools.zipalignPath, ['-f', '4', inputApk, outputApk]);
}

export async function runApksignerSign(inputApk: string, outputApk: string, keystore: KeystoreCredentials) {
  const tools = await getManagedToolchain();
  await run(tools.apksignerPath, [
    'sign',
    '--ks', keystore.keystore,
    '--ks-key-alias', keystore.keyAlias,
    '--ks-pass', `pass:${keystore.storePass}`,
    '--key-pass', `pass:${keystore.keyPass}`,
    '--out', outputApk,
    inputApk
  ]);
}

export async function runApksignerVerify(apkPath: string) {
  const tools = await getManagedToolchain();
  await run(tools.apksignerPath, ['verify', apkPath]);
}

export async function runBundletoolBuildApks(bundlePath: string, outputApks: string, keystore?: KeystoreCredentials) {
  const tools = await getManagedToolchain();
  await rm(outputApks, { force: true });

  const args = [
    '-jar',
    tools.bundletoolJar,
    'build-apks',
    `--bundle=${bundlePath}`,
    `--output=${outputApks}`,
    '--mode=universal'
  ];

  if (keystore) {
    args.push(
      `--ks=${keystore.keystore}`,
      `--ks-pass=pass:${keystore.storePass}`,
      `--ks-key-alias=${keystore.keyAlias}`,
      `--key-pass=pass:${keystore.keyPass}`
    );
  }

  await run(tools.javaCommand, args);
}

export async function extractUniversalApk(apksPath: string, outputApk: string) {
  const result = await execFileAsync('unzip', ['-p', apksPath, 'universal.apk'], {
    encoding: 'buffer',
    maxBuffer: 20 * 1024 * 1024
  });
  await writeFile(outputApk, result.stdout as Buffer);
}

export async function runAapt2ConvertProto(inputApk: string, outputApk: string) {
  const tools = await getManagedToolchain();
  await run(tools.aapt2Path, ['convert', '-o', outputApk, '--output-format', 'proto', inputApk]);
}

export async function runBundletoolBuildBundle(moduleZip: string, outputBundle: string) {
  const tools = await getManagedToolchain();
  await rm(outputBundle, { force: true });
  await run(tools.javaCommand, [
    '-jar',
    tools.bundletoolJar,
    'build-bundle',
    `--modules=${moduleZip}`,
    `--output=${outputBundle}`
  ]);
}

export async function runJarsignerSign(bundlePath: string, keystore: KeystoreCredentials) {
  const tools = await getManagedToolchain();
  await run(tools.jarsignerCommand, [
    '-keystore',
    keystore.keystore,
    '-storepass',
    keystore.storePass,
    '-keypass',
    keystore.keyPass,
    bundlePath,
    keystore.keyAlias
  ]);
}

export async function runJarsignerVerify(bundlePath: string, keystore: KeystoreCredentials) {
  const tools = await getManagedToolchain();
  await run(tools.jarsignerCommand, [
    '-verify',
    '-keystore',
    keystore.keystore,
    '-storepass',
    keystore.storePass,
    '-keypass',
    keystore.keyPass,
    bundlePath
  ]);
}

export function getUniversalApkPath(workspaceRoot: string): string {
  return join(workspaceRoot, 'universal.apk');
}
