# 测试夹具说明

这个目录存放 `apk-cli` 的测试输入样本。

- `minimal-apk/`：最小 APK 结构，用于资源索引、命令行编辑和集成测试
- `minimal-aab/`：单 `base` module 的最小 AAB 结构，用于 AAB 解包与重打包测试
- `icon-png/`：图标替换测试素材
- `keystore/`：签名测试使用的本地 keystore

这些夹具只用于自动化测试，不作为工具的运行时依赖。
