# Feature Requests

用户请求但当前系统尚未具备的能力。

---

## [FR-20260822-001] install-command

**Logged**: 2026-08-22T00:00:00+08:00
**Priority**: high
**Status**: implemented
**Area**: cli

### Summary
`apk-cli` 需要提供单一 `install` 命令，自动识别 APK、XAPK、AAB 并安装。

### Details
用户明确要求不要拆分多个安装子命令，而是通过 `apk-cli install <file>` 自动根据文件类型选择安装流程。

### Suggested Action
后续新增安装格式或设备选项时保持单命令入口，避免引入 `install-apk`、`install-aab` 等分裂命令。
