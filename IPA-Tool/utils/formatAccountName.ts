/**
 * 按姓名语言习惯拼接账号展示名。
 * 姓名任一部分含中文时按"姓 + 名"展示；否则按"名 姓"展示。
 */
export const formatAccountName = (firstName?: string, lastName?: string) => {
  const hasChinese = /[\u3400-\u9FFF\uF900-\uFAFF]/.test(`${firstName ?? ""}${lastName ?? ""}`)
  const nameParts = hasChinese ? [lastName, firstName] : [firstName, lastName]
  return nameParts.filter(Boolean).join(hasChinese ? "" : " ")
}
