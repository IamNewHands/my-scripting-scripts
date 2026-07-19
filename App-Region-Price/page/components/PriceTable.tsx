import { Divider, Grid, GridRow, Text, VStack } from "scripting"
import type { RegionPriceInfo } from "../../types"
import { toCNYLabel } from "../../util/format"
import { regionLabel } from "../../class/itunes"

/** 表头 + 多行：地区 | 当地价格 | 约合人民币 */
export function PriceTable({
  rows,
  showHeader = true,
}: {
  rows: RegionPriceInfo[]
  showHeader?: boolean
}) {
  if (!rows?.length) {
    return (
      <Text font="subheadline" foregroundStyle="secondaryLabel">
        {"暂无价格数据"}
      </Text>
    )
  }

  return (
    <VStack alignment="leading" spacing={6} monospaced={true}>
      {showHeader ? (
        <>
          <PriceTableHeader />
          <Divider />
        </>
      ) : null}
      {rows.map((item, idx) => (
        <VStack key={item.region + String(idx)} alignment="leading" spacing={6}>
          <PriceTableRow item={item} />
          {idx < rows.length - 1 ? <Divider /> : null}
        </VStack>
      ))}
    </VStack>
  )
}

function PriceTableHeader() {
  return (
    <Grid horizontalSpacing={8} verticalSpacing={4} alignment="leading">
      <GridRow>
        <Text
          font="caption"
          fontWeight="semibold"
          foregroundStyle="secondaryLabel"
          frame={{ minWidth: 44 }}
        >
          {"地区"}
        </Text>
        <Text
          font="caption"
          fontWeight="semibold"
          foregroundStyle="secondaryLabel"
          frame={{ maxWidth: "infinity", alignment: "trailing" }}
        >
          {"当地价格"}
        </Text>
        <Text
          font="caption"
          fontWeight="semibold"
          foregroundStyle="secondaryLabel"
          frame={{ minWidth: 72, alignment: "trailing" }}
        >
          {"约合人民币"}
        </Text>
      </GridRow>
    </Grid>
  )
}

function PriceTableRow({ item }: { item: RegionPriceInfo }) {
  let local = "—"
  let cny = "—"
  let note = ""

  if (item.error) {
    local = "失败"
    cny = "—"
    note = item.error
  } else if (!item.price) {
    local = "不可用"
    cny = "—"
  } else {
    local = item.price
    cny = toCNYLabel(item.price, item.currency || item.rate)
  }

  return (
    <VStack alignment="leading" spacing={2}>
      <Grid horizontalSpacing={8} verticalSpacing={2} alignment="center">
        <GridRow>
          <Text font="subheadline" fontWeight="medium" frame={{ minWidth: 44 }} lineLimit={1}>
            {regionLabel(item.region)}
          </Text>
          <Text
            font="subheadline"
            lineLimit={1}
            frame={{ maxWidth: "infinity", alignment: "trailing" }}
          >
            {local}
          </Text>
          <Text
            font="subheadline"
            foregroundStyle={cny === "—" ? "tertiaryLabel" : "primary"}
            frame={{ minWidth: 72, alignment: "trailing" }}
          >
            {cny}
          </Text>
        </GridRow>
      </Grid>
      {note ? (
        <Text font="caption2" foregroundStyle="orange" lineLimit={2}>
          {note}
        </Text>
      ) : null}
    </VStack>
  )
}
