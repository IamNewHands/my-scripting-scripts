type Abortable = {
  abort: () => void
}

type RaceRequest<T> = {
  promise: Promise<T>
  controller: Abortable
}

/** 竞速返回首个成功结果，并在成功时立即取消其他请求。 */
export const raceWithAbort = <T,>(requests: RaceRequest<T>[]) => {
  let winnerIndex = -1

  return Promise.any(
    requests.map(({ promise }, index) =>
      promise.then(result => {
        if (winnerIndex === -1) {
          winnerIndex = index
          requests.forEach(({ controller }, requestIndex) => {
            if (requestIndex !== index) controller.abort()
          })
        }
        return result
      })
    )
  )
}
