import fsExtra from 'fs-extra'
import globLib from 'glob'
import logUpdate from 'log-update'
import pLimit from 'p-limit'

import config from '../config'
import FileDownload from '../lib/FileTransfer/FileDownload'
import FileUpload from '../lib/FileTransfer/FileUpload'
import { getAllBucketContents } from '../lib/helpers/aws'
import { globToPromise } from '../lib/helpers/glob'

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

export const generateFileDownloadObjects = async (
  s3: AWS.S3,
  options: {
    bucketName: string
  },
  fs: typeof fsExtra
) => {
  const { bucketName } = options

  const s3Objects = await getAllBucketContents(s3, bucketName)
  return s3Objects.map((s3Object) => ({
    id: s3Object.Key,
    transfer: new FileDownload(s3, { bucketName, s3Object }, fs)
  }))
}

export const generateFileUploadObjects = async (
  s3: AWS.S3,
  options: {
    destBucketName: string
    srcDirectory: string
    kmsKeyId: string
  },
  glob: typeof globLib,
  fs: typeof fsExtra
) => {
  const { destBucketName, kmsKeyId, srcDirectory } = options

  const srcFilePaths = await globToPromise(glob)(
    `${config.downloadPath}/${srcDirectory}/**/*`,
    { nodir: true }
  )

  return srcFilePaths.map((srcFilePath) => ({
    id: srcFilePath,
    transfer: new FileUpload(
      s3,
      {
        destBucketName,
        destFilePath: srcFilePath.substring(
          `${config.downloadPath}/${srcDirectory}/`.length
        ),
        kmsKeyId,
        srcFilePath
      },
      fs
    )
  }))
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
    maxConcurrentDownloads: number = config.defaultConcurrentDownloads
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
