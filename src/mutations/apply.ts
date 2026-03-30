import type { EditRequest } from '../validators/edit-request.js';
import { applyIconMutation } from './icon.js';
import { applyNameMutation } from './name.js';
import { applyPackageNameMutation } from './package-name.js';
import { applyVersionMutation } from './version.js';

export type MutationReport = {
  changedFiles: string[];
  risks?: string[];
};

export type RequestedMutations = {
  decodedDir: string;
  appName?: string;
  iconPath?: string;
  packageName?: string;
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
  const risks = new Set<string>();

  if (input.appName !== undefined) {
    const nameReport = await applyNameMutation({
      decodedDir: input.decodedDir,
      value: input.appName
    });

    for (const filePath of nameReport.changedFiles) {
      changedFiles.add(filePath);
    }
  }

  if (input.iconPath !== undefined) {
    const iconReport = await applyIconMutation({
      decodedDir: input.decodedDir,
      iconPath: input.iconPath
    });

    for (const filePath of iconReport.changedFiles) {
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

  if (input.packageName !== undefined) {
    const packageReport = await applyPackageNameMutation({
      decodedDir: input.decodedDir,
      nextPackageName: input.packageName
    });

    for (const filePath of packageReport.changedFiles) {
      changedFiles.add(filePath);
    }

    for (const risk of packageReport.risks) {
      risks.add(risk);
    }
  }

  return {
    changedFiles: [...changedFiles],
    risks: [...risks]
  };
}

export async function runEditPipeline(request: EditRequest): Promise<EditPipelineReport> {
  return {
    input: request.input,
    status: 'skipped',
    message: 'edit 流程骨架已准备，真实修改流程尚未实现'
  };
}
