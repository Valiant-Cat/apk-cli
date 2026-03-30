# APK CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个基于 Node.js 的 CLI，可对现成的 `apk/aab` 文件执行 inspect、edit、doctor，并支持名称、图标、版本、包名修改后重新签名产物。

**Architecture:** 使用 TypeScript 构建 CLI 和领域层，外部工具链负责解包、重打包、签名，内部资源编辑层负责 manifest、资源和引用图的解析与修改。命令层通过统一的工作目录、日志、JSON 报告和结果校验串联整个编辑流水线，确保输入零污染和失败可诊断。

**Tech Stack:** Node.js 20+, TypeScript, Commander, Vitest, Zod, fast-xml-parser, execa, fs-extra

---

## File Structure

### Root-level files

- Create: `package.json` — 项目元信息、CLI 入口、脚本、依赖声明
- Create: `tsconfig.json` — TypeScript 编译选项
- Create: `vitest.config.ts` — 测试配置
- Create: `.gitignore` — 忽略 `dist/`、`coverage/`、临时工作目录、样本产物
- Create: `README.md` — 使用说明、依赖要求、示例命令

### Source files

- Create: `src/cli.ts` — CLI 入口与 Commander 装配
- Create: `src/commands/edit.ts` — `edit` 命令参数解析与执行入口
- Create: `src/commands/inspect.ts` — `inspect` 命令参数解析与执行入口
- Create: `src/commands/doctor.ts` — `doctor` 命令参数解析与执行入口
- Create: `src/core/errors.ts` — 错误类型与错误码
- Create: `src/core/logger.ts` — 文本/JSON 双输出日志器
- Create: `src/core/result.ts` — 阶段结果、修改报告、校验报告模型
- Create: `src/core/workspace.ts` — 工作目录创建、清理、产物路径管理
- Create: `src/core/config.ts` — 参数归一化、默认目录和缓存目录配置
- Create: `src/toolchain/contracts.ts` — 工具描述、版本与可执行路径模型
- Create: `src/toolchain/detect.ts` — 本机工具探测
- Create: `src/toolchain/download.ts` — 缺失工具下载与缓存
- Create: `src/toolchain/runner.ts` — 外部命令执行封装
- Create: `src/toolchain/android-tools.ts` — `apktool` / `bundletool` / `jarsigner` / `zipalign` / `aapt2` 高层封装
- Create: `src/package/types.ts` — APK/AAB 统一包模型
- Create: `src/package/decode-apk.ts` — APK 解包与重打包链路
- Create: `src/package/decode-aab.ts` — AAB 解包与重打包链路
- Create: `src/package/resource-index.ts` — Manifest、资源文件、图标引用图索引
- Create: `src/package/inspect.ts` — 包信息分析器
- Create: `src/package/sign.ts` — APK/AAB 签名与对齐
- Create: `src/mutations/name.ts` — 名称修改器
- Create: `src/mutations/icon.ts` — 图标修改器
- Create: `src/mutations/version.ts` — 版本修改器
- Create: `src/mutations/package-name.ts` — 包名修改器
- Create: `src/mutations/apply.ts` — 修改器编排与修改报告聚合
- Create: `src/validators/edit-request.ts` — `edit` 参数校验
- Create: `src/validators/keystore.ts` — keystore 参数校验
- Create: `src/reporting/json-report.ts` — JSON 输出与阶段报告序列化
- Create: `src/reporting/text-report.ts` — 文本报告格式化

### Tests and fixtures

