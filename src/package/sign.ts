import { basename, dirname, join } from 'node:path';
import type { KeystoreCredentials } from '../validators/keystore.js';
import {
  runApktoolBuild,
  runApksignerSign,
  runApksignerVerify,
  runJarsignerSign,
  runJarsignerVerify,
  runZipalign
} from '../toolchain/android-tools.js';

export async function buildApkArtifact(decodedDir: string, outputFile: string): Promise<string> {
  await runApktoolBuild(decodedDir, outputFile);
  return outputFile;
}

export async function signApk(unsignedApk: string, outputFile: string, keystore: KeystoreCredentials): Promise<string> {
  const alignedApk = join(dirname(outputFile), `${basename(outputFile, '.apk')}.aligned.apk`);
  await runZipalign(unsignedApk, alignedApk);
  await runApksignerSign(alignedApk, outputFile, keystore);
  return outputFile;
}

export async function verifySignedApk(apkPath: string): Promise<void> {
  await runApksignerVerify(apkPath);
}

export async function signAab(bundlePath: string, keystore: KeystoreCredentials): Promise<string> {
  await runJarsignerSign(bundlePath, keystore);
  return bundlePath;
}

export async function verifySignedAab(bundlePath: string, keystore: KeystoreCredentials): Promise<void> {
  await runJarsignerVerify(bundlePath, keystore);
}
