import {
  Button,
  HStack,
  ProgressView,
  Section,
  Spacer,
  Text,
  VStack,
  Widget,
} from "scripting"
import {
  formatMoney,
  formatPct,
  formatPlainMoney,
  formatPrice,
  pnlColor,
} from "../lib/format"
import type { PortfolioSnapshot } from "../lib/types"

export type PreviewSectionProps = {
  loadingPreview: boolean
  snap: PortfolioSnapshot | null
  refreshPreview: () => void
  clearPrevNavCache: () => void
  setStatus: (s: string) => void
  setWidgetPage: (page: "fund" | "stock" | "chart") => void
  redUp: boolean
}

/** 控制台「预览」Tab：刷新/清缓存 + 组合快照 */
export function PreviewSection(props: PreviewSectionProps) {
  const { loadingPreview, snap, refreshPreview, clearPrevNavCache, setStatus, setWidgetPage, redUp } = props
  return (
    <>
      <Section>
        <Button
          title={loadingPreview ? "加载中…" : "刷新预览"}
          action={refreshPreview}
          disabled={loadingPreview}
        />
        <Button
          title="清除缓存"
          action={() => {
            clearPrevNavCache()
            setStatus("昨日净值缓存已清除")
          }}
        />
        <HStack>
          <Button
            title="小组件·基金页"
            action={() => {
              setWidgetPage("fund")
              Widget.reloadAll()
              setStatus("小组件切到基金")
            }}
          />
          <Button
            title="小组件·股票页"
            action={() => {
              setWidgetPage("stock")
              Widget.reloadAll()
              setStatus("小组件切到股票")
            }}
          />
        </HStack>
      </Section>

      {loadingPreview ? (
        <Section>
          <ProgressView />
        </Section>
      ) : null}

      {snap ? (
        <>
          <Section header={<Text>基金合计</Text>}>
            <HStack>
              <Text>当日</Text>
              <Spacer />
              <Text foregroundStyle={pnlColor(snap.fundSummary.dayPnl, redUp)}>
                {formatMoney(snap.fundSummary.dayPnl, 2)}
              </Text>
            </HStack>
            <HStack>
              <Text>持有</Text>
              <Spacer />
              <Text foregroundStyle={pnlColor(snap.fundSummary.holdPnl, redUp)}>
                {formatMoney(snap.fundSummary.holdPnl, 2)}
              </Text>
            </HStack>
            <HStack>
              <Text>市值</Text>
              <Spacer />
              <Text>{formatPlainMoney(snap.fundSummary.marketValue)}</Text>
            </HStack>
          </Section>

          <Section header={<Text>基金明细</Text>}>
            {snap.funds.length === 0 ? (
              <Text foregroundStyle="secondaryLabel">无基金</Text>
            ) : (
              snap.funds.map((r) => (
                <VStack key={r.code} alignment="leading" spacing={4}>
                  <HStack>
                    <Text fontWeight="semibold">{r.name}</Text>
                    <Spacer />
                    <Text foregroundStyle={pnlColor(r.changePct, redUp)}>
                      {r.isOfficial ? "净" : "估"}
                      {formatPct(r.changePct)}
                    </Text>
                  </HStack>
                  <Text font="caption" foregroundStyle="secondaryLabel">
                    份额 {r.shares.toFixed(2)} · 净值 {formatPrice(r.nav)} · 市值 {formatPlainMoney(r.marketValue)}
                  </Text>
                  <HStack>
                    <Text font="caption" foregroundStyle="secondaryLabel">
                      当日 {formatMoney(r.dayPnl, 2)}
                    </Text>
                    <Spacer />
                    <Text font="caption" foregroundStyle={pnlColor(r.holdPnl, redUp)}>
                      持有 {formatMoney(r.holdPnl, 2)} ({formatPct(r.holdRate)})
                    </Text>
                  </HStack>
                </VStack>
              ))
            )}
          </Section>

          <Section header={<Text>股票合计</Text>}>
            <HStack>
              <Text>当日</Text>
              <Spacer />
              <Text foregroundStyle={pnlColor(snap.stockSummary.dayPnl, redUp)}>
                {formatMoney(snap.stockSummary.dayPnl, 2)}
              </Text>
            </HStack>
            <HStack>
              <Text>持有</Text>
              <Spacer />
              <Text foregroundStyle={pnlColor(snap.stockSummary.holdPnl, redUp)}>
                {formatMoney(snap.stockSummary.holdPnl, 2)}
              </Text>
            </HStack>
          </Section>

          <Section header={<Text>股票明细</Text>}>
            {snap.stocks.length === 0 ? (
              <Text foregroundStyle="secondaryLabel">无股票</Text>
            ) : (
              snap.stocks.map((r) => (
                <VStack key={r.secid} alignment="leading" spacing={4}>
                  <HStack>
                    <Text fontWeight="semibold">{r.name}</Text>
                    <Spacer />
                    <Text foregroundStyle={pnlColor(r.changePct, redUp)}>
                      {formatPct(r.changePct)}
                    </Text>
                  </HStack>
                  <Text font="caption" foregroundStyle="secondaryLabel">
                    {r.quantity.toFixed(2)} 股 · 现价 {formatPrice(r.price)}
                  </Text>
                  <HStack>
                    <Text font="caption" foregroundStyle="secondaryLabel">
                      当日 {formatMoney(r.dayPnl, 2)}
                    </Text>
                    <Spacer />
                    <Text font="caption" foregroundStyle={pnlColor(r.holdPnl, redUp)}>
                      持有 {formatMoney(r.holdPnl, 2)}
                    </Text>
                  </HStack>
                </VStack>
              ))
            )}
          </Section>
        </>
      ) : null}
    </>
  )
}