- Create: `tests/cli/doctor.test.ts`
- Create: `tests/cli/inspect.test.ts`
- Create: `tests/cli/edit.test.ts`
- Create: `tests/helpers/run-cli.ts`
- Create: `tests/helpers/run-edit-scenario.ts`
- Create: `tests/toolchain/detect.test.ts`
- Create: `tests/package/resource-index.test.ts`
- Create: `tests/mutations/name.test.ts`
- Create: `tests/mutations/icon.test.ts`
- Create: `tests/mutations/version.test.ts`
- Create: `tests/mutations/package-name.test.ts`
- Create: `tests/integration/apk-edit.test.ts`
- Create: `tests/integration/aab-edit.test.ts`
- Create: `tests/reporting/json-report.test.ts`
- Create: `tests/fixtures/README.md`
- Create: `tests/fixtures/minimal-apk/app.apk` — 最小 APK 样本
- Create: `tests/fixtures/minimal-apk/decoded/` — 已解包的 APK fixture
- Create: `tests/fixtures/minimal-aab/app.aab` — 最小 AAB 样本
- Create: `tests/fixtures/minimal-aab/decoded/` — 已解包的 AAB fixture
- Create: `tests/fixtures/icon-png/icon.png` — 替换图标样本
- Create: `tests/fixtures/keystore/debug.jks` — 集成测试使用的签名样本

### Docs

- Modify: `docs/superpowers/specs/2026-03-30-apk-cli-design.md` — 如实现计划需要补充交叉引用，更新链接到 plan
- Create: `docs/superpowers/plans/2026-03-30-apk-cli-implementation.md` — 当前计划文档

## Task 1: Bootstrap Project and Test Harness

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `src/cli.ts`
- Test: `tests/cli/doctor.test.ts`
- Create: `tests/helpers/run-cli.ts`

- [ ] **Step 1: 写一个失败的 CLI smoke test**

```ts
import { describe, expect, it } from 'vitest';
import { runCli } from '../helpers/run-cli';

describe('cli bootstrap', () => {
  it('prints root help', async () => {
    const result = await runCli(['--help']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('apk-cli');
    expect(result.stdout).toContain('doctor');
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- tests/cli/doctor.test.ts`
Expected: FAIL，提示 `runCli` 或 CLI 入口不存在。

- [ ] **Step 3: 最小化创建项目骨架与 CLI 入口**

```json
{
  "name": "apk-cli",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "apk-cli": "dist/cli.js"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run"
  }
}
```

```ts
import { Command } from 'commander';

const program = new Command();
program.name('apk-cli').description('APK/AAB metadata editor CLI');
program.command('doctor').description('Check toolchain');
program.command('inspect').description('Inspect package metadata');
program.command('edit').description('Edit package metadata');
program.parseAsync(process.argv);
```

- [ ] **Step 4: 再跑一次测试确认通过**

Run: `npm test -- tests/cli/doctor.test.ts`
Expected: PASS

- [ ] **Step 5: 提交骨架**

```bash
git add package.json tsconfig.json vitest.config.ts .gitignore src/cli.ts tests/cli/doctor.test.ts tests/helpers/run-cli.ts
git commit -m "chore: bootstrap apk cli project"
```

## Task 2: Add Shared Models, Config, and Error Handling

**Files:**
- Create: `src/core/errors.ts`
- Create: `src/core/logger.ts`
- Create: `src/core/result.ts`
- Create: `src/core/config.ts`
- Create: `tests/cli/inspect.test.ts`

- [ ] **Step 1: 写一个失败的参数归一化测试**

```ts
import { describe, expect, it } from 'vitest';
import { normalizeOutputPath } from '../../src/core/config';

describe('normalizeOutputPath', () => {
  it('rejects using the same file as input and output', () => {
    expect(() => normalizeOutputPath('app.apk', 'app.apk')).toThrow(/output/i);
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- tests/cli/inspect.test.ts`
Expected: FAIL，提示 `normalizeOutputPath` 未导出。

- [ ] **Step 3: 实现共享模型与基础错误类型**

```ts
export class CliError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

export function normalizeOutputPath(input: string, output?: string) {
  if (output && input === output) throw new CliError('INVALID_OUTPUT', 'output path must differ from input');
  return output;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- tests/cli/inspect.test.ts`
Expected: PASS

- [ ] **Step 5: 提交共享基础设施**

```bash
git add src/core/errors.ts src/core/logger.ts src/core/result.ts src/core/config.ts tests/cli/inspect.test.ts
git commit -m "feat: add shared cli core models"
```

## Task 3: Implement `doctor` Command and Toolchain Detection

