# My Scripting Scripts

我的 Scripting 应用脚本合集，包含 iOS 桌面小组件、控制台工具等。

> English: [README.en.md](./README.en.md)

## 脚本列表

| 脚本 | 目录 | 说明 |
|------|------|------|
| **自选估值** | [WatchlistValuation](./WatchlistValuation/README.md) | 场外基金按重仓股加权估算盘中估值，管理基金/A股/港股/美股自选，展示当日/持有收益。小组件点击名称查看 7/15/30 日历史图表。非交易时段直接读本地缓存，毫秒级启动。 |
| **金价小组件** | [Gold-Price-Widget](./Gold-Price-Widget/README.md) | 实时查询多家银行黄金价格的桌面/锁屏小组件。支持招商银行、浙商银行、工商银行、民生银行、广发银行、兴业银行、京东黄金、国际伦敦金，含涨跌幅百分比和趋势图。 |
| **磁力资源预览** | [Magnet-Resource-Preview](./Magnet-Resource-Preview/README.md) | 磁力搜索与资源预览工具。支持 xcili.net 搜索、whatslink.info 预览元数据、whos.tv 以图搜片识别番号。支持收藏、复制链接、保存预览截图。 |
| **App 多区价格查询** | [App-Region-Price](./App-Region-Price/README.md) | 查询 App Store 各区价格，支持汇率换算人民币、搜索按名称匹配度排序，展示版本/更新说明/简介。 |
| **App Store 翻译** | [App-Store-Translate](./App-Store-Translate/README.md) | App Store 应用页面翻译工具，支持多语言互译。 |
| **Gist** | [Gist](./Gist/README.md) | GitHub Gist 管理工具，支持创建、编辑、查看和管理 Gist 代码片段。 |
| **IPA-Tool** | [IPA-Tool](./IPA-Tool/README.md) | IPA 文件管理工具，支持安装、签名、查看应用信息等。 |
| **PDD 快捷提交** | [PDD-Quick-Submit](./PDD-Quick-Submit/README.md) | 多站点并行提交拼多多组队码，首成功立即返回，单码总时限 5s。 |
| **Yoinks** | [Yoinks](./Yoinks/README.md) | 媒体下载工具，支持 yt-dlp 下载视频/音频，含历史记录、设置和平台 Cookie 登录。 |
| **局域网文件传输** | [LAN-File-Transfer](./LAN-File-Transfer/README.md) | 在局域网或热点下与任意设备的浏览器互传文件、图片和文字，扫码即连，无需安装应用，不消耗移动流量。 |

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
├── App-Region-Price/          App 多区价格查询
├── App-Store-Translate/       App Store 翻译
├── Gist/                      Gist 管理
├── Gold-Price-Widget/         金价小组件
├── IPA-Tool/                  IPA 工具
├── LAN-File-Transfer/         局域网文件传输
├── Magnet-Resource-Preview/   磁力资源预览
├── PDD-Quick-Submit/          PDD 快捷提交
├── WatchlistValuation/        自选估值
├── Yoinks/                    媒体下载
├── README.md                  本文件（中文）
├── README.en.md               英文文档
└── LICENSE                    许可证
```

## 新增脚本

新增脚本时：
1. 在根目录创建 ASCII 命名的脚本目录
2. 目录内包含 `script.json`、`README.md`（中文文档）、`README.en.md`（英文文档）
3. 更新本 README 的脚本列表

## 许可

MIT