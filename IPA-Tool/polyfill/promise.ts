/**
 * File: polyfill/promise.ts
 *
 * Promise 相关 Polyfill
 */

declare global {
  interface PromiseConstructor {
    try<T>(fn: () => T | PromiseLike<T>): Promise<Awaited<T>>
    withResolvers<T>(): {
      promise: Promise<T>
      resolve: (value: T | PromiseLike<T>) => void
      reject: (reason?: unknown) => void
    }
  }
}

/**
 * Promise.try 的 Polyfill（如果需要）
 * 用于同步执行函数并返回 Promise
 * 如果函数抛出异常，会被捕获并转换为 rejected Promise
 */
Promise.try ??= function <T>(fn: () => T | PromiseLike<T>): Promise<Awaited<T>> {
  try {
    return Promise.resolve(fn())
  } catch (error) {
    return Promise.reject(error)
  }
}

/**
 * Promise.withResolvers 的 Polyfill
 * 用于创建可在外部 resolve/reject 的 Promise
 */
Promise.withResolvers ??= function <T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })

  return { promise, resolve, reject }
}

export {}
