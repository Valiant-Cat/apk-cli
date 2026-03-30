import { basename, extname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { createLogger, type Logger } from '../core/logger.js';
import { createWorkspace } from '../core/workspace.js';
import { buildAabFromApk } from '../package/bundle.js';
import { decodeAab } from '../package/decode-aab.js';
import { decodeApk } from '../package/decode-apk.js';
import { inspectPackage } from '../package/inspect.js';
import { buildApkArtifact, signAab, signApk, verifySignedAab, verifySignedApk } from '../package/sign.js';
import { runEditPipeline } from '../mutations/apply.js';
import { formatJsonReport, type EditCliReport } from '../reporting/json-report.js';
import { formatTextReport } from '../reporting/text-report.js';
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
  json?: boolean;
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

function createProgressLogger(): Logger {
  return createLogger({
    stdout: (line) => process.stderr.write(`${line}\n`),
    stderr: (line) => process.stderr.write(`${line}\n`)
  });
}

function createSilentLogger(): Logger {
  return createLogger({
    stdout: () => {},
    stderr: () => {}
  });
}

async function runStage<T>(logger: Logger, stage: string, action: () => Promise<T>): Promise<T> {
  logger.info(`${stage} started`);
  const result = await action();
  logger.info(`${stage} finished`);
  return result;
}

export async function executeEditCommand(
  input: string,
  options?: EditCommandOptions,
  logger: Logger = createSilentLogger()
): Promise<EditCliReport> {
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
  const decodedDir = await runStage(logger, 'decode', async () => (
    prefersAab(request.input)
      ? await decodeAab(request.input, workspace.root, request)
      : await decodeApk(request.input, workspace.root)
  ));

  const pipelineReport = await runStage(logger, 'mutate', async () => (
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
    })
  ));

  const outputFile = buildDefaultOutputPath(request.input, request.output);
  const unsignedApk = await runStage(
    logger,
    'build',
    async () => await buildApkArtifact(decodedDir, join(workspace.artifactsDir, 'unsigned.apk'))
  );

  await runStage(logger, 'sign', async () => {
    if (prefersAab(request.input)) {
      const signedApk = join(workspace.artifactsDir, 'edited.apk');
      await signApk(unsignedApk, signedApk, request);
      const outputBundle = await buildAabFromApk(signedApk, outputFile, workspace.root);
      await signAab(outputBundle, request);
      return;
    }

    await signApk(unsignedApk, outputFile, request);
  });

  const verify = await runStage(logger, 'verify', async () => {
    if (prefersAab(request.input)) {
      await verifySignedAab(outputFile, request);
    } else {
      await verifySignedApk(outputFile);
    }

    return await inspectPackage(outputFile);
  });

  return {
    command: 'edit',
    stages: [
      { name: 'decode', status: 'ok' },
      { name: 'mutate', status: 'ok' },
      {
        name: 'build',
        status: 'ok',
        message: prefersAab(request.input) ? 'bundletool rebuild pipeline' : 'apktool build pipeline'
      },
      { name: 'sign', status: 'ok' },
      { name: 'verify', status: 'ok' }
    ],
    mutationReport: pipelineReport.mutationReport,
    outputFile,
    verify
  };
}

export async function runEditCommand(input: string, options?: EditCommandOptions): Promise<void> {
  try {
    const report = await executeEditCommand(input, options, createProgressLogger());
    process.stdout.write(options?.json === true ? formatJsonReport(report) : formatTextReport(report));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}
