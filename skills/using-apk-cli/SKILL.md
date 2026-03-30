---
name: using-apk-cli
description: Use when an agent needs to inspect, edit, sign, or verify APK or AAB packages with apk-cli, whether installed as a command or available from this repository.
---

# Using apk-cli

## The Rule

当任务涉及 APK 或 AAB 的名称、图标、版本号、包名、签名、环境检查或结果校验时，优先使用 `apk-cli`，不要直接拼凑零散的 `apktool`、`bundletool`、`apksigner` 命令，除非目标就是调试底层工具链。

不要预设 `apk-cli` 一定已经全局安装，也不要预设当前一定在源码仓库里。先解析可用入口，再按统一流程调用。对未知包先 `inspect`，确认包名、版本、名称资源和图标引用，再决定是否 `edit`。

## Bootstrap

先解析一个可用入口，并把后续所有命令都统一写成 `"$APK_CLI ..."`。

推荐顺序：

1. 优先检查已安装命令：

```bash
apk-cli --help
```

如果可用：

```bash
APK_CLI="apk-cli"
```

2. 如果当前就在源码仓库里，再检查构建产物：

```bash
test -f dist/cli.js
```

如果存在：

```bash
APK_CLI="node dist/cli.js"
```

3. 如果当前是源码仓库但还没构建：

```bash
npm install
npm run build
APK_CLI="node dist/cli.js"
```

4. 如果既没有已安装命令，也不在源码仓库里：
- 先安装 `apk-cli`
- 安装完成后再继续

不要在 `APK_CLI` 还没解析出来之前直接调用 `doctor / inspect / edit`。

## Workflow

1. 先确认输入路径真实存在。文件名里有空格、`&` 等特殊字符时，一律用引号包住绝对路径。
2. 先执行 `doctor`，确认工具链可用。首次运行会自动下载官方依赖到 `~/.apk-cli/tools`。
3. 对目标包先执行 `inspect`，确认当前状态和资源引用。
4. 需要修改时再执行 `edit`，并显式提供 `--output`，避免产物落在不可预期的位置。
5. `edit` 完成后，再对输出文件执行一次 `inspect` 做结果校验。

## Command Patterns

环境检查：

```bash
$APK_CLI doctor
$APK_CLI doctor --json
```

只读检查：

```bash
$APK_CLI inspect '/abs/path/app.apk'
$APK_CLI inspect '/abs/path/app.aab' --json
```

修改并重签名：

```bash
$APK_CLI edit '/abs/path/app.apk' \
  --output '/abs/path/app-edited.apk' \
  --app-name 'New Name' \
  --icon '/abs/path/icon.png' \
  --version-name '2.0.0' \
  --version-code '200' \
  --package-name 'com.example.changed' \
  --keystore '/abs/path/release.jks' \
  --store-pass '***' \
  --key-alias 'release' \
  --key-pass '***'
```

## Verification

`edit` 的阶段进度默认输出到 `stderr`，最终文本结果或 JSON 输出到 `stdout`。这意味着：

- 面向人类观察进度时，看终端滚动的阶段日志
- 面向脚本消费结果时，读 `stdout`
- `--json` 不会包含进度日志，进度仍然在 `stderr`

正常阶段顺序是：

- `decode`
- `mutate`
- `build`
- `sign`
- `verify`

如果需要确认命令是不是仍在工作，可以查看相关子进程，例如：

```bash
ps -Ao pid,ppid,%cpu,%mem,etime,command | egrep 'apktool|bundletool|aapt2|apksigner|zipalign' | grep -v egrep
```

## Red Flags

出现这些情况时，不要继续盲试：

- `ENOENT`：先检查输入路径是否真实存在，而不是怀疑 `edit` 参数解析。
- 缺少 `keystore` 参数：`edit` 不会跳过签名，修改后的包必须重签名。
- 想覆盖安装旧应用：必须使用和原应用相同的签名证书，否则只能卸载重装。
- 大 APK 长时间无输出：如果阶段日志还在推进，或 `apktool` / `aapt2` 进程仍在高 CPU 运行，这通常不是卡死。
- AAB 修改失败：当前只支持单 `base` module 的 bundle，多 module AAB 会直接失败，这是已知边界，不是偶发错误。
- `APK_CLI` 尚未解析成功：先解决入口问题，再讨论业务问题。

## Output Contract

对 Agent 来说，推荐输出顺序是：

1. 解析到的 `APK_CLI` 入口
2. 输入文件和目标动作
3. `doctor` 或 `inspect` 得到的关键事实
4. 实际执行的 `edit` 命令
5. 输出文件路径
6. 最终 `inspect` 校验结果

不要只说“改好了”。至少要给出：

- 实际使用的是 `apk-cli` 还是 `node dist/cli.js`
- 输出文件路径
- 是否完成签名
- 包名、版本、名称是否符合目标
- 若失败，失败阶段在 `decode / mutate / build / sign / verify` 的哪一步
