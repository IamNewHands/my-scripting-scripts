# App多区价格查询

在 [Scripting App](https://apps.apple.com/app/scripting/id6479691128) 中搜索 App Store 应用，对比多个地区的价格。

> **English**: [README.md](./README.md)  
> 仓库索引: [../README.md](../README.md) · [../README.zh-CN.md](../README.zh-CN.md)

**一键导入**  
https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FApp-Region-Price%22%5D

---

## 功能

- **搜索**任意应用名称或关键词。
- 在所有已启用地区**并列对比价格**，一行一个区。
- 价格**自动换算为人民币**（汇率来源：`exchangerate-api.com`）。
- 点击结果进入详情，显示**版本信息**、**发布日期**、**更新说明**、**应用简介**。
- 非中文描述/说明自动调用系统翻译框架译为中文。
- 设置中**自定义地区与货币**（增删、开关）。
- 从**分享菜单 / 快捷指令**传入 App Store 链接直接打开详情（Intent）。

## 特色

- **多区对比表格**：地区代码 + 当地价格 + 约合人民币。
- **搜索排序优化**：结果按名称与查询词的匹配度排序（精确 > 前缀 > 包含）。
- **预览按钮**：右上角「App Store」按钮在 App 内展示产品页；失败时退回 Safari 打开。
- **应用元数据**：版本号、发布日期、简介、更新说明——全部通过系统翻译框架按需译为中文。
- **单区容错**：任意一区请求失败不影响其它区展示，互不拖累。
- **请求超时**：API 调用 10 秒超时，弱网不卡死。
- **输入校验**：地区限定 `[A-Z]{2}`，货币限定 `[A-Z]{3}`；Intent 入口校验 App ID 格式。
- **设置**：启用/禁用地区，添加自定义地区与货币，重复地区自动拦截。

## 作者

- **维护者**: [IamNewHands](https://github.com/IamNewHands)
- **主页**: https://github.com/IamNewHands/my-scripting-scripts/tree/main/App-Region-Price

## 运行要求

| 项 | 说明 |
|---|---|
| Scripting App | iOS TSX 脚本运行环境 |
| 网络 | iTunes API + 汇率 API |
| 系统翻译 | 使用 iOS `Translation` 框架（设备端，可离线） |

无需 Apple ID 登录，不清求任何密码。Lookup 与汇率均为公开数据。

## 使用方式

1. **一键导入**：  
   https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FApp-Region-Price%22%5D
2. **运行**脚本 —— 在搜索栏输入应用名，回车。
3. 点击结果查看**价格对比表** + 版本信息 + 翻译后的简介。
4. 右上角**齿轮设置**可增减地区与货币。
5. 从 App Store **分享链接** → 选择本脚本（Intent）**直达详情页**。

## 项目结构

```
App-Region-Price/
├── index.tsx              # 入口：NavigationSplitView
├── intent.tsx             # Intent 入口：解析分享链接
├── script.json            # 元数据与自动更新配置
├── types.ts               # 共享类型定义
├── class/
│   ├── itunes.ts          # iTunes Search / Lookup API
│   ├── web.ts             # App Store 网页抓取（内购备用）
│   └── rate.ts            # 汇率缓存
├── page/
│   ├── index.tsx          # NavigationSplitView 排布
│   ├── search.tsx         # 搜索 UI + 结果列表 + 预览按钮
│   ├── detail.tsx         # 多区价格表 + 应用信息 + 翻译
│   ├── setting.tsx        # 地区管理
│   └── components/
│       └── PriceTable.tsx # Grid 表格组件
└── util/
    ├── format.ts          # 价格解析 / CNY 换算 / 格式化
    ├── http.ts            # fetchWithTimeout（10s 超时）
    ├── validate.ts        # App ID / 地区 / 链接校验
    └── appInfo.ts         # 元数据提取与翻译管线
```

## 网络请求域名

| 域名 | 用途 | 发送数据 |
|---|---|---|
| `itunes.apple.com` | 公开 App Store 查询 API | 搜索词、App ID、地区代码 |
| `api.exchangerate-api.com` | 汇率数据 | 基准货币代码 |

无第三方追踪，无个人数据。系统翻译完全本地执行。

## 自动更新

```json
"remoteResource": {
  "url": "https://github.com/IamNewHands/my-scripting-scripts/releases/latest/download/App-Region-Price.zip",
  "autoUpdateInterval": 86400,
  "hash": "<zip的MD5>"
}
```

`hash` 为整个 zip 文件的 MD5。zip 根目录直接包含 `index.tsx` / `script.json`（无中间文件夹）。

## 更新记录

- **1.3.0** — 复用 lookup 取元数据（无额外请求）。移除内购展示。翻译管线简化。请求超时。Intent/设置输入校验。搜索结果名称匹配排序。预览按钮兜底。
- **1.2.0** — 多区价格表格 + 人民币换算。地区中文标签。应用简介 / 更新说明 + 系统翻译。
- **1.1.0** — 价格表格：地区 / 当地价 / 人民币。单区容错增强。
- **1.0.0** — 初始搜索 + 多区 Lookup。

## 协议

MIT — 见仓库根 [`LICENSE`](../LICENSE)。