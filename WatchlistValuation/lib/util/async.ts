/**
 * 并发执行任务，限制同时执行数量
 * @param tasks 任务函数数组
 * @param limit 并发限制数量
 * @returns 所有任务结果数组
 */
export async function parallelLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = []
  for (let i = 0; i < tasks.length; i += limit) {
    const batch = tasks.slice(i, i + limit)
    const batchResults = await Promise.all(batch.map((task) => task()))
    results.push(...batchResults)
  }
  return results
}
