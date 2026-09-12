const APP_ICON_SIZE = 240

/** 将 Apple 图标地址统一为 240 像素的 JPEG CDN 地址。 */
export const formatAppIconUrl = (url: string | null | undefined) => {
  if (!url) return ""

  return url
    .replace(/\{w\}/g, String(APP_ICON_SIZE))
    .replace(/\{h\}/g, String(APP_ICON_SIZE))
    .replace(/\{c\}/g, "")
    .replace(/\{f\}/g, "jpg")
    .replace(
      /\/\d+x\d+bb\.[^/?#]+(?=$|[?#])/,
      `/${APP_ICON_SIZE}x${APP_ICON_SIZE}bb.jpg`,
    )
}
