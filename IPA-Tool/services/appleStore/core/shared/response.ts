export function createResponse<T>(success: boolean, data: T | null = null, error: string | null = null) {
  return {
    success,
    data,
    error,
    timestamp: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
  }
}

export const validate = (condition: unknown, message: string) => {
  if (!condition) {
    const error = new Error(message)
    Object.assign(error, { status: 400 })
    throw error
  }
}
