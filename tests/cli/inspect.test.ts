import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { normalizeOutputPath } from '../../src/core/config';

describe('normalizeOutputPath', () => {
  it('rejects using the same file as input and output', () => {
    expect(() => normalizeOutputPath('app.apk', 'app.apk')).toThrow('output path must differ from input');
  });

  it('rejects equivalent relative paths', () => {
    expect(() => normalizeOutputPath('app.apk', './app.apk')).toThrow('output path must differ from input');
  });

  it('rejects equivalent traversed paths', () => {
    expect(() => normalizeOutputPath('app.apk', 'a/../app.apk')).toThrow('output path must differ from input');
  });

  it('rejects equivalent absolute and relative paths', () => {
    const absolute = resolve(process.cwd(), 'app.apk');
    expect(() => normalizeOutputPath('app.apk', absolute)).toThrow('output path must differ from input');
  });

  it('returns output unchanged when output is empty', () => {
    expect(normalizeOutputPath('app.apk')).toBeUndefined();
    expect(normalizeOutputPath('app.apk', '')).toBe('');
  });

  it('returns different output paths unchanged', () => {
    expect(normalizeOutputPath('app.apk', 'dist/app.apk')).toBe('dist/app.apk');
  });
});
