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
});
