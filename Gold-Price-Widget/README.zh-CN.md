# 金价小组件

实时查询多家银行黄金价格的 iOS 桌面/锁屏小组件。

[English](README.md) | **中文**

## 功能

- **多银行支持**：招商银行、浙商银行、工商银行、民生银行、广发银行、兴业银行、京东黄金、国际伦敦金 (USD)
- **小组件尺寸**：systemSmall、systemMedium、systemLarge、accessoryRectangular（锁屏）
- **价格展示**：买入/卖出价、涨跌值、涨跌幅百分比
- **趋势图**：10 槽位柱状图，展示近期价格走势
- **数据源切换**：点击银行名称循环切换所有数据源
- **手动刷新**：点击刷新按钮更新价格

## 数据源

| 银行 | 类型 | API |
|------|------|-----|
| 招商银行 | 买入/卖出价 | `mbmodule-openapi.paas.cmbchina.com` (POST) |
| 浙商银行 | 单价格 | `api.jdjygold.com` (GET) |
| 工行/民生/广发/兴业/京东黄金/伦敦金 | 单价格 | `jin.20021002.xyz/api.php` (GET) - GoldMonitor 聚合接口 |

## 文件结构

```
Gold-Price-Widget/
  index.tsx           # 设置页（数据源选择）
  widget.tsx          # 小组件渲染（WidgetHeader / TrendBars 公共组件）
  app_intents.tsx     # RefreshGoldIntent + SwitchBankIntent
  script.json         # 脚本元数据
  utils/
    fetchGold.ts      # 金价 API 封装
CLAUDE.md             # 项目文档
```

## 使用方式

1. 通过 Scripting App 安装
2. 在主屏幕或锁屏添加小组件
3. 点击银行名称切换数据源
4. 点击刷新按钮更新价格

## 隐私说明

- 所有数据直接从公开 API 获取
- 不收集、不传输任何用户数据
- 外部域名：`mbmodule-openapi.paas.cmbchina.com`、`api.jdjygold.com`、`jin.20021002.xyz`

## 许可证

MIT