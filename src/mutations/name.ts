import { access, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { buildResourceIndex } from '../package/resource-index.js';
import type { MutationReport } from './apply.js';

const STRING_REF_PREFIX = '@string/';

export type NameMutationInput = {
  decodedDir: string;
  value: string;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function toRelativePath(decodedDir: string, filePath: string): string {
  return relative(decodedDir, filePath).split(sep).join('/');
}

async function listStringFiles(decodedDir: string): Promise<string[]> {
  const resDir = join(decodedDir, 'res');

  try {
    const entries = await readdir(resDir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('values'))
      .map((entry) => join(resDir, entry.name, 'strings.xml'));

    const existingFiles: string[] = [];

    for (const filePath of files) {
      try {
        await access(filePath);
        existingFiles.push(filePath);
      } catch {
        // ignore missing locale string files
      }
    }

    return existingFiles;
  } catch {
    return [];
  }
}

function replaceStringValue(xml: string, resourceName: string, value: string): string {
  const escapedName = escapeRegExp(resourceName);
  const pattern = new RegExp(
    `(<string\\b[^>]*\\bname\\s*=\\s*(?:"${escapedName}"|'${escapedName}')[^>]*>)([\\s\\S]*?)(</string>)`,
    'g'
  );

  return xml.replace(pattern, `$1${escapeXml(value)}$3`);
}

function replaceLiteralApplicationLabel(manifestText: string, value: string): string {
  return manifestText.replace(
    /(<application\b[^>]*\bandroid:label\s*=\s*)(["'])(?!@)(.*?)\2/,
    `$1"${
      escapeXml(value)
    }"`
  );
}

export async function applyNameMutation(input: NameMutationInput): Promise<MutationReport> {
  const resourceIndex = await buildResourceIndex(input.decodedDir);
  const resourceNames = resourceIndex.labelRefs
    .filter((value) => value.startsWith(STRING_REF_PREFIX))
    .map((value) => value.slice(STRING_REF_PREFIX.length));
  const changedFiles = new Set<string>();

  for (const filePath of await listStringFiles(input.decodedDir)) {
    const original = await readFile(filePath, 'utf8');
    let updated = original;

    for (const resourceName of resourceNames) {
      updated = replaceStringValue(updated, resourceName, input.value);
    }

    if (updated !== original) {
      await writeFile(filePath, updated, 'utf8');
      changedFiles.add(toRelativePath(input.decodedDir, filePath));
    }
  }

  const manifestPath = join(input.decodedDir, 'AndroidManifest.xml');
  const manifestOriginal = await readFile(manifestPath, 'utf8');
  const manifestUpdated = replaceLiteralApplicationLabel(manifestOriginal, input.value);

  if (manifestUpdated !== manifestOriginal) {
    await writeFile(manifestPath, manifestUpdated, 'utf8');
    changedFiles.add('AndroidManifest.xml');
  }

  return {
    changedFiles: [...changedFiles]
  };
}
