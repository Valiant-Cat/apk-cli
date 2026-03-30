import type { EditRequest } from '../validators/edit-request.js';
import { applyNameMutation } from './name.js';
import { applyVersionMutation } from './version.js';

export type MutationReport = {
  changedFiles: string[];
};

export type RequestedMutations = {
  decodedDir: string;
  appName?: string;
  versionName?: string;
  versionCode?: string;
};

export type EditPipelineReport = {
  input: string;
  status: 'skipped';
  message: string;
};

export async function applyRequestedMutations(input: RequestedMutations): Promise<MutationReport> {
  const changedFiles = new Set<string>();

  if (input.appName !== undefined) {
    const nameReport = await applyNameMutation({
      decodedDir: input.decodedDir,
      value: input.appName
    });

    for (const filePath of nameReport.changedFiles) {
      changedFiles.add(filePath);
    }
  }

  if (input.versionName !== undefined || input.versionCode !== undefined) {
    const versionReport = await applyVersionMutation({
      decodedDir: input.decodedDir,
      versionName: input.versionName,
      versionCode: input.versionCode
    });

    for (const filePath of versionReport.changedFiles) {
      changedFiles.add(filePath);
    }
  }

  return {
    changedFiles: [...changedFiles]
  };
}

export async function runEditPipeline(request: EditRequest): Promise<EditPipelineReport> {
  return {
    input: request.input,
    status: 'skipped',
    message: 'edit 流程骨架已准备，真实修改流程尚未实现'
  };
}
