/**
 * 通用防抖（debounce）：连续调用 fn 时，只在最后一次调用后 delay 毫秒触发一次。
 * 用于 TextField.onChanged 等高频回调，避免每次按键都触发重计算/重落盘/Widget reload。
 */
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay = 300
): ((...args: Parameters<T>) => void) & { cancel: () => void; flush: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null
  const wrapped = (...args: Parameters<T>) => {
    lastArgs = args
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      if (lastArgs) fn(...lastArgs)
      lastArgs = null
    }, delay)
  }
  wrapped.cancel = () => {
    if (timer) clearTimeout(timer)
    timer = null
    lastArgs = null
  }
  wrapped.flush = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
      if (lastArgs) fn(...lastArgs)
      lastArgs = null
    }
  }
  return wrapped
}
