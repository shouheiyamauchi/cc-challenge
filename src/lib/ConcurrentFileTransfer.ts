import logUpdate from 'log-update'
import pLimit from 'p-limit'

import config from '../config'

export const displayProgress = (concurrentFileTransfer) => {
  return setInterval(() => {
    const transfers = concurrentFileTransfer.getStats()
    const formatted = Object.keys(transfers).map((key, index) => {
      const stats = transfers[key]
      return `[${index}]: ${key} - ${stats.percentProgress.toFixed(2)}%`
    })

    logUpdate(formatted.join('\r\n'))
  }, 80)
}

export default class ConcurrentFileTransfer {
  constructor(
    fileTransfers,
    maxConcurrentDownloads = config.defaultConcurrentTransfers
  ) {
    this.fileTransfers = fileTransfers
    this.maxConcurrentDownloads = maxConcurrentDownloads
    this.activeTransfers = {}
  }

  async start() {
    const limit = pLimit(this.maxConcurrentDownloads)

    return Promise.all(
      this.fileTransfers.map((fileTransferObject) => {
        return limit(
          () =>
            new Promise(async (resolve) => {
              this.activeTransfers[fileTransferObject.id] =
                fileTransferObject.transfer
              await this.activeTransfers[fileTransferObject.id].start()
              delete this.activeTransfers[fileTransferObject.id]
              resolve()
            })
        )
      })
    )
  }

  getStats() {
    const stats = {}

    for (const key of Object.keys(this.activeTransfers)) {
      stats[key] = this.activeTransfers[key].getStats()
    }

    return stats
  }
}