**Files:**
- Create: `src/commands/doctor.ts`
- Create: `src/toolchain/contracts.ts`
- Create: `src/toolchain/detect.ts`
- Create: `src/toolchain/runner.ts`
- Create: `tests/toolchain/detect.test.ts`
- Modify: `src/cli.ts`

- [ ] **Step 1: 写一个失败的工具探测测试**

```ts
import { describe, expect, it } from 'vitest';
import { detectTool } from '../../src/toolchain/detect';

describe('detectTool', () => {
  it('returns missing when command is unavailable', async () => {
    const result = await detectTool({ name: 'apktool', command: 'missing-apktool' });
    expect(result.status).toBe('missing');
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- tests/toolchain/detect.test.ts`
Expected: FAIL，提示 `detectTool` 未实现。

- [ ] **Step 3: 最小实现工具探测和 `doctor` 命令**

```ts
export async function detectTool(tool: ToolSpec): Promise<ToolDetection> {
  try {
    await execa(tool.command, ['--version']);
    return { name: tool.name, status: 'available' };
  } catch {
    return { name: tool.name, status: 'missing' };
  }
}
```

```ts
program
  .command('doctor')
  .option('--json', 'output json')
  .action(runDoctorCommand);
```

- [ ] **Step 4: 跑单测和命令级 smoke test**

Run: `npm test -- tests/toolchain/detect.test.ts tests/cli/doctor.test.ts`
Expected: PASS

- [ ] **Step 5: 提交 `doctor`**

```bash
git add src/commands/doctor.ts src/toolchain/contracts.ts src/toolchain/detect.ts src/toolchain/runner.ts src/cli.ts tests/toolchain/detect.test.ts tests/cli/doctor.test.ts
git commit -m "feat: add doctor command and tool detection"
```

## Task 4: Implement Workspace Management and External Tool Wrappers

**Files:**
- Create: `src/core/workspace.ts`
- Create: `src/toolchain/download.ts`
- Create: `src/toolchain/android-tools.ts`
- Test: `tests/cli/doctor.test.ts`

- [ ] **Step 1: 写一个失败的工作目录测试**

```ts
import { describe, expect, it } from 'vitest';
import { createWorkspace } from '../../src/core/workspace';

describe('createWorkspace', () => {
  it('creates isolated directories for artifacts and logs', async () => {
    const workspace = await createWorkspace({ baseDir: '.tmp-tests' });
    expect(workspace.logsDir).toContain('logs');
    expect(workspace.artifactsDir).toContain('artifacts');
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- tests/cli/doctor.test.ts`
Expected: FAIL，提示 `createWorkspace` 未实现。

- [ ] **Step 3: 实现工作目录和 Android 工具封装**

```ts
export async function createWorkspace(options: WorkspaceOptions) {
  const root = await fs.mkdtemp(path.join(options.baseDir, 'apk-cli-'));
  const logsDir = path.join(root, 'logs');
  const artifactsDir = path.join(root, 'artifacts');
  await fs.ensureDir(logsDir);
  await fs.ensureDir(artifactsDir);
  return { root, logsDir, artifactsDir };
}
```

```ts
export async function runApktoolDecode(input: string, outputDir: string) {
  return runCommand('apktool', ['d', '-f', input, '-o', outputDir]);
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- tests/cli/doctor.test.ts`
Expected: PASS

- [ ] **Step 5: 提交工作目录与工具包装器**

```bash
git add src/core/workspace.ts src/toolchain/download.ts src/toolchain/android-tools.ts tests/cli/doctor.test.ts
git commit -m "feat: add workspace manager and android tool wrappers"
```

## Task 5: Implement Resource Indexing and `inspect` Command

**Files:**
- Create: `src/package/types.ts`
- Create: `src/package/resource-index.ts`
- Create: `src/package/inspect.ts`
- Create: `src/package/decode-apk.ts`
- Create: `src/package/decode-aab.ts`
- Create: `src/commands/inspect.ts`
- Modify: `src/cli.ts`
- Create: `tests/fixtures/minimal-apk/decoded/`
- Create: `tests/fixtures/minimal-aab/decoded/`
- Test: `tests/package/resource-index.test.ts`
- Test: `tests/cli/inspect.test.ts`

