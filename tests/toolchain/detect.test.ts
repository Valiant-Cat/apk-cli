import { describe, expect, it } from 'vitest';
import { detectTool } from '../../src/toolchain/detect';

describe('detectTool', () => {
  it('returns missing when command is unavailable', async () => {
    const result = await detectTool({ name: 'apktool', command: 'missing-apktool' });
    expect(result.status).toBe('missing');
  });
});
