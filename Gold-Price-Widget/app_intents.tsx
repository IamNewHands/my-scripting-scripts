import { AppIntentManager, AppIntentProtocol, Widget } from "scripting"

const STORAGE_PREFIX = "goldPrice_"
const BANK_LIST = ["cmb", "zs", "icbc", "ms", "cgb", "cib", "jd", "gj"] as const

export const RefreshGoldIntent = AppIntentManager.register({
  name: "RefreshGoldIntent",
  protocol: AppIntentProtocol.AppIntent,
  perform: async (_params: undefined) => {
    Widget.reloadAll()
  },
})

export const SwitchBankIntent = AppIntentManager.register({
  name: "SwitchBankIntent",
  protocol: AppIntentProtocol.AppIntent,
  perform: async (_params: undefined) => {
    const currentSource = Storage.get<string>(`${STORAGE_PREFIX}source`)
    const safeCurrentSource = BANK_LIST.includes(currentSource as typeof BANK_LIST[number]) ? currentSource as typeof BANK_LIST[number] : "cmb"
    const currentIndex = BANK_LIST.indexOf(safeCurrentSource)
    const nextSource = BANK_LIST[(currentIndex + 1) % BANK_LIST.length]
    Storage.set(`${STORAGE_PREFIX}source`, nextSource)
    Widget.reloadAll()
  },
})