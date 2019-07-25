import logUpdate from 'log-update'
import pLimit from 'p-limit'

import config from '../config'

import { FileTransferInterface, FileTransferStats } from './FileTransfer'

export interface CurrentFileTransferStats {
  [key: string]: FileTransferStats
}

export interface ConcurrentFileTransferInterface {
  start: () => Promise<void[]>
  getStats: () => CurrentFileTransferStats
}

interface FileTransferObject {
  id: string
  transfer: FileTransferInterface
}

export const displayProgress = (
  concurrentFileTransfer: ConcurrentFileTransferInterface
) => {
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
  private fileTransfers: FileTransferObject[]
  private activeTransfers: {
    [key: string]: FileTransferInterface
  } = {}
  private maxConcurrentDownloads: number

  public constructor(
    fileTransfers: FileTransferObject[],
    maxConcurrentDownloads: number = config.defaultConcurrentTransfers
  ) {
    this.fileTransfers = fileTransfers
    this.maxConcurrentDownloads = maxConcurrentDownloads
  }

  public start = async (): Promise<void[]> => {
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

  public getStats = () => {
    const stats: CurrentFileTransferStats = {}

    for (const key of Object.keys(this.activeTransfers)) {
      stats[key] = this.activeTransfers[key].getStats()
    }

    return stats
  }
}
