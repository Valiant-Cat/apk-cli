import { describe, expect, it } from 'vitest';
import { runCommand, CommandExecutionError } from '../../src/toolchain/runner';

describe('runCommand', () => {
  it('throws a typed error with command output when the command fails', async () => {
    await expect(
      runCommand(process.execPath, [
        '-e',
        "process.stdout.write('out'); process.stderr.write('err'); process.exit(7)"
      ])
    ).rejects.toMatchObject({
      name: 'CommandExecutionError',
      exitCode: 7,
      stdout: 'out',
      stderr: 'err'
    });

    try {
      await runCommand(process.execPath, ['-e', 'process.exit(7)']);
    } catch (error) {
      expect(error).toBeInstanceOf(CommandExecutionError);
    }
  });
});
