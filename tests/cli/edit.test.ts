import { describe, expect, it } from 'vitest';
import { parseEditRequest } from '../../src/validators/edit-request';
import { runCli } from '../helpers/run-cli';

describe('parseEditRequest', () => {
  it('requires keystore credentials', () => {
    expect(() => parseEditRequest({ input: 'app.apk' })).toThrow(/keystore/i);
  });
});

describe('edit command', () => {
  it('prints a clear error when keystore credentials are missing', async () => {
    const result = await runCli(['edit', 'app.apk']);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('edit 命令缺少必要的 keystore 参数：keystore\n');
  });

  it('accepts the required edit parameters', async () => {
    const result = await runCli([
      'edit',
      'app.apk',
      '--keystore',
      'release.jks',
      '--store-pass',
      'store-pass',
      '--key-alias',
      'release',
      '--key-pass',
      'key-pass'
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toBe('');
  });
});
