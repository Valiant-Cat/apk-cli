import { access, mkdtemp, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { runApktoolDecode } from '../toolchain/android-tools.js';

export async function decodeApk(input: string, workspaceRoot?: string): Promise<string> {
  const resolvedInput = resolve(input);
  const inputStats = await stat(resolvedInput);

  if (inputStats.isDirectory()) {
    await access(join(resolvedInput, 'AndroidManifest.xml'), constants.R_OK);
    return resolvedInput;
  }

  const decodeBaseDir = workspaceRoot ?? await mkdtemp(join(tmpdir(), 'apk-cli-apk-decode-'));
  const decodedDir = join(decodeBaseDir, 'decoded');

  try {
    await runApktoolDecode(resolvedInput, decodedDir);
  } catch {
    throw new Error('invalid apk archive');
  }

  await access(join(decodedDir, 'AndroidManifest.xml'), constants.R_OK);
  return decodedDir;
}
