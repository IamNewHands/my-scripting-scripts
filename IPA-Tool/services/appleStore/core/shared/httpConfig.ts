import { $http, type HttpRequest } from "../../runtime"

let configured = false

export const configureAppleHttp = () => {
  if (configured) return
  configured = true
  $http.useReq((req: HttpRequest | string) => {
    if (typeof req === "string") return req
    req.headers ??= {}
    Object.assign(req.headers, {
      // 与源头一致；部分运行时对 header 键大小写敏感
      "user-agent": "Configurator/2.17 (Macintosh; OS X 15.2; 24C5089c) AppleWebKit/0620.1.16.11.6",
      "content-type": "application/x-www-form-urlencoded",
    })
    return req
  })
}
