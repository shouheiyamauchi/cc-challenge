import fsExtra from 'fs-extra'
import globLib from 'glob'
import pLimit from 'p-limit'

import config from '../../config'
import FileUpload from '../FileTransfer/FileUpload'

import { ConcurrentFileTransferInterface } from './'

export default class ConcurrentFileUpload
  implements ConcurrentFileTransferInterface {
  private s3: AWS.S3
  private bucketName: string
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
    bucketName: string,
    srcDirectory: string,
    kmsKeyId: string,
    fs: typeof fsExtra,
    glob: typeof globLib,
    maxConcurrentUploads: number = 4
  ) {
    this.s3 = s3
    this.bucketName = bucketName
    this.srcDirectory = srcDirectory
    this.kmsKeyId = kmsKeyId
    this.fs = fs
    this.glob = glob
    this.maxConcurrentUploads = maxConcurrentUploads
  }

  public start = async (): Promise<void[]> => {
    const limit = pLimit(this.maxConcurrentUploads)

    const srcFilePaths = await this.getSrcFilePaths()

    return Promise.all(
      srcFilePaths.map((srcFilePath) => {
        const fileUpload = new FileUpload(
          this.s3,
          this.bucketName,
          srcFilePath,
          srcFilePath.substring(
            `${config.downloadPath}/${this.srcDirectory}/`.length
          ),
          this.kmsKeyId,
          this.fs
        )

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
    return Object.keys(this.activeUploads).length
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
