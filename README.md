# my-scripting-scripts

个人自用的 [Scripting App](https://apps.apple.com/app/scripting/id6479691128) 脚本合集。所有脚本均运行在 iOS 上的 Scripting 客户端内，源码为 TypeScript / TSX。

## 目录

| 脚本 | 说明 | 来源 |
|---|---|---|
| [IPA-Tool](./IPA-Tool) | 使用自己的 Apple ID 从 App Store 拉取正版 IPA、支持历史版本降级；配合 Loon/Surge 插件走 `itms-services://` 本地安装 | 原作者：[小白脸 / luestr](https://github.com/luestr) |

> 后续新增脚本按同级子目录追加即可。

---

## IPA-Tool 使用说明

### 它是干什么的

- 用你自己的 Apple ID 登录 iTunes/App Store，走 Apple Configurator 的协议直接向苹果服务器请求 IPA 下载链接。
- 拿到的是**苹果原始签名**的 IPA，脚本只在本地往包里塞两样东西：`iTunesMetadata.plist` 和 `SC_Info/*.sinf`（都是你自己账号对应的授权文件）。
- 不重签、不脱壳、不改 Info.plist，装上去就跟 App Store 亲手下的一样，**不会 7 天失效**。
- 前提：你的 Apple ID 之前"买过"（免费 App 也算获取过）这个 App。

### 账号密码走向（源码级）

- 登录直连苹果官方接口：`POST https://auth.itunes.apple.com/auth/v1/native/fast/`。
- 请求体是 plist，`password` 字段拼接了两步验证码。
- 拿到 Cookie / dsPersonId / storeFront 后**只写入本机 Storage**（`AppleLogin` 键），不上传任何第三方服务器。
- 项目中出现的 `localApi(...)` 是**本地路由分发**，不是网络请求；`services/appleStore/api/localApi.ts` 会把 `/auth/login` 之类的字符串就地转发给 `AuthService.login()`。

### 用到的外部域名（透明清单）

| 域名 | 用途 | 传的内容 |
|---|---|---|
| `auth.itunes.apple.com` | 苹果登录 | Apple ID / 密码 / 2FA |
| `buy.itunes.apple.com` / `p*-buy.itunes.apple.com` | 苹果购买与下载 | dsPersonId、Cookie、App ID |
| `itunes.apple.com` | 搜索 / 详情 / lookup | 关键词、App ID |
| `api.timbrd.com` / `apis.bilin.eu.org` | 查历史版本 ID（第三方版本数据库） | 只发 App 的数字 ID |
| `api.scripting.fun/ipa-plist` | 生成安装用的 manifest.plist（云端方案） | 文件名、BundleId、版本号 |
| `xiaobai.app/install` | 生成安装用的 manifest.plist（本地代理方案，需 Loon/Surge 插件拦截） | 同上，但**不出手机** |

### 安装步骤

1. **下载 IPA**：打开 App Store 授权过的 Apple ID 登录 → 搜索 App → 选版本 → 点下载。
2. **点绿色按钮安装**：脚本会本地起 `http://localhost:8000` 提供 IPA，通过 `itms-services://` 交给系统安装。
3. **必需依赖**：Loon 或 Surge，用于拦截 plist 服务域名 + 本地代理转发。
   - Loon 插件（可莉的插件中心）：<https://kelee.one/Tool/Loon/Lpx/IPATool.lpx>
     - 一键导入：`loon://import?plugin=https://kelee.one/Tool/Loon/Lpx/IPATool.lpx`
   - Surge 用户请到 <https://hub.kelee.one/> 或作者仓库 `luestr/ProxyResource` 找 `IPATool.sgmodule`。
   - 必须开启 Loon/Surge 的 MitM 并信任 CA 证书。
4. **App Store 更新问题**：装完后 App Store 通常显示"未下载"状态（因为系统没有把这次安装上报给苹果账户）。想彻底不被"更新回去"：
   - 关闭 App Store 自动更新；
   - 别手动点 App Store 里那个 App 的更新按钮；
   - 想更稳可以在 Loon 里加规则拦截 App Store 的目录同步接口。

### 已知边界

- 只能下你 Apple ID **获取过**的 App；没获取过的会报错。
- 换 Apple ID 后旧 IPA 打开会闪退（sinf 不匹配）。
- 依赖代理软件的 MitM 拦截才能真正装上——纯 Scripting 装不了。

---

## 关于本仓库

- **协议**：MIT，见 [`LICENSE`](./LICENSE)。
- **各子目录脚本的原始版权归各自原作者所有**；本仓库仅作为个人自用的整理与备份，未做去权/伪造行为。
- 目录里若出现 `IPA-Tool/` 等第三方脚本，二次修改内容以本仓库为准，原版请查看各子目录 `script.json` 中标注的 `author` 与官方源。

## 如何在 Scripting App 里使用

- 方式 A（简单）：把子目录整包复制到 iCloud 的 `Scripting/Documents/scripts/<脚本名>/` 下即可自动出现在 App 里。
- 方式 B：某些脚本的 `script.json` 里带 `remoteResource`，App 会按其中的 URL 自动拉更新——请以那个 URL 的原始仓库为准，不要指向本仓库。
