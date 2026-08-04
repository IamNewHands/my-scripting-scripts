[根目录](../../CLAUDE.md) > [scripts](../) > **局域网文件传输**

# 局域网文件传输 - 浏览器互传工具

## 模块职责

在局域网或手机热点下，与任意设备的浏览器互传文件、图片和文字。App 端作为本地 HTTP + WebSocket 服务端，浏览器通过扫码/链接直连，双向实时通信，不消耗移动流量。

## 入口与启动

- **App 入口**：`index.tsx` -- 直接启动聊天页
- **分享意图入口**：`intent.tsx` -- 从分享菜单带入文件/图片路径后启动聊天页
- **共用启动流程**：`launch.tsx` -- 起 HTTP/WS 服务 → 后台保活 → 弹聊天页 → 页面关闭后清理退出

## 对外接口

### 本地服务端 (`class/share.ts`)

| 路由 | 方向 | 说明 |
|------|------|------|
| `GET /` | 浏览器 | 返回聊天页 HTML |
| `POST /upload` | 浏览器→App | 文件上传（直传原始字节，文件名走 `?name=`） |
| `GET /dl/<id>` | App→浏览器 | 临时文件下载路由 |
| `WS /ws` | 双向 | 文字消息与连接状态（WebSocket） |

### 关键方法

| 方法 | 说明 |
|------|------|
| `Share.start()` | 启动 HTTP/WS 服务（幂等），监听 66666 或随机端口 |
| `Share.sendText(text)` | App 端发送文字并广播给浏览器 |
| `Share.sendFiles(paths)` | App 端发送文件，注册下载路由并广播 |
| `Share.stop()` | 停止服务、清理连接与接收目录 |
| `Share.drainInbox()` | 页面定时拉取上传事件队列 |

## 关键依赖与配置

- **上传体积上限**：`maxRequestBodySize` 1GB（默认仅 50MB，传大视频会 413）
- **上传直写盘**：`writeAsDataSync(req.body)`，实测完整可靠，省去 base64 中转（内存约 ×2.6）
- **async handler**：使用 `registerAsyncHandler`（同步版已废弃）；async 上下文直接回调 UI 会崩，故上传事件先入 inbox 队列由页面轮询
- **上传目录**：`Documents/uploads`，`stop()` 时整目录删除
- **后台保活**：`BackgroundKeeper.keepAlive()` 维持传输期间后台运行
- **局域网 IPv4**：优先 `en0`（Wi-Fi），热点主机走 `bridge100`

## 数据模型 (`types.ts`)

```typescript
type ChatMessage = {
  id: string; ts: number; role: "app" | "browser"; kind: "text" | "file";
  text?: string; fileName?: string; fileSize?: number; mime?: string; url?: string;
}
```

## 浏览器端 (`class/html.ts`)

- 内联 HTML/CSS/JS，全程引号拼接避免模板冲突
- WebSocket 断线自动 2s 重连
- 上传失败（含 413）在页面显示红字提示
- 明暗自适应配色

## 测试与质量

无自动化测试；关键改动通过临时探针脚本实测（上传直写盘完整性、async handler 响应、关闭清理）。

## 相关文件清单

```
scripts/LAN-File-Transfer/
  index.tsx           # 普通入口
  intent.tsx          # 分享意图入口
  launch.tsx          # 共用启动流程
  types.ts            # 统一类型
  class/share.ts      # HTTP/WS 服务端核心
  class/html.ts       # 浏览器聊天页
  components/Bubble.tsx # 消息气泡
  page/index.tsx      # ChatPage UI
```

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-08-04 | 迁移 async handler | `registerHandler` → `registerAsyncHandler`（同步版已废弃） |
| 2026-08-04 | 上传直写盘 | 去掉 base64 中转，省内存约 60% 并提速 |
| 2026-08-04 | 上传上限 1GB | `maxRequestBodySize` 默认仅 50MB，放宽避免大视频 413 |
| 2026-08-04 | 关闭按钮防误触 | 关闭前确认提示 + 左上角加最小化按钮 + 关闭后强制退出进程 |
