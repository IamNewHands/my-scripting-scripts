import { Path } from "scripting"
import type { DownloadTaskDown } from "../hooks/useAppsState"
import { getMetadata, getSinf } from "../modules/AppDB"
import { DownloadTask } from "../modules/download/DownloadTask"

/**
 * 授权 IPA 文件（本地处理）
 * @param params 授权参数
 * @returns IPA 文件路径
 */
export const authorizeApp = async ({
  id,
  name,
  folder,
  displayVersion = "",
}: DownloadTaskDown) => {
  const ipaPath = DownloadTask.filePath({ folder, id, name }) + ".zip"
  const archive = Archive.openForMode(ipaPath, "update")
  const appKey = `${name}_${displayVersion}`

  const sc_Info = archive
    .getEntryPaths()
    .find(p => p.includes("app/SC_Info/") && p.endsWith(".supp"))
    ?.replace("supp", "sinf")?.replace(/\.v\d+(?=\.sinf$)/, "")
  if (!sc_Info) throw new Error("SC_Info not found in IPA")

  const metadata = await getMetadata(appKey)
  const iTunesMetadata = Data.fromRawString(metadata ?? "")
  archive.addFileEntrySync(
    Path.join("iTunesMetadata.plist"),
    iTunesMetadata?.size!,
    (offset, length) => iTunesMetadata?.slice(offset, offset + length)!
  )

  const sinfData = await getSinf(appKey)
  if (!sinfData) throw new Error(`sinf not found for ${appKey}`)
  archive.addFileEntrySync(
    Path.join(sc_Info),
    sinfData.size,
    (offset, length) => sinfData.slice(offset, offset + length)
  )

  const targetPath = Path.join(Path.dirname(ipaPath), `${appKey}.ipa`)
  FileManager.renameSync(ipaPath, targetPath)
  return targetPath
}
