import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { MutationReport } from './apply.js';

export type VersionMutationInput = {
  decodedDir: string;
  versionName?: string;
  versionCode?: string;
};

function escapeAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function upsertManifestAttribute(manifestText: string, attributeName: string, value: string): string {
  const pattern = new RegExp(`(${attributeName}\\s*=\\s*)(["'])(.*?)\\2`);

  if (pattern.test(manifestText)) {
    return manifestText.replace(pattern, `$1"${escapeAttribute(value)}"`);
  }

  return manifestText.replace(
    /<manifest\b([^<>]*)>/,
    `<manifest$1 ${attributeName}="${escapeAttribute(value)}">`
  );
}

export async function applyVersionMutation(input: VersionMutationInput): Promise<MutationReport> {
  const manifestPath = join(input.decodedDir, 'AndroidManifest.xml');
  const original = await readFile(manifestPath, 'utf8');
  let updated = original;

  if (input.versionName !== undefined) {
    updated = upsertManifestAttribute(updated, 'android:versionName', input.versionName);
  }

  if (input.versionCode !== undefined) {
    updated = upsertManifestAttribute(updated, 'android:versionCode', input.versionCode);
  }

  if (updated !== original) {
    await writeFile(manifestPath, updated, 'utf8');
    return { changedFiles: ['AndroidManifest.xml'] };
  }

  return { changedFiles: [] };
}
