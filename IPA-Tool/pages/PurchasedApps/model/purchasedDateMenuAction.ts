type PurchasedDateIndexListener = (index: number) => void

const indexListeners = new Set<PurchasedDateIndexListener>()
const scrollListeners = new Set<PurchasedDateIndexListener>()

/** 在购买列表和日期菜单之间传递索引，不持有界面状态。 */
export const purchasedDateMenuAction = {
  publish(index: number) {
    indexListeners.forEach(listener => listener(index))
  },

  add(listener: PurchasedDateIndexListener) {
    indexListeners.add(listener)
  },

  remove(listener: PurchasedDateIndexListener) {
    indexListeners.delete(listener)
  },

  scrollTo(index: number) {
    scrollListeners.forEach(listener => listener(index))
  },

  addScroll(listener: PurchasedDateIndexListener) {
    scrollListeners.add(listener)
  },

  removeScroll(listener: PurchasedDateIndexListener) {
    scrollListeners.delete(listener)
  },
}