- [ ] **Step 1: 写一个失败的资源索引测试**

```ts
import { describe, expect, it } from 'vitest';
import { buildResourceIndex } from '../../src/package/resource-index';

describe('buildResourceIndex', () => {
  it('finds package name, app label, and icon refs from decoded resources', async () => {
    const index = await buildResourceIndex('tests/fixtures/minimal-apk/decoded');
    expect(index.packageName).toBe('com.example.demo');
    expect(index.labelRefs.length).toBeGreaterThan(0);
    expect(index.iconRefs.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- tests/package/resource-index.test.ts tests/cli/inspect.test.ts`
Expected: FAIL，提示 `buildResourceIndex` 和 `inspect` 命令未实现。

- [ ] **Step 3: 实现索引器和 `inspect` 命令**

```ts
export async function buildResourceIndex(decodedDir: string): Promise<ResourceIndex> {
  const manifest = await fs.readFile(path.join(decodedDir, 'AndroidManifest.xml'), 'utf8');
  const xml = parser.parse(manifest, { ignoreAttributes: false });
  return {
    packageName: xml.manifest['@_package'],
    versionName: xml.manifest['@_android:versionName'],
    versionCode: xml.manifest['@_android:versionCode'],
    labelRefs: collectLabelRefs(xml),
    iconRefs: collectIconRefs(xml),
  };
}
```

```ts
program
  .command('inspect <input>')
  .option('--json', 'output json')
  .action(runInspectCommand);
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- tests/package/resource-index.test.ts tests/cli/inspect.test.ts`
Expected: PASS

- [ ] **Step 5: 提交 `inspect` 能力**

```bash
git add src/package/types.ts src/package/resource-index.ts src/package/inspect.ts src/package/decode-apk.ts src/package/decode-aab.ts src/commands/inspect.ts src/cli.ts tests/package/resource-index.test.ts tests/cli/inspect.test.ts
git commit -m "feat: add inspect command and resource indexing"
```

## Task 6: Implement Request Validation and Edit Pipeline Skeleton

**Files:**
- Create: `src/validators/edit-request.ts`
- Create: `src/validators/keystore.ts`
- Create: `src/commands/edit.ts`
- Create: `src/mutations/apply.ts`
- Modify: `src/cli.ts`
- Test: `tests/cli/edit.test.ts`

- [ ] **Step 1: 写一个失败的 `edit` 参数测试**

```ts
import { describe, expect, it } from 'vitest';
import { parseEditRequest } from '../../src/validators/edit-request';

describe('parseEditRequest', () => {
  it('requires keystore credentials', () => {
    expect(() => parseEditRequest({ input: 'app.apk' })).toThrow(/keystore/i);
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- tests/cli/edit.test.ts`
Expected: FAIL，提示 `parseEditRequest` 未实现。

- [ ] **Step 3: 实现参数校验和 edit 骨架**

```ts
const schema = z.object({
  input: z.string().min(1),
  keystore: z.string().min(1),
  keyAlias: z.string().min(1),
  storePass: z.string().min(1),
  keyPass: z.string().min(1),
});
```

```ts
export async function runEditCommand(options: EditRequest) {
  const request = parseEditRequest(options);
  return runEditPipeline(request);
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- tests/cli/edit.test.ts`
Expected: PASS

- [ ] **Step 5: 提交 edit 骨架**

```bash
git add src/validators/edit-request.ts src/validators/keystore.ts src/commands/edit.ts src/mutations/apply.ts src/cli.ts tests/cli/edit.test.ts
git commit -m "feat: add edit request validation"
```

## Task 7: Implement Name and Version Mutations

**Files:**
- Create: `src/mutations/name.ts`
- Create: `src/mutations/version.ts`
- Test: `tests/mutations/name.test.ts`
- Test: `tests/mutations/version.test.ts`
- Modify: `src/mutations/apply.ts`

- [ ] **Step 1: 写一个失败的名称修改测试**

