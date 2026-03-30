import { describe, expect, it } from 'vitest';
import { normalizeOutputPath } from '../../src/core/config';

describe('normalizeOutputPath', () => {
  it('rejects using the same file as input and output', () => {
    expect(() => normalizeOutputPath('app.apk', 'app.apk')).toThrow('output path must differ from input');
  });
});
