import { runCommand } from './runner.js';

export async function runApktoolDecode(input: string, outputDir: string) {
  return runCommand('apktool', ['d', '-f', input, '-o', outputDir]);
}
