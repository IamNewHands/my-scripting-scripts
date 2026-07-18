import { Button, EmptyView, HStack, Image, Rectangle, ScrollView, Spacer, VStack, useEffect, useObservable } from "scripting"

import type { Entry } from "../store/searchHistoryStore"
import { AnimText } from "../../../components/AnimText"

interface Props {
  items: Entry[]
  hidden: boolean
  filterText?: string
  expanded?: boolean
  onTap: (query: string) => void
  onDelete: (query: string) => void
  onClear: () => void
}
const historyRowHeight = 25
const historyRowPadding = 10
const historyRowSpacing = historyRowPadding * 2
const historyDividerOffset = historyRowSpacing / 2
const collapsedVisibleCount = 4
const expandedVisibleCount = 8


export default function SearchHistorySection({ items, hidden, filterText = "", expanded = false, onTap, onDelete, onClear }: Props) {
  const visibleItems = useObservable<Entry[]>(items)

  useEffect(() => {
    const normalizedFilterText = filterText.trim().toLowerCase()
    const matchedItems = normalizedFilterText
      ? items.filter(item => item.query.toLowerCase().includes(normalizedFilterText))
      : items
    const nextItems = matchedItems.length ? matchedItems : items

    withAnimation(() => visibleItems.setValue(nextItems))
  }, [items, filterText])

  if (hidden || !visibleItems.value.length) return <EmptyView />

  const maxVisibleCount = expanded ? expandedVisibleCount : collapsedVisibleCount
  const historyHeight = historyRowHeight * maxVisibleCount + historyRowSpacing * Math.max(maxVisibleCount - 1, 0)

  return (
    <VStack
      listRowBackground={<Rectangle fill="clear" />}
      listRowSeparator="hidden"
      spacing={10}
    >
      <HStack>
        <AnimText font="title2" foregroundStyle="label" fontWeight={"black"}>Recent Searches</AnimText>
        <Spacer />
        <Button
          buttonStyle="plain"
          action={onClear}
        >
          <AnimText font="body" fontWeight={"semibold"} foregroundStyle={{
            light: "systemGray",
            dark: "lightText"
          }}>Clear</AnimText>
        </Button>
      </HStack>

      <VStack
        spacing={historyRowSpacing}
        padding={{ vertical: historyRowPadding }}
      >

        <ScrollView
          frame={{ height: historyHeight }}
        >
          <VStack spacing={historyRowSpacing} >
            {visibleItems.value.map((item, index) => (
              <Button
                key={item.id}
                action={() => onTap(item.query)}
                buttonStyle="borderless"
              >
                <HStack
                  padding={{ horizontal: 15 }}
                  overlay={index < visibleItems.value.length - 1 ? {
                    alignment: "bottom",
                    content: <Rectangle
                      fill="systemGray"
                      frame={{
                        height: 0.7,
                        maxWidth: "infinity"
                      }}
                      offset={{ x: 0, y: historyDividerOffset }}
                      opacity={0.6}
                    />
                  } : undefined}
                >

                  <AnimText
                    font={17}
                    fontWeight={"medium"}

                    foregroundStyle={{
                      light: "darkText",
                      dark: "lightText"
                    }}
                    truncationMode="tail"
                    lineLimit={1}
                  >
                    🕑  {item.query}
                  </AnimText>

                  <Spacer />

                  <Image
                    onTapGesture={() => onDelete(item.query)}
                    systemName="xmark.circle.fill"
                    imageScale="medium"
                    foregroundStyle={{
                      primary: "label",
                      secondary: {
                        light: "systemGray3",
                        dark: "darkGray"
                      }
                    }}
                  />

                </HStack>
              </Button>
            ))}
          </VStack>
        </ScrollView>
      </VStack>
    </VStack>
  )
}
