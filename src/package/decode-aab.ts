import { access, mkdtemp, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { KeystoreCredentials } from '../validators/keystore.js';
import { buildUniversalApkFromAab } from './bundle.js';
import { decodeApk } from './decode-apk.js';

export async function decodeAab(
  input: string,
  workspaceRoot?: string,
  keystore?: KeystoreCredentials
): Promise<string> {
  const resolvedInput = resolve(input);
  const inputStats = await stat(resolvedInput);

  if (inputStats.isDirectory()) {
    await access(join(resolvedInput, 'AndroidManifest.xml'), constants.R_OK);
    return resolvedInput;
  }

  const decodeBaseDir = workspaceRoot ?? await mkdtemp(join(tmpdir(), 'apk-cli-aab-decode-'));
  const universalApk = await buildUniversalApkFromAab(resolvedInput, decodeBaseDir, keystore);
  return await decodeApk(universalApk, decodeBaseDir);
}
