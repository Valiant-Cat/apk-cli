import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import type { ResourceIndex } from './types.js';

type ParsedNode = Record<string, unknown>;

type ParsedManifest = {
  manifest?: ParsedNode;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_'
});

function isRecord(value: unknown): value is ParsedNode {
  return typeof value === 'object' && value !== null;
}

function collectResourceRefs(node: unknown, attributeName: string, refs: Set<string>): void {
  if (!isRecord(node)) {
    return;
  }

  const attributeValue = node[`@_${attributeName}`];
  if (typeof attributeValue === 'string' && attributeValue.startsWith('@')) {
    refs.add(attributeValue);
  }

  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        collectResourceRefs(item, attributeName, refs);
      }
      continue;
    }

    if (isRecord(value)) {
      collectResourceRefs(value, attributeName, refs);
    }
  }
}

function requireManifestDocument(parsed: ParsedManifest): ParsedNode {
  if (!isRecord(parsed.manifest)) {
    throw new Error('decoded directory contains an invalid AndroidManifest.xml');
  }

  return parsed.manifest;
}

export async function buildResourceIndex(decodedDir: string): Promise<ResourceIndex> {
  const manifestText = await readFile(join(decodedDir, 'AndroidManifest.xml'), 'utf8');
  const manifestDocument = requireManifestDocument(parser.parse(manifestText) as ParsedManifest);
  const labelRefs = new Set<string>();
  const iconRefs = new Set<string>();

  collectResourceRefs(manifestDocument, 'android:label', labelRefs);
  collectResourceRefs(manifestDocument, 'android:icon', iconRefs);
  collectResourceRefs(manifestDocument, 'android:roundIcon', iconRefs);

  return {
    packageName: typeof manifestDocument['@_package'] === 'string' ? manifestDocument['@_package'] : undefined,
    versionName:
      typeof manifestDocument['@_android:versionName'] === 'string'
        ? manifestDocument['@_android:versionName']
        : undefined,
    versionCode:
      typeof manifestDocument['@_android:versionCode'] === 'string'
        ? manifestDocument['@_android:versionCode']
        : undefined,
    labelRefs: [...labelRefs],
    iconRefs: [...iconRefs]
  };
}
