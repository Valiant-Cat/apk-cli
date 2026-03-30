import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ResourceIndex } from './types.js';

function collectAttributeRefs(manifest: string, attributeName: string): string[] {
  const pattern = new RegExp(`${attributeName}="([^"]+)"`, 'g');
  const refs = new Set<string>();

  for (const match of manifest.matchAll(pattern)) {
    const value = match[1];
    if (value.startsWith('@')) {
      refs.add(value);
    }
  }

  return [...refs];
}

function readManifestAttribute(manifest: string, attributeName: string): string | undefined {
  const match = manifest.match(new RegExp(`${attributeName}="([^"]+)"`));
  return match?.[1];
}

export async function buildResourceIndex(decodedDir: string): Promise<ResourceIndex> {
  const manifest = await readFile(join(decodedDir, 'AndroidManifest.xml'), 'utf8');

  return {
    packageName: readManifestAttribute(manifest, 'package'),
    versionName: readManifestAttribute(manifest, 'android:versionName'),
    versionCode: readManifestAttribute(manifest, 'android:versionCode'),
    labelRefs: collectAttributeRefs(manifest, 'android:label'),
    iconRefs: [
      ...new Set([
        ...collectAttributeRefs(manifest, 'android:icon'),
        ...collectAttributeRefs(manifest, 'android:roundIcon')
      ])
    ]
  };
}
