import { extname } from 'node:path';
import { buildResourceIndex } from './resource-index.js';
import { decodeAab } from './decode-aab.js';
import { decodeApk } from './decode-apk.js';
import type { ResourceIndex } from './types.js';

async function resolveDecodedDir(input: string): Promise<string> {
  const extension = extname(input).toLowerCase();

  if (extension === '.aab') {
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
