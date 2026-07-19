export type RegionPriceInfo = {
  region: string
  rate: string
  /** lookup 主价文案；空字符串表示该区不可用 */
  price: string
  currency?: string
  /** 单区错误信息（lookup/网络等） */
  error?: string
}