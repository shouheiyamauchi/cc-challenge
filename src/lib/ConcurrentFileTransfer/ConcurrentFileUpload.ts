import fsExtra from 'fs-extra'
import globLib from 'glob'
import pLimit from 'p-limit'

import config from '../../config'
import FileUpload from '../FileTransfer/FileUpload'

import { ConcurrentFileTransferInterface, CurrentFileTransferStats } from './'

export default class ConcurrentFileUpload
  implements ConcurrentFileTransferInterface {
  private s3: AWS.S3
  private destBucketName: string
  private srcDirectory: string
  private kmsKeyId: string
  private fs: typeof fsExtra
  private glob: typeof globLib
  private maxConcurrentUploads: number
  private activeUploads: {
    [key: string]: FileUpload
  } = {}

  public constructor(
    s3: AWS.S3,
    options: {
      destBucketName: string
      srcDirectory: string
      kmsKeyId: string
      maxConcurrentUploads?: number
    },
    fs: typeof fsExtra,
    glob: typeof globLib
  ) {
    const {
      destBucketName,
      srcDirectory,
      kmsKeyId,
      maxConcurrentUploads = config.defaultConcurrentUploads
    } = options

    this.s3 = s3
    this.destBucketName = destBucketName
    this.srcDirectory = srcDirectory
    this.kmsKeyId = kmsKeyId
    this.maxConcurrentUploads = maxConcurrentUploads
    this.fs = fs
    this.glob = glob
  }

  public start = async (): Promise<void[]> => {
    const limit = pLimit(this.maxConcurrentUploads)

    const srcFilePaths = await this.getSrcFilePaths()

    return Promise.all(
      srcFilePaths.map((srcFilePath) => {
        const options = {
          destBucketName: this.destBucketName,
          destFilePath: srcFilePath.substring(
            `${config.downloadPath}/${this.srcDirectory}/`.length
          ),
          kmsKeyId: this.kmsKeyId,
          srcFilePath
        }

        const fileUpload = new FileUpload(this.s3, options, this.fs)

        return limit(
          () =>
            new Promise(async (resolve) => {
              this.activeUploads[srcFilePath] = fileUpload
              await this.activeUploads[srcFilePath].start()
              delete this.activeUploads[srcFilePath]
              resolve()
            })
        )
      })
    )
  }

  public getStats = () => {
    const stats: CurrentFileTransferStats = {}

    for (const key of Object.keys(this.activeUploads)) {
      stats[key] = this.activeUploads[key].getStats()
    }

    return stats
  }

  private getSrcFilePaths = async (): Promise<string[]> => {
    return new Promise((resolve) => {
      this.glob(
        `${config.downloadPath}/${this.srcDirectory}/**/*`,
        { nodir: true },
        (_, files) => {
          resolve(files)
        }
      )
    })
  }
}
