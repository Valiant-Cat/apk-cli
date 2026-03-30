import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type CommandResult = {
  stdout: string;
  stderr: string;
};

export async function runCommand(command: string, args: string[] = []): Promise<CommandResult> {
  const result = await execFileAsync(command, args, { encoding: 'utf8' });
  return {
    stdout: result.stdout,
    stderr: result.stderr
  };
}
