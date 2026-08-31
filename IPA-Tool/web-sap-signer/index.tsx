import { AppConfig } from "../constants/AppConfig"
import { startSignerServer } from "./server"

const signSap = async (xml: string) => {
  const server = startSignerServer()
  const web = new WebViewController()
  let presentation: Promise<void> | undefined

  try {
    if (!await web.loadURL(server.url)) {
      throw new Error("加载签名资源失败")
    }

    presentation = web.present({ navigationTitle: "SAP 签名" })

    try {
      const options = {
        proxyURL: `http://${AppConfig.server.host}:${AppConfig.server.port}/`,
      }
      await web.evaluateJavaScript<boolean>(`
        setSigningStatus("正在准备签名", "正在加载 SAP 签名引擎，请稍候")
        return loadSapSigner(${JSON.stringify(options)}).then(() => true)
      `)

      const result = await web.evaluateJavaScript<string>(`
        setSigningStatus("正在安全签名", "正在生成 SAP 签名数据，请勿关闭页面")
        return sapSign(${JSON.stringify(xml)}, ${JSON.stringify(options)})
      `)

      web.dismiss()
      if (presentation) await presentation
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await web.evaluateJavaScript(
        `setSigningError(${JSON.stringify(message)})`,
      )
      if (presentation) await presentation
      throw error
    }
  } finally {
    web.dispose()
    server.stop()
  }
}

export default signSap
