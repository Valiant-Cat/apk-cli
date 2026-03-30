import { mkdir, readdir, rename, rm, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { KeystoreCredentials } from '../validators/keystore.js';
import {
  extractUniversalApk,
  getUniversalApkPath,
  runAapt2ConvertProto,
  runBundletoolBuildApks,
  runBundletoolBuildBundle
} from '../toolchain/android-tools.js';

const execFileAsync = promisify(execFile);

async function listZipEntries(zipPath: string): Promise<string[]> {
  const result = await execFileAsync('unzip', ['-Z1', zipPath], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024
  });
  return result.stdout.split(/\r?\n/).filter(Boolean);
}

async function ensureSingleBaseModule(bundlePath: string): Promise<void> {
  const entries = await listZipEntries(bundlePath);
  const modules = new Set<string>();

  for (const entry of entries) {
    const parts = entry.split('/');
    if (parts.length > 1 && parts[1] === 'manifest' && parts[0] !== 'META-INF' && parts[0] !== 'BUNDLE-METADATA') {
      modules.add(parts[0]);
    }
  }

  if (modules.size > 1 || (modules.size === 1 && !modules.has('base'))) {
    throw new Error('aab editing currently supports only single-module base bundles');
  }
}

export async function buildUniversalApkFromAab(
  bundlePath: string,
  workspaceRoot: string,
  keystore?: KeystoreCredentials
): Promise<string> {
  await ensureSingleBaseModule(bundlePath);
  const outputApks = join(workspaceRoot, `${basename(bundlePath, '.aab')}.apks`);
  const outputApk = getUniversalApkPath(workspaceRoot);
  await runBundletoolBuildApks(bundlePath, outputApks, keystore);
  await extractUniversalApk(outputApks, outputApk);
  return outputApk;
}

export async function buildAabFromApk(apkPath: string, outputBundle: string, workspaceRoot: string): Promise<string> {
  const protoApk = join(workspaceRoot, 'base-proto.apk');
  const moduleTmpDir = join(workspaceRoot, 'module-tmp');
  const moduleDir = join(workspaceRoot, 'module');
  const moduleZip = join(workspaceRoot, 'base.zip');

  await runAapt2ConvertProto(apkPath, protoApk);
  await rm(moduleTmpDir, { recursive: true, force: true });
  await rm(moduleDir, { recursive: true, force: true });
  await rm(moduleZip, { force: true });

  await mkdir(join(moduleDir, 'manifest'), { recursive: true });
  await execFileAsync('unzip', ['-oq', protoApk, '-d', moduleTmpDir], { encoding: 'utf8' });
  await rm(join(moduleTmpDir, 'META-INF'), { recursive: true, force: true });
  await rename(join(moduleTmpDir, 'AndroidManifest.xml'), join(moduleDir, 'manifest', 'AndroidManifest.xml'));

  for (const directoryName of ['res', 'assets', 'lib', 'root']) {
    try {
      await stat(join(moduleTmpDir, directoryName));
      await rename(join(moduleTmpDir, directoryName), join(moduleDir, directoryName));
    } catch {
      // optional directory
    }
  }

  await rename(join(moduleTmpDir, 'resources.pb'), join(moduleDir, 'resources.pb'));

  const entries = await readdir(moduleTmpDir);
  const dexFiles = entries.filter((entry) => entry.endsWith('.dex'));
  if (dexFiles.length > 0) {
    await mkdir(join(moduleDir, 'dex'), { recursive: true });
    for (const dexFile of dexFiles) {
      await rename(join(moduleTmpDir, dexFile), join(moduleDir, 'dex', dexFile));
    }
  }

  await execFileAsync('zip', ['-qr', moduleZip, '.'], { cwd: moduleDir, encoding: 'utf8' });
  await runBundletoolBuildBundle(moduleZip, outputBundle);
  return outputBundle;
}
