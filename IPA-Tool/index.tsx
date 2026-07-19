import "./polyfill"
import { Navigation, Script, useEffect } from "scripting"
import TabViewApp from "./pages"
import { initServerManager } from "./services/server"

const App = () => {
  useEffect(() => {
    initServerManager()
  }, [])

  return <TabViewApp />
}

async function main() {
  await Navigation.present({
    element: <App />,
    modalPresentationStyle: "fullScreen",
  })
  Script.exit()
}

main().catch(() => {
  Script.exit()
})
