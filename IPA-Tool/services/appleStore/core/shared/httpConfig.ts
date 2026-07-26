import { $http, type HttpRequest } from "../../runtime"

let configured = false

export const configureAppleHttp = () => {
  if (configured) return
  configured = true
  $http.useReq((req: HttpRequest | string) => {
    if (typeof req === "string") return req
    req.headers ??= {}
    Object.assign(req.headers, {
      "User-Agent": "Configurator/2.15 (Macintosh; OS X 11.0.0; 16G29) AppleWebKit/2603.3.8",
      "Content-Type": "application/x-www-form-urlencoded",
    })
    return req
  })
}
