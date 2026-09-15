# PDD 快捷提交

在 [Scripting App](https://apps.apple.com/app/scripting/id6479691128) 中把拼多多组队码快速提交到多个互助站点。

> **English**：[README.en.md](./README.en.md)  
> 仓库索引：[../README.md](../README.md) · [../README.en.md](../README.en.md)

**一键导入**  
https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FPDD-Quick-Submit%22%5D

---

## 功能

- 输入 **10 位以内**当作单个码直接发送；超过 10 位自动按 8/9 位整组切分（多码）。
- **并行提交**到多个第三方互助站（publisher / simple 两种协议）。
- **首站成功即返回**：不必等最慢的站，避免「PDD 已成功但脚本还在转」。
- 单码 **总时限 5 秒**；请求 **3 秒超时** + 原生 `timeout` 双保险。
- 结果用数字 **成功数/总数** 显示，例如 `123456789 1/2`。
- 支持 **快捷指令 / 分享文本** 传入组队码（Intent）。

## 结果怎么读

| 示例 | 含义 |
|---|---|
| `123456789 1/2` | 至少 1 个站提交成功（其余站已提前结束） |
| `123456789 2/2` | 2 个站成功 |
| `123456789 0/2 已重复` | 全部失败，并附带一个失败原因 |

## 作者

- **维护者**：[IamNewHands](https://github.com/IamNewHands)
- **主页**：https://github.com/IamNewHands/my-scripting-scripts/tree/main/PDD-Quick-Submit

## 运行要求

| 项 | 说明 |
|---|---|
| Scripting App | iOS TSX 脚本运行环境 |
| 网络 | 访问已配置的互助站域名 |
| 输入 | 8/9 位数字组队码（可多组连写） |

脚本把码提交到第三方互助站，**不直接调用拼多多官方 API**。站点可用性取决于第三方服务。

## 使用方式

1. **一键导入**：  
   https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FPDD-Quick-Submit%22%5D
2. 在 Scripting 中运行，输入组队码；或用快捷指令传入文本。
3. 查看通知 / 返回文本中的 `成功数/总数`。

## 项目结构

```
PDD-Quick-Submit/
├── index.tsx       # 主入口：解析输入、并行提交、汇总结果
├── intent.tsx      # Intent / 快捷指令入口（与 index 同步）
├── script.json     # 元数据 + remoteResource
├── README.md
└── README.en.md
```

## 外部域名 / 隐私

当前默认配置会请求下列站点（以源码 `SITES` 为准）：

- `pdd.xxs666.cn`（`POST /api/codes`，本地 `publisher_token`）
- `pdd.dcvx.cn`（`POST /api/codes`，body `{ code }`）

> `pqpdd.t6k.cn` 自 2026-09 起要求微信安全授权，脚本无法完成，已于 1.3.1 移除。

提交内容为组队码与站点所需 token/cookie。不收集设备密码，不上传 Apple ID。

## 边界说明

- 第三方站失败或限流时，只要另有一站成功仍会显示 `1/2` 等。
- 随机输入的无效码也可能被某站快速接受/拒绝；以拼多多端实际邀请结果为准。
- 站点列表在源码中维护，更换域名需改 `SITES` 后重新发版。

## 发版

- 目录名（ASCII）：`PDD-Quick-Submit`
- Release zip：`…/releases/latest/download/PDD-Quick-Submit.zip`
- `remoteResource.hash` = 整包 zip 的 MD5
- 当前版本：**1.3.1**

### 更新日志

- **1.3.1**：站点 `pqpdd.t6k.cn`（需微信授权）已移除；站点 `pdd.dcvx.cn` 改用新版 `POST /api/codes`；删除首页预检与「单码直发」模式下多余的规则请求（端到端从约 3.5s 降到约 0.2s）；`403` 业务错误按 JSON 消息显示（如「已重复」）；默认规则前缀更新为 `1/8/9`。
- **1.3.0**：≤ 10 位单码直发，9 位码支持。
- **1.2.0**：首站成功即返回 + 单码总时限 + 数字结果。

