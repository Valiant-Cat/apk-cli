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
  status: 'mutated';
  mutationReport: MutationReport;
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

export async function runEditPipeline(
  request: EditRequest & {
    decodedDir: string;
    appName?: string;
    iconPath?: string;
    versionName?: string;
    versionCode?: string;
    packageName?: string;
  }
): Promise<EditPipelineReport> {
  const mutationReport = await applyRequestedMutations({
    decodedDir: request.decodedDir,
    appName: request.appName,
    iconPath: request.iconPath,
    versionName: request.versionName,
    versionCode: request.versionCode,
    packageName: request.packageName
  });

  return {
    input: request.input,
    status: 'mutated',
    mutationReport
  };
}
