import { describe, expect, it } from 'vitest';
import { runCli } from '../helpers/run-cli';

describe('cli bootstrap', () => {
  it('prints root help', async () => {
    const result = await runCli(['--help']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('apk-cli');
    expect(result.stdout).toContain('doctor');
  });
});
