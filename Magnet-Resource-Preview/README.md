# 磁力资源预览

磁力搜索与资源预览工具。支持通过 xcili.net 搜索资源、提取纯磁力链接和文件列表，基于 whatslink.info 查询磁力、ED2K 与下载链接的资源名称、大小、文件数量、类型和截图；支持 whos.tv 以图搜片识别番号后跳转磁力搜索；支持收藏、复制链接、保存预览截图。

> English: [README.en.md](./README.en.md)

## 功能

- **磁力搜索** — 通过 xcili.net 搜索资源，提取纯磁力链接和文件列表
- **资源预览** — 基于 whatslink.info 查询磁力、ED2K 链接的资源名称、大小、文件数量、类型和截图
- **以图搜片** — 支持 whos.tv 以图搜片识别番号后跳转磁力搜索
- **收藏管理** — 收藏资源，复制链接，保存预览截图

## 项目结构

```
Magnet-Resource-Preview/
├── index.tsx                   入口
├── api.ts                      网络请求
├── types.ts                    类型定义
├── utils.ts                    工具函数
├── api/
│   └── whosTv.ts               whos.tv API 封装
├── components/
│   └── Glass.tsx               UI 组件
├── pages/
│   └── ImageSearchPage.tsx     以图搜片页面
├── script.json                 元数据
├── README.md                   本文件（中文）
└── README.en.md                英文文档
```

## 数据源

| 域名 | 用途 | 说明 |
|------|------|------|
| `xcili.net` | 磁力搜索 | 资源搜索与链接提取 |
| `whatslink.info` | 资源预览 | 查询资源元数据与截图 |
| `whos.tv` | 以图搜片 | 番号识别与磁力跳转 |

## 隐私

- 脚本直接调用公开搜索与预览接口
- 不收集、不上传、不分享任何用户信息

## 仓库中的其他脚本

- [自选估值](../WatchlistValuation/README.md) — 基金/股票自选估值小组件
- [金价小组件](../Gold-Price-Widget/README.md) — 实时银行金价查询

## 许可

MIT