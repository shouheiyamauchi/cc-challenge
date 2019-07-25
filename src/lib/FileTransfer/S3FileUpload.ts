import fsExtra from 'fs-extra'
import globLib from 'glob'

import config from '../../config'
import { globToPromise } from '../../lib/helpers/glob'

import { FileTransferInterface } from './'

export const generateS3FileUploadObjects = async (
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
    transfer: new S3FileUpload(
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

export default class S3FileUpload implements FileTransferInterface {
  private uploadRequestPromise: Promise<AWS.S3.ManagedUpload>
  private bytesLoaded = 0
  private totalSize: number

  public constructor(
    s3: AWS.S3,
    options: {
      destBucketName: string
      srcFilePath: string
      destFilePath: string
      kmsKeyId: string
    },
    fs: typeof fsExtra
  ) {
    const { destBucketName, srcFilePath, destFilePath, kmsKeyId } = options

    this.uploadRequestPromise = new Promise(async (resolve) => {
      const data = await fs.readFile(srcFilePath)

      resolve(
        s3.upload({
          ACL: 'public-read',
          Body: data,
          Bucket: destBucketName,
          Key: destFilePath,
          SSEKMSKeyId: kmsKeyId,
          ServerSideEncryption: 'aws:kms'
        })
      )
    })
    this.totalSize = fs.statSync(srcFilePath).size
  }

  public start = async (): Promise<void> => {
    const uploadRequest = await this.uploadRequestPromise

    uploadRequest.on('httpUploadProgress', (progress) => {
      this.bytesLoaded = progress.loaded
    })

    return new Promise((resolve) => {
      uploadRequest.send(() => resolve())
    })
  }

  public getStats = () => ({
    bytesLoaded: this.bytesLoaded,
    percentProgress: (this.bytesLoaded / this.totalSize) * 100,
    totalSize: this.totalSize
  })
}
