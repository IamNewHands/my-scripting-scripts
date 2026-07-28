[根目录](../../CLAUDE.md) > [scripts](../) > **招行浙商金价**

# 招行浙商金价 - 实时金价查询

## 模块职责

查询招商银行黄金实时买入/卖出价和浙商银行(京东金融)积存金价格，支持数据源切换，提供多种尺寸的主屏幕/锁屏小组件展示。

## 入口与启动

- **App 入口**：`index.tsx` -- 数据源选择设置页面
- **小组件入口**：`widget.tsx` -- 根据 `Widget.family` 渲染不同尺寸的金价卡片
- **App Intent**：`app_intents.tsx` -- 注册 `RefreshGoldIntent` 用于手动刷新

## 对外接口

### 金价获取 (`utils/fetchGold.ts`)

| 函数 | 数据源 | API |
|------|--------|-----|
| `fetchCMBGoldPrice()` | 招商银行 | `mbmodule-openapi.paas.cmbchina.com` (POST) |
| `fetchZSGoldPrice()` | 浙商银行/京东金融 | `api.jdjygold.com` (GET) |
| `fetchGoldMonitorPrice(type)` | GoldMonitor 聚合 | `jin.20021002.xyz/api.php?type={code}` (GET) |
| `fetchGoldPrice(source)` | 统一入口 | 返回 `GoldPriceResult { buyPrice, sellPrice, changeValue, changePercent, updateTime }` |
| `normalizeUpdateTime(raw)` | 时间格式化 | 统一处理时间戳和字符串格式 |

## 关键依赖与配置

- **数据源切换**：`Storage.get("goldPrice_source")` -- 支持 8 个数据源:
  - `cmb` (招行) / `zs` (浙商) / `icbc` (工行) / `ms` (民生)
  - `cgb` (广发) / `cib` (兴业) / `jd` (京东黄金) / `gj` (国际伦敦金)
- **超时控制**：`AbortController` 4 秒超时
- **银行图标**：使用 SF Symbol `building.columns.fill`，避免 .ico 兼容问题
- **价差显示**：当买入价≠卖出价时显示价差（仅招行有区分）
- **涨跌幅百分比**：GoldMonitor 数据源直接返回 `change_pct`，其他源自动计算

## 数据模型

```typescript
type GoldPriceResult = {
  buyPrice: string;    // 买入价
  sellPrice: string;   // 卖出价
  changeValue: string; // 涨跌幅
  updateTime: string;  // 更新时间 YYYY/MM/DD HH:MM:SS
}
```

## 小组件

| 尺寸 | 展示内容 |
|------|---------|
| accessoryRectangular | 锁屏：简洁买入/卖出/涨跌 |
| systemSmall | 买入价+卖出价+涨跌 |
| systemMedium | 完整金价卡片（含银行图标、刷新按钮） |

## 测试与质量

无自动化测试。

## 相关文件清单

```
scripts/招行浙商金价/
  index.tsx           # 设置页入口（数据源选择）
  widget.tsx          # 小组件渲染（含 WidgetHeader / TrendBars 公共组件）
  app_intents.tsx     # RefreshGoldIntent + SwitchBankIntent
  script.json         # 脚本元数据
  utils/
    fetchGold.ts      # 金价 API 封装（含统一时间格式化）
```

## 变更记录 (Changelog)

| 日期 | 操作 | 说明 |
|------|------|------|
| 2026-03-30 | 初始化 | 首次生成模块文档 |
| 2026-07-28 | 价差+百分比+更多数据源 | 添加 GoldMonitor 聚合 API（工行/民生/广发/兴业/京东/伦敦金），价差显示，涨跌幅百分比 |
| 2026-07-28 | 优化趋势图 | 固定10槽位 + 右对齐 + 全量范围归一化，柱高不再随数据增多而变小 |
