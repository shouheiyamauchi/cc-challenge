import fsExtra from 'fs-extra'
import pLimit from 'p-limit'

import FileDownload from '../FileTransfer/FileDownload'

import { ConcurrentFileTransferInterface } from './'

export default class ConcurrentFileDownload
  implements ConcurrentFileTransferInterface {
  private s3: AWS.S3
  private bucketName: string
  private s3Objects: AWS.S3.Object[]
  private fs: typeof fsExtra
  private maxConcurrentDownloads: number
  private activeDownloads: {
    [key: string]: FileDownload
  } = {}

  public constructor(
    s3: AWS.S3,
    options: {
      bucketName: string
      s3Objects: AWS.S3.Object[]
      maxConcurrentDownloads?: number
    },
    fs: typeof fsExtra
  ) {
    const { bucketName, s3Objects, maxConcurrentDownloads = 4 } = options

    this.s3 = s3
    this.bucketName = bucketName
    this.s3Objects = [...s3Objects]
    this.fs = fs
    this.maxConcurrentDownloads = maxConcurrentDownloads
  }

  public start = async (): Promise<void[]> => {
    const limit = pLimit(this.maxConcurrentDownloads)

    return Promise.all(
      this.s3Objects.map((s3Object) => {
        const options = {
          bucketName: this.bucketName,
          s3Object
        }

        const fileDownload = new FileDownload(this.s3, options, this.fs)

        return limit(
          () =>
            new Promise(async (resolve) => {
              this.activeDownloads[s3Object.Key] = fileDownload
              await this.activeDownloads[s3Object.Key].start()
              delete this.activeDownloads[s3Object.Key]
              resolve()
            })
        )
      })
    )
  }

  public getStats = () => {
    return Object.keys(this.activeDownloads).length
  }
}
