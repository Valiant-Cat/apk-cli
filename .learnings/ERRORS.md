# Errors

命令失败、集成异常与排障记录。

---

## [ERR-20260822-001] install-test-mock

**Logged**: 2026-08-22T00:00:00+08:00
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
安装测试初版 mock 只识别默认 `adb` 命令，未覆盖自定义 `adbPath`。

### Details
AAB 安装测试传入 `/opt/android/adb` 后，mock 没有返回设备列表，导致 `--serial` 设备解析失败。

### Suggested Action
测试命令 runner 时按参数语义识别 `devices` 等子命令，不要把 mock 绑定到单一二进制路径。

## [ERR-20260822-002] bundletool-cache-integrity

**Logged**: 2026-08-22T00:00:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: toolchain

### Summary
本机 `~/.apk-cli/tools/bundletool-all-1.18.3.jar` 缓存损坏会导致 AAB 流程失败。

### Details
损坏 jar 执行时报“没有主清单属性”。工具链下载逻辑原先只检查文件存在，不校验内容完整性。

### Suggested Action
对关键托管工具增加 checksum 校验；发现缓存不匹配时删除并重新下载。