```ts
import { describe, expect, it } from 'vitest';
import { applyNameMutation } from '../../src/mutations/name';

describe('applyNameMutation', () => {
  it('updates matched string resources across locales', async () => {
    const report = await applyNameMutation({
      decodedDir: 'tests/fixtures/minimal-apk/decoded',
      value: '新应用名',
    });
    expect(report.changedFiles).toContain('res/values/strings.xml');
    expect(report.changedFiles).toContain('res/values-zh/strings.xml');
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- tests/mutations/name.test.ts tests/mutations/version.test.ts`
Expected: FAIL，提示修改器未实现。

- [ ] **Step 3: 实现名称和版本修改器**

```ts
export async function applyVersionMutation(input: VersionMutationInput) {
  const manifest = await readManifest(input.decodedDir);
  manifest.versionName = input.versionName ?? manifest.versionName;
  manifest.versionCode = input.versionCode ?? manifest.versionCode;
  await writeManifest(input.decodedDir, manifest);
  return { changedFiles: ['AndroidManifest.xml'] };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- tests/mutations/name.test.ts tests/mutations/version.test.ts`
Expected: PASS

- [ ] **Step 5: 提交名称和版本修改器**

```bash
git add src/mutations/name.ts src/mutations/version.ts src/mutations/apply.ts tests/mutations/name.test.ts tests/mutations/version.test.ts
git commit -m "feat: add name and version mutations"
```

## Task 8: Implement Icon Mutation with 2.5 Scope

**Files:**
- Create: `src/mutations/icon.ts`
- Test: `tests/mutations/icon.test.ts`
- Modify: `src/package/resource-index.ts`
- Modify: `src/mutations/apply.ts`

- [ ] **Step 1: 写一个失败的图标修改测试**

```ts
import { describe, expect, it } from 'vitest';
import { applyIconMutation } from '../../src/mutations/icon';

describe('applyIconMutation', () => {
  it('replaces launcher, roundIcon, and adaptive icon assets', async () => {
    const report = await applyIconMutation({
      decodedDir: 'tests/fixtures/minimal-apk/decoded',
      iconPath: 'tests/fixtures/icon-png/icon.png',
    });
    expect(report.replacedResources).toContain('@mipmap/ic_launcher');
    expect(report.replacedResources).toContain('@mipmap/ic_launcher_round');
    expect(report.replacedResources).toContain('@mipmap-anydpi-v26/ic_launcher');
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- tests/mutations/icon.test.ts`
Expected: FAIL，提示图标引用收集或修改器未实现。

- [ ] **Step 3: 实现 2.5 范围图标修改器**

```ts
export async function applyIconMutation(input: IconMutationInput) {
  const refs = await collectLauncherIconRefs(input.decodedDir);
  await replaceRasterTargets(refs.rasterTargets, input.iconPath);
  await updateAdaptiveIconLayers(refs.adaptiveTargets, input.iconPath);
  return { replacedResources: refs.resourceNames };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- tests/mutations/icon.test.ts`
Expected: PASS

- [ ] **Step 5: 提交图标修改能力**

```bash
git add src/mutations/icon.ts src/package/resource-index.ts src/mutations/apply.ts tests/mutations/icon.test.ts
git commit -m "feat: add icon mutation support"
```

## Task 9: Implement Package Name Mutation and Risk Reporting

**Files:**
- Create: `src/mutations/package-name.ts`
- Test: `tests/mutations/package-name.test.ts`
- Modify: `src/package/resource-index.ts`
- Modify: `src/mutations/apply.ts`

- [ ] **Step 1: 写一个失败的包名修改测试**

```ts
import { describe, expect, it } from 'vitest';
import { applyPackageNameMutation } from '../../src/mutations/package-name';

describe('applyPackageNameMutation', () => {
  it('updates manifest package and reports unresolved string references', async () => {
    const report = await applyPackageNameMutation({
      decodedDir: 'tests/fixtures/minimal-apk/decoded',
      nextPackageName: 'com.example.renamed',
    });
    expect(report.changedFiles).toContain('AndroidManifest.xml');
    expect(report.risks).toBeDefined();
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- tests/mutations/package-name.test.ts`
Expected: FAIL，提示包名修改器未实现。

