import { basename, extname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { createWorkspace } from '../core/workspace.js';
import { inspectPackage } from '../package/inspect.js';
import { decodeAab } from '../package/decode-aab.js';
import { decodeApk } from '../package/decode-apk.js';
import { buildZipArtifact, signApk, verifySignedApk } from '../package/sign.js';
import { runEditPipeline } from '../mutations/apply.js';
import { parseEditRequest } from '../validators/edit-request.js';

export type EditCommandOptions = {
  keystore?: string;
  storePass?: string;
  keyAlias?: string;
  keyPass?: string;
  output?: string;
  appName?: string;
  icon?: string;
  versionName?: string;
  versionCode?: string;
  packageName?: string;
};

function buildDefaultOutputPath(input: string, output?: string): string {
  if (output) {
    return output;
  }

  const extension = extname(input) || '.apk';
  const baseName = basename(input, extension);
  return join(process.cwd(), `${baseName}-edited${extension}`);
}

function prefersAab(input: string): boolean {
  return extname(input).toLowerCase() === '.aab';
}

export async function runEditCommand(input: string, options?: EditCommandOptions): Promise<void> {
  try {
    const request = parseEditRequest({
      input,
      keystore: options?.keystore,
      storePass: options?.storePass,
      keyAlias: options?.keyAlias,
      keyPass: options?.keyPass,
      output: options?.output,
      appName: options?.appName,
      icon: options?.icon,
      versionName: options?.versionName,
      versionCode: options?.versionCode,
      packageName: options?.packageName
    });

    const workspace = await createWorkspace({
      baseDir: join(tmpdir(), 'apk-cli-workspaces')
    });
    const decodedDir = prefersAab(request.input)
      ? await decodeAab(request.input, workspace.root)
      : await decodeApk(request.input, workspace.root);

    await runEditPipeline({
      ...request,
      decodedDir,
      appName: request.appName,
      iconPath: request.icon,
      versionName: request.versionName,
      versionCode: request.versionCode,
      packageName: request.packageName
    } as typeof request & {
      decodedDir: string;
      appName?: string;
      iconPath?: string;
      versionName?: string;
      versionCode?: string;
      packageName?: string;
    });

    const artifactName = prefersAab(request.input) ? 'unsigned.aab' : 'unsigned.apk';
    const unsignedApk = await buildZipArtifact(decodedDir, join(workspace.artifactsDir, artifactName));
    const outputFile = buildDefaultOutputPath(request.input, request.output);
    await signApk(unsignedApk, outputFile, request);
    await verifySignedApk(outputFile, request);
    await inspectPackage(outputFile);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}
