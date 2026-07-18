import { BarChart, Chart, EmptyView, HStack, Rectangle, Spacer, useColorScheme, VStack } from "scripting"
import { searchHistoryBarGradient } from "../model/searchHistoryStyle"
import type { Entry } from "../store/searchHistoryStore"
import { AnimText } from "../../../components/AnimText"

interface Props {
  items: Entry[]
}

const visibleBarCount = 5

export default function SearchHistoryBarChart({ items }: Props) {
  const colorScheme = useColorScheme()
  const barGradient = colorScheme === "dark"
    ? searchHistoryBarGradient.dark
    : searchHistoryBarGradient.light

  if (items.length <= 2) return <EmptyView />

  return (
    <VStack
      listRowBackground={<Rectangle fill="clear" />}
      listRowSeparator="hidden"
      spacing={20}
    >
      <HStack>
        <AnimText font="title2" foregroundStyle="label" fontWeight={"black"}>
          Search Frequency
        </AnimText>
        <Spacer />
      </HStack>
      <Chart
        frame={{ height: 180 }}
        chartScrollableAxes="horizontal"
        chartXVisibleDomain={Math.min(items.length, visibleBarCount)}
        chartYAxis={{
          gridLine: false,
          valueLabel: false,
        }}
        chartXAxis={{ gridLine: false, valueLabel: true }}
      >
        <BarChart
          marks={items.map(item => ({
            label: item.query,
            value: item.count,
            foregroundStyle: barGradient,
            cornerRadius: 8,
            annotation: {
              position: "top",
              spacing: 4,
              content: (
                <AnimText font="caption2" foregroundStyle="secondaryLabel" fontWeight="semibold">
                  {item.count}
                </AnimText>
              ),
            },
            accessibilityLabel: item.query,
            accessibilityValue: `${item.count} 次`,
          }))}
        />
      </Chart>
    </VStack>
  )
}
