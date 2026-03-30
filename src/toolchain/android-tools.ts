import { runCommand } from './runner.js';

export type ApktoolDecodeOptions = {
  inputPath: string;
  outputDir: string;
  command?: string;
  force?: boolean;
  extraArgs?: string[];
};

export async function runApktoolDecode(options: ApktoolDecodeOptions) {
  const args = ['d'];

  if (options.force !== false) {
    args.push('-f');
  }

  if (options.extraArgs !== undefined) {
    args.push(...options.extraArgs);
  }

  args.push(options.inputPath, '-o', options.outputDir);

  return runCommand(options.command ?? 'apktool', args);
}
