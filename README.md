# apk-cli

一个基于 Node.js 的 APK/AAB 元数据修改 CLI。

## 当前能力

- `doctor`: 检查基础工具链。
- `inspect`: 读取 decoded 目录，或当前测试用 zip 占位 APK/AAB 的 manifest 元数据。
- `edit`: 修改应用名、图标、版本号、包名，并输出重新签名后的产物。

## 使用示例

```bash
apk-cli doctor
apk-cli inspect tests/fixtures/minimal-apk/app.apk --json
apk-cli edit tests/fixtures/minimal-apk/app.apk \
  --app-name 新应用名 \
  --version-name 2.0.0 \
  --version-code 200 \
  --package-name com.example.changed \
  --icon tests/fixtures/icon-png/icon.png \
  --keystore tests/fixtures/keystore/debug.jks \
  --store-pass android \
  --key-alias debug \
  --key-pass android
```

## 前置条件

- Node.js
- `zip` / `unzip`
- `java`, `keytool`, `jarsigner`

## 已知限制

- 当前集成测试使用 zip 占位 fixture 验证编辑、重打包和签名链路，不是完整 `apktool` / `zipalign` Android 生产流水线。
- `doctor` 目前只做最小工具探测。
- 包名修改会输出风险项，但不会承诺修复所有业务硬编码引用。
