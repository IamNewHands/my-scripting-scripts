import { Path } from "scripting"

const ROOT_FOLDER = "ipa-tool"

export const IPA_TOOL_APP_GROUP_ROOT = Path.join(
  FileManager.appGroupDocumentsDirectory,
  ROOT_FOLDER
)

export const ensureIpaToolAppGroupRoot = () => {
  if (!FileManager.existsSync(IPA_TOOL_APP_GROUP_ROOT)) {
    FileManager.createDirectorySync(IPA_TOOL_APP_GROUP_ROOT, true)
  }
  return IPA_TOOL_APP_GROUP_ROOT
}

export const ipaToolAppGroupPath = (...components: string[]) => {
  const root = ensureIpaToolAppGroupRoot()
  return components.length ? Path.join(root, ...components) : root
}

export const migrateAppGroupFile = (fileName: string) => {
  const nextPath = ipaToolAppGroupPath(fileName)
  const legacyPath = Path.join(FileManager.appGroupDocumentsDirectory, fileName)

  if (!FileManager.existsSync(nextPath) && FileManager.existsSync(legacyPath)) {
    try {
      FileManager.renameSync(legacyPath, nextPath)
    } catch {
      try {
        FileManager.copyFileSync(legacyPath, nextPath)
      } catch { /* ignore */ }
    }
  }

  return nextPath
}
