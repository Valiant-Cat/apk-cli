# Fixture 说明

- `minimal-apk/app.apk`: 用 zip 占位方式构造的最小 APK fixture，用于当前集成测试。
- `minimal-aab/app.aab`: 用 zip 占位方式构造的最小 AAB fixture，用于当前集成测试。
- `keystore/debug.jks`: 集成测试签名用 keystore。
- `icon-png/icon.png`: 图标替换测试用占位资源。

这些 fixture 主要用于验证 CLI 链路，不代表真实 Android 构建产物的全部结构。
