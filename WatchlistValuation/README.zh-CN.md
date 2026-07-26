# 自选估值

> English version: [README.md](./README.md)

在 iOS 桌面小组件追踪基金盘中估值、A 股 / 港股 / 美股行情，展示当日/持有收益与 7/15/30 日历史图表。**非交易时段**直接读本地缓存，毫秒级启动。

![version](https://img.shields.io/badge/version-2.0.0-blue)
![platform](https://img.shields.io/badge/platform-iOS-lightgrey)
![license](https://img.shields.io/badge/license-MIT-green)

## 功能

- **场外基金** — 按重仓股加权估算盘中估值；东财 API 有 `gsz/gszzl` 字段时直接采用，否则按持仓加权计算
- **A 股 / 港股 / 美股** — 腾讯 smartbox 搜索（中文 / 拼音 / 代码）；美股 1-5 字母 ticker 通过东财行情兜底
- **历史图表** — 7/15/30 日历史（A 股 / 港股走腾讯日 K；美股暂不支持）
- **持仓 tab** — 基金 / ETF 展示前 10 大重仓 + 实时行情
- **非交易时段本地缓存** — 盘后/午休/周末/节假日小组件直接读本地，**1ms 完成**；手动"刷新"按钮永远实拉
- **涨跌色方向** — 红涨绿跌（中国习惯）/ 绿涨红跌（海外习惯）可切换
- **搜索过滤框** — 自选 20+ 时按名称/代码/别名过滤
- **输入防抖** — 连续输入 300ms 内只在停顿时落盘

## 数据源

| 域名 | 用途 | 说明 |
|------|------|------|
| `fundmobapi.eastmoney.com` | 基金净值 / 重仓 / 昨日净值 | 基金专用 |
| `push2.eastmoney.com` / `push2delay.eastmoney.com` | A 股 / 港股 / 美股 行情 | 新浪（CN 兜底） |
| `web.ifzq.gtimg.cn`（腾讯） | 股票搜索（smartbox）、A 股/港股 日 K（fqkline） | 统一 A 股 + 港股 K 线 |
| 本地 Storage | 所有缓存、自选、配置、快照 | 进程重启后保留 |

## 项目结构

```
自选估值/
├── index.tsx                    490 行  控制台入口
├── widget.tsx                   220 行  小组件入口（run() + 缓存加载）
├── app_intents.tsx              196 行  9 个 AppIntent（页面/图表/刷新）
├── script.json                          元数据
├── CHANGELOG.md                         版本历史
├── README.md / README.zh-CN.md          本文件
│
├── lib/                                 业务逻辑
│   ├── api/{fund,stock}.ts              A/HK/US 数据拉取
│   ├── cache/
│   │   ├── prevnav.ts                   基金昨日净值（48h + 5min 负缓存）
│   │   └── snapshot.ts                  小组件非交易时段快照
│   ├── calc/{estimate,profit}.ts        估值 + PnL 计算
│   ├── format.ts                        涨跌色 / 金额 / 百分比
│   ├── http.ts                          fetch + parseNumber
│   ├── portfolio.ts                     loadPortfolioSnapshot + loadPortfolioSmart
│   ├── storage.ts                       9 个 Storage 键 + 迁移
│   ├── types.ts                         全部 TS 类型
│   └── util/{async,debounce,marketHours}.ts
│
├── components/                          控制台子组件
│   ├── FundSection.tsx            194 行
│   ├── StockSection.tsx           190 行
│   ├── PreviewSection.tsx         179 行
│   ├── SettingsSection.tsx        129 行
│   └── ListFilter.tsx              33 行
│
├── widget/                              小组件子视图
│   ├── common/fontScale.ts             字号/布局工具
│   └── views/
│       ├── Chart.tsx             400 行
│       └── List.tsx              478 行
│
└── tests/                              69 个单元测试
    ├── runner.ts                        极简 expect DSL
    ├── run-all.ts                       入口
    └── {format,estimate,profit,http,debounce,
       fontScale,searchStock,fetchStockHistory,
       marketHours}.test.ts
```

## Storage 键清单

| 键 | 内容 | 生命周期 |
|-----|------|----------|
| `watchlist.funds` | 用户自选基金 | 永久 |
| `watchlist.stocks` | 用户自选股票（A/HK/US） | 永久 |
| `watchlist.widgetConfig` | 字号 / 行数 / 涨跌色 | 永久 |
| `watchlist.widgetPage` | 当前页（fund / stock / chart） | 永久 |
| `watchlist.listPage.fund` | 基金列表当前页 | 永久 |
| `watchlist.listPage.stock` | 股票列表当前页 | 永久 |
| `watchlist.widgetChart` | 图表状态（code / kind / days / page / tab） | 永久 |
| `watchlist.holdings.<code>` | 基金前 10 重仓（12h TTL） | 临时 |
| `fund_prevnav_cache` | 基金昨日净值（48h + 跨日） | 临时 |
| `fund_prevnav_negcache` | 失败负缓存（5min） | 临时 |
| `watchlist.chartHistory.<kind>.<secid>` | 30 日 K 线（5min TTL） | 临时 |
| `watchlist.snapshot` | 完整组合快照（非交易时段用） | 到次日 |

## 非交易时段行为

小组件**自动检测**市场时段：

- **A 股** — 周一-周五 09:30-11:30 / 13:00-15:00（北京时间）
- **港股** — 周一-周五 09:30-12:00 / 13:00-16:00
- **美股** — 周一-周五 22:30-04:00（跨午夜，取夏冬令时中点）

所有持仓市场都关闭时（午休 / 盘后 / 周末 / 节假日），小组件跳过网络请求，直接读本地快照。**新一天首次唤醒**或**缓存过期**时重新拉取并写回。

> ⚠️ 当前**未包含 A 股节假日表**（春节 / 国庆等）。在这些天，小组件会把周一-周五 09:30-15:00 视为交易时段；如果 API 返回空，会自动降级使用上一交易日收盘快照。

## 搜索行为

| 关键词 | 腾讯 smartbox | 东财兜底 |
|--------|----------------|----------|
| 中文名（如"兆易"） | 排序返回 | – |
| 拼音 / 缩写（如"maotai"） | 排序返回 | – |
| 6 位 A 股代码（如"600519"） | – | 直接拉行情拿名称 |
| 5 位港股代码（如"00700"） | – | 直接拉行情拿名称 |
| 1-5 位美股 ticker（如"AAPL"） | – | 直接拉行情拿名称 |

腾讯响应中 CJK 字符以 `\uXXXX` 转义；通过 `JSON.parse('"' + s + '"')` 反转义。

## K 线覆盖

| 市场 | 数据源 | 字段 | 备注 |
|------|--------|------|------|
| A 股 | 腾讯 fqkline | `qfqday`（前复权） | 30 天窗口 |
| 港股 | 腾讯 fqkline | `day` | 30 天窗口 |
| 美股 | – | – | 暂不支持（腾讯 `usfqkline` 返回 type error） |

小组件图表视图**预先加载 30 天**，切 7/15/30 日只切视图不重拉。缓存 TTL 5 分钟。

## 单元测试

```bash
scripting-ts run tests/run-all.ts
```

输出：
```
总测试数: 69
通过:     69
失败:     0
耗时:     ~2000ms
```

测试覆盖：format / estimate / profit / http / debounce / fontScale / marketHours / searchStock / fetchStockHistory 共 9 个模块。

## 隐私

- 脚本直接调用**公开行情 API**（东财 / 腾讯），不经过任何中转服务
- 自选数据存在**本地 Scripting Storage**（per-device，不上传）
- 脚本**不收集、不上传、不分享**任何用户信息
- 控制台点击"刷新预览"按钮会调用接口；其他时段自动从本地读

## 外部域名

- `fundmobapi.eastmoney.com` — 基金净值 / 重仓
- `push2.eastmoney.com` / `push2delay.eastmoney.com` — 股票行情
- `hq.sinajs.cn` — 新浪兜底（仅 A 股）
- `smartbox.gtimg.cn` — 腾讯搜索
- `web.ifzq.gtimg.cn` — 腾讯日 K

## License

MIT
