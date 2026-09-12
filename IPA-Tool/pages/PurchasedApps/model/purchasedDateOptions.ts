import type { PurchasedAppItem } from "./types"

export type PurchasedDateOption = {
  key: string
  label: string
  index: number
}

/** 按列表顺序生成月份与该月份首个元素索引。 */
export function createPurchasedDateOptions(items: PurchasedAppItem[]) {
  const options = new Map<string, PurchasedDateOption>()

  items.forEach((item, index) => {
    const date = item.purchaseDate
    if (!date || Number.isNaN(date.getTime())) return

    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const key = `${year}-${month}`
    if (!options.has(key)) {
      options.set(key, {
        key,
        label: `${year}年${month}月`,
        index,
      })
    }
  })

  return Array.from(options.values())
}
