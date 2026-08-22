import type { CliReport } from './json-report.js';

export function formatTextReport(report: CliReport): string {
  if (report.command === 'doctor') {
    return `${report.tools.map((tool) => `${tool.name}: ${tool.status}`).join('\n')}\n`;
  }

  if (report.command === 'inspect') {
    return [
      `package: ${report.index.packageName ?? ''}`,
      `version name: ${report.index.versionName ?? ''}`,
      `version code: ${report.index.versionCode ?? ''}`,
      `label refs: ${report.index.labelRefs.join(', ')}`,
      `icon refs: ${report.index.iconRefs.join(', ')}`
    ].join('\n') + '\n';
  }

  if (report.command === 'install') {
    return [
      `command: ${report.command}`,
      `type: ${report.packageType}`,
      `target device: ${report.targetDevice}`,
      `method: ${report.method}`,
      `apk files: ${report.apkFiles.length}`,
      `obb files: ${report.obbFiles.length}`,
      `stages: ${report.stages.map((stage) => `${stage.name}=${stage.status}`).join(', ')}`
    ].join('\n') + '\n';
  }

  const lines = [`command: ${report.command}`];

  lines.push(`stages: ${report.stages.map((stage) => `${stage.name}=${stage.status}`).join(', ')}`);

  lines.push(`output: ${report.outputFile}`);
  lines.push(`package: ${report.verify.packageName ?? ''}`);
  lines.push(`version name: ${report.verify.versionName ?? ''}`);
  lines.push(`version code: ${report.verify.versionCode ?? ''}`);
  lines.push(`label refs: ${report.verify.labelRefs.join(', ')}`);
  lines.push(`icon refs: ${report.verify.iconRefs.join(', ')}`);

  lines.push(`changed files: ${report.mutationReport.changedFiles.join(', ')}`);
  if (report.mutationReport.risks && report.mutationReport.risks.length > 0) {
    lines.push(`risks: ${report.mutationReport.risks.join(', ')}`);
  }

  return `${lines.join('\n')}\n`;
}
