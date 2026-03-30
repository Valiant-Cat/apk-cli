import { runEditPipeline } from '../mutations/apply.js';
import { parseEditRequest } from '../validators/edit-request.js';

export type EditCommandOptions = {
  keystore?: string;
  storePass?: string;
  keyAlias?: string;
  keyPass?: string;
};

export async function runEditCommand(input: string, options?: EditCommandOptions): Promise<void> {
  try {
    const request = parseEditRequest({
      input,
      keystore: options?.keystore,
      storePass: options?.storePass,
      keyAlias: options?.keyAlias,
      keyPass: options?.keyPass
    });

    await runEditPipeline(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}
