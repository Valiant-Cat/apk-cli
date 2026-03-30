import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join, resolve } from 'node:path';

export async function decodeApk(input: string): Promise<string> {
  const decodedDir = resolve(input);
  await access(join(decodedDir, 'AndroidManifest.xml'), constants.R_OK);
  return decodedDir;
}
