import { copyFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { KeystoreCredentials } from '../validators/keystore.js';

const execFileAsync = promisify(execFile);

async function runCommand(command: string, args: string[], cwd?: string): Promise<void> {
  await execFileAsync(command, args, {
    cwd,
    encoding: 'utf8'
  });
}

export async function buildZipArtifact(decodedDir: string, outputFile: string): Promise<string> {
  await runCommand('zip', ['-qr', outputFile, '.'], decodedDir);
  return outputFile;
}

export async function signApk(
  unsignedApk: string,
  outputFile: string,
  keystore: KeystoreCredentials
): Promise<string> {
  await copyFile(unsignedApk, outputFile);
  await runCommand('jarsigner', [
    '-keystore',
    keystore.keystore,
    '-storepass',
    keystore.storePass,
    '-keypass',
    keystore.keyPass,
    outputFile,
    keystore.keyAlias
  ]);
  return outputFile;
}

export async function verifySignedApk(apkPath: string, keystore: KeystoreCredentials): Promise<void> {
  await runCommand('jarsigner', [
    '-verify',
    '-keystore',
    keystore.keystore,
    '-storepass',
    keystore.storePass,
    '-keypass',
    keystore.keyPass,
    apkPath
  ]);
}
