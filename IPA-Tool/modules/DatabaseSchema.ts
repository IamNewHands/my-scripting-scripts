/** 判断指定数据表是否存在。 */
export const databaseTableExists = async (
  db: SQLite.Database,
  tableName: string,
) => Boolean(await db.fetchOne(
  "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
  [tableName],
))

/** 新表尚不存在时，将旧表原地改名并保留全部数据。 */
export const renameDatabaseTable = async (
  db: SQLite.Database,
  oldName: string,
  newName: string,
) => {
  if (oldName === newName || await databaseTableExists(db, newName)) return
  if (!await databaseTableExists(db, oldName)) return
  await db.execute(`ALTER TABLE ${oldName} RENAME TO ${newName}`)
}
