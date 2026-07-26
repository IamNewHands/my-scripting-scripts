# Gist（GitHub Gist 管理）

在 [Scripting App](https://apps.apple.com/app/scripting/id6479691128) 内管理你的 GitHub Gist。

> **English**：[README.md](./README.md)  
> 仓库目录：[../README.zh-CN.md](../README.zh-CN.md) · [../README.md](../README.md)

**一键导入**  
https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FGist%22%5D

---

## 它是干什么的

- 列出你的 GitHub Gist，可展开文件树
- 新建公开/私有 Gist，支持**写入描述**
- 内嵌代码编辑器编辑文件内容
- 在已有 Gist 里添加/重命名/删除文件
- 拷贝文件 raw 链接到剪贴板
- **多账号切换**：通过命名档案维护多个 GitHub Token
- Token 全部存 **iOS Keychain**（本脚本独立域），不落明文 Storage

## Token 与档案管理

1. 打开**设置** → 点右上角 **+** 添加档案
2. 给档案起个**名字**（如「工作号」「个人号」），粘贴有 `gist` 权限的 GitHub PAT
3. 保存时会自动请求 `/user` 拉取 @login 方便辨认
4. 用**切换器**在档案间切换，列表自动刷新
5. 删除档案需输入 `DELETE` 确认

### 如何创建 PAT

- **一键**：[生成含 `gist` 权限的 PAT](https://github.com/settings/tokens/new?scopes=gist&description=Scripting%20Gist)
- 经典 PAT 勾 `gist` 即可；Fine-grained 带 Gist 读写也可用。

## 外部域名

| 域名 | 用途 | 传输内容 |
|------|------|----------|
| `api.github.com` | Gist CRUD + 用户信息 | Token（Bearer 认证） |

所有请求直连 GitHub，不经任何第三方后端。

## 已知边界

- Gist API 默认只返回前 30 个（本版未加分页）
- 不支持通过 UI 删除 Gist 最后一个文件（请直接删整个 Gist）
- `script.json` 的 `remoteResource` 已配置为未来自动更新用；暂未发布 release zip

## 导入与自动更新

- 一键导入：  
  https://scripting.fun/import_scripts?urls=%5B%22https%3A%2F%2Fgithub.com%2FIamNewHands%2Fmy-scripting-scripts%2Ftree%2Fmain%2FGist%22%5D

- `remoteResource.hash` = **zip 整包 MD5**；zip 根目录直接放 `index.tsx` / `script.json`。

## 协议

MIT — 见仓库根目录 [`LICENSE`](../LICENSE)。  
原作作者：[001](https://github.com/001ProMax) · 本仓维护：[IamNewHands](https://github.com/IamNewHands)。