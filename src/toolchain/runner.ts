import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type CommandResult = {
  stdout: string;
  stderr: string;
};

export class CommandExecutionError extends Error {
  constructor(
    public readonly command: string,
    public readonly args: string[],
    public readonly exitCode: number | undefined,
    public readonly stdout: string,
    public readonly stderr: string,
    cause?: unknown
  ) {
    super(`command execution failed: ${command}`);
    this.name = 'CommandExecutionError';
    this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export async function runCommand(command: string, args: string[] = []): Promise<CommandResult> {
  try {
    const result = await execFileAsync(command, args, { encoding: 'utf8' });
    return {
      stdout: result.stdout,
      stderr: result.stderr
    };
  } catch (error) {
    if (typeof error === 'object' && error !== null) {
      const failed = error as {
        code?: number | string;
        stdout?: string;
        stderr?: string;
      };

      throw new CommandExecutionError(
        command,
        args,
        typeof failed.code === 'number' ? failed.code : undefined,
        failed.stdout ?? '',
        failed.stderr ?? '',
        error
      );
    }

    throw error;
  }
}
