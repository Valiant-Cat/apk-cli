import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ResourceIndex } from './types.js';

type ParsedAttributes = Record<string, string>;

const START_TAG_PATTERN = /<([A-Za-z_][\w:.-]*)\b([^<>]*)\/?>/g;
const ATTRIBUTE_PATTERN = /([A-Za-z_][\w:.-]*)\s*=\s*("([^"]*)"|'([^']*)')/g;

function parseAttributes(source: string): ParsedAttributes {
  const attributes: ParsedAttributes = {};

  for (const match of source.matchAll(ATTRIBUTE_PATTERN)) {
    const [, name, , doubleQuotedValue, singleQuotedValue] = match;
    attributes[name] = doubleQuotedValue ?? singleQuotedValue ?? '';
  }

  return attributes;
}

function readManifestAttributes(manifestText: string): ParsedAttributes {
  const manifestMatch = manifestText.match(/<manifest\b([^<>]*)>/);

  if (!manifestMatch) {
    throw new Error('decoded directory contains an invalid AndroidManifest.xml');
  }

  return parseAttributes(manifestMatch[1]);
}

export function collectXmlResourceRefs(xmlText: string, attributeNames: string[]): string[] {
  const refs = new Set<string>();

  for (const match of xmlText.matchAll(START_TAG_PATTERN)) {
    const attributes = parseAttributes(match[2]);

    for (const attributeName of attributeNames) {
      const value = attributes[attributeName];
      if (value?.startsWith('@')) {
        refs.add(value);
      }
    }
  }

  return [...refs];
}

export async function buildResourceIndex(decodedDir: string): Promise<ResourceIndex> {
  const manifestText = await readFile(join(decodedDir, 'AndroidManifest.xml'), 'utf8');
  const manifestAttributes = readManifestAttributes(manifestText);

  return {
    packageName: manifestAttributes.package,
    versionName: manifestAttributes['android:versionName'],
    versionCode: manifestAttributes['android:versionCode'],
    labelRefs: collectXmlResourceRefs(manifestText, ['android:label']),
    iconRefs: collectXmlResourceRefs(manifestText, ['android:icon', 'android:roundIcon'])
  };
}
