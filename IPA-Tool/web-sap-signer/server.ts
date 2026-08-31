import { AppConfig } from "../constants/AppConfig"
import { Path, Script } from "scripting"

export const startSignerServer = () => {
  const server = new HttpServer()
  const port = AppConfig.server.port + 1

  server.listenAddressIPv4 = "127.0.0.1"
  server.registerFilesFromDirectory(
    "/:file",
    Path.join(Script.directory, "web-sap-signer"),
  )

  const error = server.start({ port, forceIPv4: true })
  if (error) throw new Error(`启动签名资源服务器失败: ${error}`)

  return {
    url: `http://127.0.0.1:${port}/index.html`,
    stop: () => server.stop(),
  }
}
