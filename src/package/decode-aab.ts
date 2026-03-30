import { access, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join, resolve } from 'node:path';

const UNSUPPORTED_FILE_INPUT_MESSAGE =
  'inspect currently only supports decoded directories; real APK/AAB decode is not implemented yet';

export async function decodeAab(input: string): Promise<string> {
  const decodedDir = resolve(input);
  const inputStats = await stat(decodedDir);

  if (!inputStats.isDirectory()) {
    throw new Error(UNSUPPORTED_FILE_INPUT_MESSAGE);
  }

  await access(join(decodedDir, 'AndroidManifest.xml'), constants.R_OK);
  return decodedDir;
}
