import { fetch } from "scripting"

type HttpMethod = "get" | "post" | "put" | "delete" | "head" | "patch" | "options"

type HttpRequest = {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: string | Uint8Array | ArrayBuffer
  timeout?: number
  $auto?: boolean
  baseURL?: string
  signal?: unknown
  "binary-mode"?: boolean
}

type HttpResponse<T = unknown> = {
  status: number
  statusCode: number
  headers: Record<string, string>
  body: T
  error?: string
  json: () => unknown
}

type HookResult<T> = T | void | Promise<T | void>
type ReqHook = (req: HttpRequest | string) => HookResult<HttpRequest | string>
type ResHook = (res: HttpResponse, req: HttpRequest) => HookResult<HttpResponse>
type ErrHook = (error: Error) => HookResult<Error | HttpResponse>
type ManagedHook<T> = T & { default?: boolean; isOn?: boolean }

const methods = ["get", "post", "put", "delete", "head", "patch", "options"] as const

const normalizeRequest = (input: HttpRequest | string): HttpRequest =>
  typeof input === "string" ? { url: input, method: "get" } : input

function createHookManager<T extends Function>(hooks: Set<ManagedHook<T>>, fn: T, isDefault: boolean) {
  const hook = fn as ManagedHook<T>
  if (isDefault) hook.default = true
  hooks.add(hook)
  return {
    remove: () => hooks.delete(hook),
    disable: (bool: boolean) => (hook.isOn = bool),
    status: () => hook.isOn ?? true,
    isDefault,
  }
}

const createHttp = () => {
  const reqHooks = new Set<ManagedHook<ReqHook>>()
  const resHooks = new Set<ManagedHook<ResHook>>()
  const errHooks = new Set<ManagedHook<ErrHook>>()
  const defaults: Record<string, unknown> = {}

  const runReqHooks = async (input: HttpRequest | string) => {
    let next: HttpRequest | string = input
    for (const hook of reqHooks) {
      if (hook.isOn === false) continue
      next = await hook(next) ?? next
    }
    return normalizeRequest(next)
  }

  const runResHooks = async (response: HttpResponse, request: HttpRequest) => {
    let next = response
    for (const hook of resHooks) {
      if (hook.isOn === false) continue
      next = await hook(next, request) ?? next
    }
    return next
  }

  const runErrHooks = async (error: Error) => {
    let next: Error | HttpResponse = error
    for (const hook of errHooks) {
      if (hook.isOn === false) continue
      next = await hook(error) ?? next
    }
    if (next === error) throw error
    return next as HttpResponse
  }

  const request = (async (input: HttpRequest | string, timeout = 4) => {
    const HTTPError = (message: string, response: HttpResponse | null, request: HttpRequest) =>
      Object.assign(new Error(message), { name: "HTTPError", request, response })

    const { timeout: reqTimeout, ...op } = await runReqHooks(input)
    const { promise, resolve, reject } = Promise.withResolvers<HttpResponse>()
    const timer = setTimeout(() => reject(HTTPError("timeout", null, op)), (reqTimeout ?? timeout) * 1000)

    fetch(op.url, {
      method: op.method,
      headers: op.headers,
      body: op.body,
      signal: op.signal,
      redirect: op.$auto === false ? "manual" : "follow",
    } as any).then(
      async response => {
        const body = op["binary-mode"] ? await response.arrayBuffer() : await response.text()
        const res: HttpResponse = {
          status: response.status,
          statusCode: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          body,
          json: () => JSON.parse(String(res.body)),
        }
        try {
          resolve(response.status < 200 || response.status > 307
            ? await runErrHooks(HTTPError(`${response.status}: Not Found`, res, op))
            : await runResHooks(res, op))
        } catch (error) {
          reject(error)
        }
      },
      error => reject(HTTPError(error.message, null, op))
    )

    return promise.finally(() => clearTimeout(timer))
  }) as ((input: HttpRequest | string, timeout?: number) => Promise<HttpResponse>) & {
    defaults: Record<string, unknown>
    useReq: (...args: unknown[]) => ReturnType<typeof createHookManager<ReqHook>> | undefined
    useRes: (...args: unknown[]) => ReturnType<typeof createHookManager<ResHook>> | undefined
    useErr: (...args: unknown[]) => ReturnType<typeof createHookManager<ErrHook>> | undefined
    clear: (type?: "req" | "ok" | "fail") => void
    config: (opts: Record<string, unknown>) => typeof request
  } & Record<HttpMethod, (input: HttpRequest | string, timeout?: number) => Promise<HttpResponse>>

  request.defaults = defaults
  request.useReq = (...args: unknown[]) => {
    const fn = args.pop()
    return typeof fn === "function" ? createHookManager(reqHooks, fn as ReqHook, args.includes("default")) : undefined
  }
  request.useRes = (...args: unknown[]) => {
    const fn = args.pop()
    return typeof fn === "function" ? createHookManager(resHooks, fn as ResHook, args.includes("default")) : undefined
  }
  request.useErr = (...args: unknown[]) => {
    const fn = args.pop()
    return typeof fn === "function" ? createHookManager(errHooks, fn as ErrHook, args.includes("default")) : undefined
  }
  request.clear = type => {
    if (type === "req") reqHooks.clear()
    else if (type === "ok") resHooks.clear()
    else if (type === "fail") errHooks.clear()
    else {
      reqHooks.forEach(hook => !hook.default && reqHooks.delete(hook))
      resHooks.forEach(hook => !hook.default && resHooks.delete(hook))
      errHooks.forEach(hook => !hook.default && errHooks.delete(hook))
    }
  }
  request.config = opts => {
    Object.assign(defaults, opts)
    return request
  }

  request.useReq("default", (req: HttpRequest | string) => {
    const request = normalizeRequest(req)
    request.$auto ??= true
    request.headers ??= {}
    if (defaults.baseURL && !request.baseURL) request.baseURL = defaults.baseURL as string
    if (request.baseURL && !request.url.match(/^https?:\/\//)) {
      const base = request.baseURL.endsWith("/") ? request.baseURL.slice(0, -1) : request.baseURL
      const path = request.url.startsWith("/") ? request.url : `/${request.url}`
      request.url = base + path
    }
    return Object.assign(request, JSON.parse(JSON.stringify(defaults)))
  })

  request.useRes("default", (res: HttpResponse) => {
    res.headers = Object.fromEntries(Object.entries(res.headers).map(([key, value]) => [key.toLowerCase(), value]))
    return res
  })

  request.useRes("default", (res: HttpResponse, req: HttpRequest) => {
    if (!req["binary-mode"] && res.headers["content-type"]?.includes("application/json")) {
      try {
        res.body = res.json()
      } catch {}
    }
    return res
  })

  methods.forEach(method => {
    request[method] = (input, timeout) => request({ ...normalizeRequest(input), method }, timeout)
  })

  return request
}

export const $http = createHttp()
export type { HttpRequest, HttpResponse }
