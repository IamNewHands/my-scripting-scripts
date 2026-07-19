# IPA工具箱（IPA-Tool）

在 [Scripting App](https://apps.apple.com/app/scripting/id6479691128) 内下载旧版 IPA 并安装。

> **English**：[README.md](./README.md)  
> 仓库目录：[../README.zh-CN.md](../README.zh-CN.md) · [../README.md](../README.md)

**一键导入**  
https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FIPA-Tool%22%5D

---

## 它是干什么的

- 用你自己的 Apple ID 登录 iTunes/App Store，走 Apple Configurator 风格协议向苹果请求 IPA 下载链接。
- 拿到的是**苹果原始签名**的 IPA；本地只注入 `iTunesMetadata.plist` 与 `SC_Info/*.sinf`。
- 不重签、不脱壳、不改 Info.plist；**不会 7 天失效**。
- 前提：该 Apple ID 曾经获取过这个 App（免费也算）。

## 账号密码走向（源码级）

- 登录直连：`POST https://auth.itunes.apple.com/auth/v1/native/fast/`
- 请求体 plist，`password` = 密码 + 可选 2FA。
- Cookie / dsPersonId / storeFront **只写本机** `Storage(AppleLogin)`。
- 密码走 **iOS Keychain**（`loginPassword:<account>`），不落明文 Storage。
- `localApi(...)` 是**进程内路由**，不是 HTTP；见 `services/appleStore/api/localApi.ts`。

## 外部域名（透明清单）

| 域名 | 用途 | 传的内容 |
|---|---|---|
| `auth.itunes.apple.com` | 苹果登录 | Apple ID / 密码 / 2FA |
| `buy.itunes.apple.com` / `p*-buy.itunes.apple.com` | 购买与下载 | dsPersonId、Cookie、App ID |
| `itunes.apple.com` | 搜索 / lookup | 关键词、App ID |
| `api.timbrd.com` / `apis.bilin.eu.org` | 历史版本 ID | 仅 App 数字 ID |
| `api.scripting.fun/ipa-plist` | 安装 manifest（云端） | 文件名、BundleId、版本 |
| `xiaobai.app/install` | 安装 manifest（本地代理） | 同上，**不出手机** |
| `https://你的域名/ipa-plist` | 自建 plist | 同上，只到你的服务器 |

## Plist 服务三种模式

| 模式 | 谁生成 | 是否出设备 | 代理 | 自建 |
|---|---|---|---|---|
| **Scripting** | 云端 | App 名 + BundleID + 版本 + IP | 否 | 否 |
| **代理模块** | 本机插件 | **无** | 是 | 否 |
| **自定义** | 你的服务器 | 仅到你 | 否 | 是 |

三种模式都不传 Apple ID/密码/Cookie。

## 自建 plist（Cloudflare Worker 示意）

部署一个响应 `GET /ipa-plist` 并返回 XML 的 Worker。IPA 地址指向 `http://localhost:8000/<fileName>`（应用内 HTTP 服务）。把 Worker URL 填进设置即可。

```js
export default {
  async fetch(request) {
    const url = new URL(request.url)
    if (url.pathname !== "/ipa-plist") {
      return new Response("not found", { status: 404 })
    }
    // 用查询参数拼标准 itms-services manifest XML
    // IPA：http://localhost:8000/<fileName>
    const plist = `<?xml version="1.0" encoding="UTF-8"?>...`
    return new Response(plist, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "no-cache",
      },
    })
  },
}
```

## 安装步骤

1. 用已获取过目标 App 的 Apple ID 登录 → 搜索 → 选版本 → 下载。
2. 点安装：本地 `http://localhost:8000` + `itms-services://`。
3. 需要 Loon/Surge MitM 与信任证书。  
   - Loon：<https://kelee.one/Tool/Loon/Lpx/IPATool.lpx>  
   - Surge：hub.kelee.one 或 `luestr/ProxyResource` 的 `IPATool.sgmodule`
4. 装完后 App Store 可能状态异常：关自动更新，别点该 App 的更新。

## 安全说明（本仓库版本）

- 密码 Keychain 加密存储。
- 会话 Cookie 仅本机。
- 近期版本收敛了图标取色/下载过程的调试日志，降低日志噪音与误泄露风险。
- 本地 8000 端口仅用于安装时提供 IPA。

## 已知边界

- 只能下本账号获取过的 App。
- 换账号后旧 IPA 可能因 sinf 不匹配闪退。
- 安装链路依赖代理 MitM。

## 导入与自动更新

- 一键导入：  
  https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FIPA-Tool%22%5D
- `remoteResource.hash` = **zip 整包 MD5**；zip 根目录直接放 `index.tsx` / `script.json`。

发版：打扁平 zip → Release 上传 → 写 hash → 推 main。

## 协议

MIT — 见仓库根目录 [`LICENSE`](../LICENSE)。  
原作：[luestr](https://github.com/luestr) · 维护：[IamNewHands](https://github.com/IamNewHands)。
