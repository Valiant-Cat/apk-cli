import type { CliReport } from './json-report.js';

export function formatTextReport(report: CliReport): string {
  const lines = [`command: ${report.command}`];

  if (report.stages && report.stages.length > 0) {
    lines.push(`stages: ${report.stages.map((stage) => `${stage.name}=${stage.status}`).join(', ')}`);
  }

  if (report.outputFile) {
    lines.push(`output: ${report.outputFile}`);
  }

  if (report.verify) {
    lines.push(`package: ${report.verify.packageName ?? ''}`);
    lines.push(`version name: ${report.verify.versionName ?? ''}`);
    lines.push(`version code: ${report.verify.versionCode ?? ''}`);
  }

  if (report.mutationReport) {
    lines.push(`changed files: ${report.mutationReport.changedFiles.join(', ')}`);
    if (report.mutationReport.risks && report.mutationReport.risks.length > 0) {
      lines.push(`risks: ${report.mutationReport.risks.join(', ')}`);
    }
  }

  return `${lines.join('\n')}\n`;
}
