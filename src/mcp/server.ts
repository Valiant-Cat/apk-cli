import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { collectDoctorReport } from '../commands/doctor.js';
import { executeEditCommand, type EditCommandOptions } from '../commands/edit.js';
import { inspectPackage } from '../package/inspect.js';
import type { ResourceIndex } from '../package/types.js';
import { formatTextReport } from '../reporting/text-report.js';

const toolStatusSchema = z.enum(['available', 'missing']);
const stageStatusSchema = z.enum(['ok', 'skipped', 'failed']);
const resourceIndexSchema = {
  packageName: z.string().optional(),
  versionName: z.string().optional(),
  versionCode: z.string().optional(),
  labelRefs: z.array(z.string()),
  iconRefs: z.array(z.string())
};
const doctorOutputSchema = {
  tools: z.array(z.object({
    name: z.string(),
    status: toolStatusSchema
  }))
};
const editOutputSchema = {
  outputFile: z.string(),
  stages: z.array(z.object({
    name: z.string(),
    status: stageStatusSchema,
    message: z.string().optional()
  })),
  mutationReport: z.object({
    changedFiles: z.array(z.string()),
    risks: z.array(z.string()).optional()
  }),
  verify: z.object(resourceIndexSchema)
};

function toErrorResult(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: 'text' as const, text: `Error: ${message}` }],
    isError: true
  };
}

function toInspectReport(index: ResourceIndex) {
  return {
    command: 'inspect' as const,
    index
  };
}

function toDoctorReport(tools: Awaited<ReturnType<typeof collectDoctorReport>>['tools']) {
  return {
    command: 'doctor' as const,
    tools
  };
}

export function createApkCliMcpServer() {
  const server = new McpServer({
    name: 'apk-cli-mcp',
    version: '0.1.0'
  });

  server.registerTool(
    'doctor',
    {
      title: 'Doctor',
      description: '检查 apk-cli 运行环境和 Android 工具链状态。',
      inputSchema: {},
      outputSchema: doctorOutputSchema
    },
    async () => {
      try {
        const report = toDoctorReport((await collectDoctorReport()).tools);
        return {
          content: [{ type: 'text', text: formatTextReport(report) }],
          structuredContent: { tools: report.tools }
        };
      } catch (error) {
        return toErrorResult(error);
      }
    }
  );

  server.registerTool(
    'inspect',
    {
      title: 'Inspect',
      description: '读取 APK 或 AAB 的包名、版本、名称资源和图标引用。',
      inputSchema: {
        input: z.string().describe('APK 或 AAB 的输入路径')
      },
      outputSchema: resourceIndexSchema
    },
    async ({ input }) => {
      try {
        const report = toInspectReport(await inspectPackage(input));
        return {
          content: [{ type: 'text', text: formatTextReport(report) }],
          structuredContent: report.index
        };
      } catch (error) {
        return toErrorResult(error);
      }
    }
  );

  server.registerTool(
    'edit',
    {
      title: 'Edit',
      description: '修改 APK 或 AAB 的名称、图标、版本或包名，并重新签名。',
      inputSchema: {
        input: z.string().describe('APK 或 AAB 的输入路径'),
        keystore: z.string().describe('keystore 路径'),
        storePass: z.string().describe('keystore 密码'),
        keyAlias: z.string().describe('key alias'),
        keyPass: z.string().describe('key 密码'),
        output: z.string().optional().describe('输出文件路径'),
        appName: z.string().optional().describe('新的应用名称'),
        icon: z.string().optional().describe('新的图标路径'),
        versionName: z.string().optional().describe('新的 versionName'),
        versionCode: z.string().optional().describe('新的 versionCode'),
        packageName: z.string().optional().describe('新的包名')
      },
      outputSchema: editOutputSchema
    },
    async (args) => {
      try {
        const options: EditCommandOptions = {
          keystore: args.keystore,
          storePass: args.storePass,
          keyAlias: args.keyAlias,
          keyPass: args.keyPass,
          output: args.output,
          appName: args.appName,
          icon: args.icon,
          versionName: args.versionName,
          versionCode: args.versionCode,
          packageName: args.packageName
        };
        const report = await executeEditCommand(args.input, options);
        return {
          content: [{ type: 'text', text: formatTextReport(report) }],
          structuredContent: {
            outputFile: report.outputFile,
            stages: report.stages,
            mutationReport: report.mutationReport,
            verify: report.verify
          }
        };
      } catch (error) {
        return toErrorResult(error);
      }
    }
  );

  return server;
}
