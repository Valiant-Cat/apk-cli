import { describe, expect, it } from 'vitest';
import { buildResourceIndex } from '../../src/package/resource-index.js';

describe('buildResourceIndex', () => {
  it('finds package name, app label, and icon refs from decoded resources', async () => {
    const index = await buildResourceIndex('tests/fixtures/minimal-apk/decoded');
    expect(index.packageName).toBe('com.example.demo');
    expect(index.labelRefs.length).toBeGreaterThan(0);
    expect(index.iconRefs.length).toBeGreaterThan(0);
  });
});
