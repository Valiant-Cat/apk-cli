# apk-cli

`apk-cli` 是一个用于修改 Android `apk/aab` 元数据并重新签名的命令行工具。

## 功能

- `doctor`：检查本机工具链
- `inspect`：查看包内名称、版本、包名和图标引用
- `edit`：修改名称、图标、版本号和包名，并重新签名
- `apk-cli mcp serve|start|stop|status`：管理本地 HTTP MCP 服务

## 安装

```bash
npm install
npm run build
```

## 使用

```bash
apk-cli doctor
apk-cli inspect app.apk
apk-cli inspect app.apk --json
apk-cli edit app.apk \
  --keystore release.jks \
  --store-pass xxx \
  --key-alias release \
  --key-pass xxx \
  --app-name "新应用" \
  --version-name 1.2.3 \
  --version-code 123 \
  --package-name com.example.newapp \
  --json
```

## MCP

```bash
apk-cli mcp serve
```

主入口现在是 `apk-cli mcp`：

```bash
apk-cli mcp serve
apk-cli mcp start
apk-cli mcp status
apk-cli mcp stop
```

- `serve`：前台运行 MCP 服务，占用当前终端
- `start`：后台启动本地 HTTP MCP 服务
- `status`：查看后台服务状态
- `stop`：停止后台服务

默认情况下，后台服务会把状态写到 `~/.apk-cli/mcp/server.json`。

- `doctor`
- `inspect`
- `edit`

工具返回同时包含：

- 结构化 `structuredContent`
- 可读文本 `content`

## 说明

- `edit` 需要提供 keystore 参数才能执行签名
- 首次运行 `doctor`、`inspect` 或 `edit` 时，工具会把缺失的官方依赖下载到 `~/.apk-cli/tools`
- `apk` 走 `apktool + zipalign + apksigner` 流水线，`aab` 走 `bundletool + jarsigner` 流水线
- 当前 `aab` 编辑仅支持单 `base` module 的 bundle，多 module bundle 会直接失败并给出原因
- `apk-cli mcp` 复用和 CLI 相同的核心逻辑，不是 shell 包装器
- `inspect` 和 `doctor` 同时支持文本输出和 `--json`
- `edit` 成功时会输出稳定文本摘要，或者在 `--json` 下输出可机读结果
- 测试夹具位于 `tests/fixtures/`
