import type { MutationReport } from '../mutations/apply.js';
import type { InstallReport } from '../package/install.js';
import type { ResourceIndex } from '../package/types.js';
import type { DoctorReport } from '../toolchain/contracts.js';

export type StageReport = {
  name: string;
  status: 'ok' | 'skipped' | 'failed';
  message?: string;
};

export type DoctorCliReport = {
  command: 'doctor';
  tools: DoctorReport['tools'];
};

export type InspectCliReport = {
  command: 'inspect';
  index: ResourceIndex;
};

export type EditCliReport = {
  command: 'edit';
  stages: StageReport[];
  mutationReport: MutationReport;
  outputFile: string;
  verify: ResourceIndex;
};

export type InstallCliReport = InstallReport;

export type CliReport = DoctorCliReport | InspectCliReport | EditCliReport | InstallCliReport;

export function formatJsonReport(report: CliReport): string {
  if (report.command === 'doctor') {
    return `${JSON.stringify({ tools: report.tools }, null, 2)}\n`;
  }

  if (report.command === 'inspect') {
    return `${JSON.stringify(report.index, null, 2)}\n`;
  }

  return `${JSON.stringify(report, null, 2)}\n`;
}
