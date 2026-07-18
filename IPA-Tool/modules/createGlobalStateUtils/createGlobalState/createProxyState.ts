import { MutableRefObject } from "scripting"

export const OWN_KEYS_SELECTOR = "__ownKeys"

/**
 * 创建代理状态对象的函数
 * @param state 原始状态对象
 * @param selectors 选择器引用对象
 * @returns 代理状态对象
 */
export const createProxyState = (
  state: unknown,
  selectors: MutableRefObject<Record<string, any>>
) => {
  if (typeof state !== "object") return state
  return new Proxy(Object.assign(Object.create(null), state), {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)
      if (selectors.current) {
        selectors.current[prop as string] = value
      }
      return value
    },
    ownKeys(target) {
      const keys = Reflect.ownKeys(target)
      if (selectors.current) {
        selectors.current[OWN_KEYS_SELECTOR] = keys.join("\u0000")
      }
      return keys
    },
  })
}