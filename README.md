# My Scripting Scripts

我的 Scripting 应用脚本合集，包含 iOS 桌面小组件、控制台工具等。

> English: [README.en.md](./README.en.md)

## 脚本列表

### [自选估值](./WatchlistValuation/README.md)

场外基金按重仓股加权估算盘中估值，管理基金 / A 股 / 港股 / 美股自选，展示当日/持有收益。小组件点击名称查看 7/15/30 日历史图表。非交易时段直接读本地缓存，毫秒级启动。

- [📖 中文文档](./WatchlistValuation/README.md) | [📖 English Docs](./WatchlistValuation/README.en.md)
- 一键导入：`https://scripting.fun/import_scripts?urls=` + URL 编码 `["https://github.com/IamNewHands/my-scripting-scripts/tree/main/WatchlistValuation"]`

### [金价小组件](./Gold-Price-Widget/README.md)

实时查询多家银行黄金价格的桌面 / 锁屏小组件。支持招商银行、浙商银行、工商银行、民生银行、广发银行、兴业银行、京东黄金、国际伦敦金，含涨跌幅百分比和趋势图。

- [📖 中文文档](./Gold-Price-Widget/README.md) | [📖 English Docs](./Gold-Price-Widget/README.en.md)
- 一键导入：`https://scripting.fun/import_scripts?urls=` + URL 编码 `["https://github.com/IamNewHands/my-scripting-scripts/tree/main/Gold-Price-Widget"]`

### [磁力资源预览](./Magnet-Resource-Preview/README.md)

磁力搜索与资源预览工具。支持通过 xcili.net 搜索资源、提取纯磁力链接和文件列表，基于 whatslink.info 查询磁力、ED2K 与下载链接的资源元数据；支持 whos.tv 以图搜片识别番号后跳转磁力搜索；支持收藏、复制链接、保存预览截图。

- [📖 中文文档](./Magnet-Resource-Preview/README.md) | [📖 English Docs](./Magnet-Resource-Preview/README.en.md)
- 一键导入：`https://scripting.fun/import_scripts?urls=` + URL 编码 `["https://github.com/IamNewHands/my-scripting-scripts/tree/main/Magnet-Resource-Preview"]`

## 通用用法

所有脚本通过 Scripting App 安装使用。您可以通过以下方式安装：

1. **一键导入**：点击上述"一键导入"链接（需在 iOS 设备上打开）
2. **手动安装**：将脚本目录复制到 Scripting 的 `scripts/` 目录

## 自动更新

脚本支持通过 `remoteResource` 自动更新：
- 仓库 Release 中提供 `.zip` 包
- 脚本的 `script.json` 中配置了 `remoteResource.url` 和 `hash`
- Scripting App 会根据配置自动检测并下载更新

## 结构

```
my-scripting-scripts/
├── WatchlistValuation/         自选估值
├── Gold-Price-Widget/          金价小组件
├── Magnet-Resource-Preview/    磁力资源预览
├── README.md                   本文件（中文）
└── README.en.md                英文文档
```

## 新增脚本

新增脚本时：
1. 在根目录创建 ASCII 命名的脚本目录
2. 目录内包含 `script.json`、`README.md`（中文文档）、`README.en.md`（英文文档）
3. 更新本 README 的脚本列表

## 许可

MIT