import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildResourceIndex } from '../../src/package/resource-index.js';

describe('buildResourceIndex', () => {
  it('extracts manifest package fields and aggregated resource refs from decoded resources', async () => {
    const index = await buildResourceIndex('tests/fixtures/minimal-apk/decoded');

    expect(index).toEqual({
      packageName: 'com.example.demo',
      versionName: '1.2.3',
      versionCode: '42',
      labelRefs: ['@string/app_name'],
      iconRefs: ['@mipmap/ic_launcher', '@mipmap/ic_launcher_round']
    });
  });

  it('deduplicates icon refs and excludes non-resource literal values', async () => {
    const index = await buildResourceIndex('tests/fixtures/minimal-aab/decoded');

    expect(index.labelRefs).toEqual(['@string/app_name']);
    expect(index.iconRefs).toEqual(['@mipmap/ic_launcher']);
  });

  it('handles single quotes and flexible attribute whitespace', async () => {
    const decodedDir = await mkdtemp(join(tmpdir(), 'apk-cli-resource-index-'));

    try {
      await writeFile(
        join(decodedDir, 'AndroidManifest.xml'),
        `<?xml version='1.0' encoding='utf-8'?>
<manifest xmlns:android='http://schemas.android.com/apk/res/android'
    package = 'com.example.quoted'
    android:versionCode = '11'
    android:versionName = '11.0'>
  <application
      android:label = '@string/app_name'
      android:icon = '@mipmap/ic_launcher'
      android:roundIcon = '@mipmap/ic_launcher'>
    <activity android:name='.QuotedActivity' android:label='Literal Label' />
    <activity android:name='.SecondActivity' android:label = '@string/secondary_label' android:icon = 'literal-icon' />
  </application>
</manifest>`
      );

      const index = await buildResourceIndex(decodedDir);

      expect(index).toEqual({
        packageName: 'com.example.quoted',
        versionName: '11.0',
        versionCode: '11',
        labelRefs: ['@string/app_name', '@string/secondary_label'],
        iconRefs: ['@mipmap/ic_launcher']
      });
    } finally {
      await rm(decodedDir, { recursive: true, force: true });
    }
  });
});
