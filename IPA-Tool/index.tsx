import { Navigation, Script, useEffect } from "scripting"
import TabViewApp from "./pages"
import { initServerManager } from "./services/server"
import "./polyfill"

const App = () => {
  useEffect(() => {
    initServerManager()
  }, [])

  return <TabViewApp />
}

Navigation.present({
  element: <App interactiveDismissDisabled />,
}).then(() => Script.exit())
