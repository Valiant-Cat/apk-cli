import { describe, expect, it } from 'vitest';
import { runCli } from '../helpers/run-cli';

describe('install command', () => {
  it('注册 install 命令', async () => {
    const result = await runCli(['--help']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('install [options] <input>');
  });

  it('未知文件类型时不触发 adb 并直接失败', async () => {
    const result = await runCli(['install', 'app.zip']);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('不支持的安装文件类型: .zip\n');
  });
});