- [ ] **Step 3: 实现包名修改器与风险报告**

```ts
export async function applyPackageNameMutation(input: PackageNameMutationInput) {
  const changedFiles = await rewriteManifestAndAuthorities(input.decodedDir, input.nextPackageName);
  const unresolved = await scanRemainingPackageStrings(input.decodedDir, input.nextPackageName);
  return {
    changedFiles,
    risks: unresolved.map((item) => `unresolved reference: ${item}`),
  };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- tests/mutations/package-name.test.ts`
Expected: PASS

- [ ] **Step 5: 提交包名修改器**

```bash
git add src/mutations/package-name.ts src/package/resource-index.ts src/mutations/apply.ts tests/mutations/package-name.test.ts
git commit -m "feat: add package name mutation reporting"
```

## Task 10: Implement APK Rebuild, Align, Sign, and Verify Pipeline

**Files:**
- Create: `src/package/sign.ts`
- Modify: `src/package/decode-apk.ts`
- Modify: `src/package/inspect.ts`
- Modify: `src/commands/edit.ts`
- Create: `tests/helpers/run-edit-scenario.ts`
- Create: `tests/fixtures/minimal-apk/app.apk`
- Create: `tests/fixtures/keystore/debug.jks`
- Test: `tests/integration/apk-edit.test.ts`

- [ ] **Step 1: 写一个失败的 APK 集成测试**

```ts
import { describe, expect, it } from 'vitest';
import { runEditScenario } from '../helpers/run-edit-scenario';

describe('apk edit integration', () => {
  it('rebuilds, signs, and verifies an edited apk', async () => {
    const result = await runEditScenario('tests/fixtures/minimal-apk/app.apk', {
      appName: '新应用名',
      versionName: '2.0.0',
      versionCode: 200,
      packageName: 'com.example.changed',
      icon: 'tests/fixtures/icon-png/icon.png',
    });
    expect(result.outputFile).toMatch(/\.apk$/);
    expect(result.verify.packageName).toBe('com.example.changed');
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- tests/integration/apk-edit.test.ts`
Expected: FAIL，提示 edit pipeline 尚未接通重打包/签名。

- [ ] **Step 3: 实现 APK 编辑流水线**

```ts
export async function runApkEditPipeline(request: EditRequest) {
  const workspace = await createWorkspace({ baseDir: request.workDir });
  const decodedDir = await decodeApk(request.input, workspace);
  const mutationReport = await applyMutations(decodedDir, request);
  const unsignedApk = await buildApk(decodedDir, workspace);
  const signedApk = await alignAndSignApk(unsignedApk, request.keystore);
  const verify = await inspectPackage(signedApk);
  return { workspace, mutationReport, outputFile: signedApk, verify };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- tests/integration/apk-edit.test.ts`
Expected: PASS

- [ ] **Step 5: 提交 APK 编辑流水线**

```bash
git add src/package/sign.ts src/package/decode-apk.ts src/package/inspect.ts src/commands/edit.ts tests/helpers/run-edit-scenario.ts tests/fixtures/minimal-apk/app.apk tests/fixtures/keystore/debug.jks tests/integration/apk-edit.test.ts
git commit -m "feat: add apk rebuild and sign pipeline"
```

## Task 11: Implement AAB Edit and Re-Bundle Pipeline

**Files:**
- Modify: `src/package/decode-aab.ts`
- Modify: `src/commands/edit.ts`
- Create: `tests/fixtures/minimal-aab/app.aab`
- Test: `tests/integration/aab-edit.test.ts`

- [ ] **Step 1: 写一个失败的 AAB 集成测试**

