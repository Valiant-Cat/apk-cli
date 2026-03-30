import { basename, extname } from 'node:path';
import { stat } from 'node:fs/promises';
import { buildResourceIndex } from './resource-index.js';
import { decodeAab } from './decode-aab.js';
import { decodeApk } from './decode-apk.js';
import type { ResourceIndex } from './types.js';

function prefersAabPlaceholder(input: string): boolean {
  return extname(basename(input)).toLowerCase() === '.aab';
}

async function resolveDecodedDir(input: string): Promise<string> {
  const inputStats = await stat(input);

  if (inputStats.isFile()) {
    throw new Error('inspect currently only supports decoded directories; real APK/AAB decode is not implemented yet');
  }

  if (prefersAabPlaceholder(input)) {
    return await decodeAab(input);
  }

  return await decodeApk(input);
}

export async function inspectPackage(input: string): Promise<ResourceIndex> {
  const decodedDir = await resolveDecodedDir(input);
  return await buildResourceIndex(decodedDir);
}

export function renderInspectReport(index: ResourceIndex, json = false): string {
  if (json) {
    return `${JSON.stringify(index, null, 2)}\n`;
  }

  return [
    `package: ${index.packageName ?? ''}`,
    `version name: ${index.versionName ?? ''}`,
    `version code: ${index.versionCode ?? ''}`,
    `label refs: ${index.labelRefs.join(', ')}`,
    `icon refs: ${index.iconRefs.join(', ')}`
  ].join('\n') + '\n';
}
