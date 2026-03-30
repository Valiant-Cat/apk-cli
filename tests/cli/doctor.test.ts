import { describe, expect, it } from 'vitest';
import { runCli, runPackagedCli } from '../helpers/run-cli';

describe('cli bootstrap', () => {
  it('prints root help', async () => {
    const result = await runCli(['--help']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('apk-cli');
    expect(result.stdout).toContain('doctor');
  });

  it('prints root help from a packed install', async () => {
    const result = await runPackagedCli(['--help']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('apk-cli');
    expect(result.stdout).toContain('doctor');
  });

  it('prints doctor report as json', async () => {
    const result = await runCli(['doctor', '--json']);
    expect(result.exitCode).toBe(0);

    const report = JSON.parse(result.stdout);
    expect(report.tools).toBeTypeOf('object');
    expect(Array.isArray(report.tools)).toBe(true);
  });
});