```ts
import { describe, expect, it } from 'vitest';
import { runEditScenario } from '../helpers/run-edit-scenario';

describe('aab edit integration', () => {
  it('edits and rebuilds an aab bundle', async () => {
    const result = await runEditScenario('tests/fixtures/minimal-aab/app.aab', {
      appName: 'Bundle 新名',
      packageName: 'com.example.bundle.changed',
    });
    expect(result.outputFile).toMatch(/\.aab$/);
    expect(result.verify.packageName).toBe('com.example.bundle.changed');
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- tests/integration/aab-edit.test.ts`
Expected: FAIL，提示 AAB 链路未实现。

- [ ] **Step 3: 实现 AAB 解包、重建、签名流程**

```ts
export async function runAabEditPipeline(request: EditRequest) {
  const decodedDir = await decodeAab(request.input, request.workspace);
  await applyMutations(decodedDir, request);
  const rebuiltAab = await buildAab(decodedDir, request.workspace);
  const signedAab = await signAab(rebuiltAab, request.keystore);
  return { outputFile: signedAab, verify: await inspectPackage(signedAab) };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- tests/integration/aab-edit.test.ts`
Expected: PASS

- [ ] **Step 5: 提交 AAB 编辑能力**

```bash
git add src/package/decode-aab.ts src/commands/edit.ts tests/fixtures/minimal-aab/app.aab tests/integration/aab-edit.test.ts
git commit -m "feat: add aab edit pipeline"
```

## Task 12: Add Reporting, Docs, and Final Verification

**Files:**
- Create: `src/reporting/json-report.ts`
- Create: `src/reporting/text-report.ts`
- Create: `tests/fixtures/README.md`
- Create: `tests/reporting/json-report.test.ts`
- Modify: `README.md`
- Modify: `src/commands/edit.ts`
- Modify: `src/commands/inspect.ts`
- Modify: `src/commands/doctor.ts`

- [ ] **Step 1: 写一个失败的 JSON 报告测试**

```ts
import { describe, expect, it } from 'vitest';
import { formatJsonReport } from '../../src/reporting/json-report';

describe('formatJsonReport', () => {
  it('serializes stage results and mutation reports', () => {
    const output = formatJsonReport({ stages: [{ name: 'detect', status: 'ok' }] });
    expect(output).toContain('detect');
    expect(output).toContain('ok');
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- tests/reporting/json-report.test.ts`
Expected: FAIL，提示报告格式化能力未实现。

- [ ] **Step 3: 实现报告输出并补全文档**

```ts
export function formatJsonReport(report: CliReport) {
  return JSON.stringify(report, null, 2);
}
```

```md
## Usage

```bash
apk-cli doctor
apk-cli inspect app.apk --json
apk-cli edit app.apk --app-name Demo --keystore demo.jks ...
```
```

- [ ] **Step 4: 跑完整验证集**

Run: `npm test && npm run build`
Expected: 所有单测、集成测试通过，TypeScript 编译成功。

- [ ] **Step 5: 提交最终整理**

```bash
git add src/reporting/json-report.ts src/reporting/text-report.ts README.md tests/fixtures/README.md tests/reporting/json-report.test.ts src/commands/edit.ts src/commands/inspect.ts src/commands/doctor.ts
git commit -m "docs: finalize cli reporting and usage docs"
```

## Verification Checklist

- 使用 `@superpowers/test-driven-development` 严格按 Red-Green-Refactor 执行每个任务。
- 在宣称完成前，使用 `@superpowers/verification-before-completion` 跑完整测试和构建验证。
- 每个集成测试都要清理测试工作目录，避免污染仓库。
- 所有新依赖都应在 README 中说明用途和本机前置条件。
- `doctor` / `inspect` / `edit` 都需要同时支持文本输出和 `--json` 输出。
- `edit` 流水线必须在最终产物上再次执行一次 `inspect` 校验。

## Risks to Watch During Implementation

- AAB 处理链路可能需要额外 fixture 生成脚本，若样本不可提交，应补充本地生成说明。
- 图标替换如果涉及矢量资源，需要明确首版是否降级为报错或跳过并报告。
- 包名修改器若发现 smali / 业务字符串残留，应报告风险，而不是静默继续。
- 工具自动下载需要校验平台差异，优先先覆盖 macOS 与 Linux。
