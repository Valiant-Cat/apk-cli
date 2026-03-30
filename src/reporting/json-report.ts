import type { ResourceIndex } from '../package/types.js';
import type { MutationReport } from '../mutations/apply.js';

export type StageReport = {
  name: string;
  status: 'ok' | 'skipped' | 'failed';
  message?: string;
};

export type CliReport = {
  command: 'doctor' | 'inspect' | 'edit';
  stages?: StageReport[];
  mutationReport?: MutationReport;
  outputFile?: string;
  verify?: ResourceIndex;
};

export function formatJsonReport(report: CliReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}
