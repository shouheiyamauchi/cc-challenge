import AWS from 'aws-sdk'
import fsExtra from 'fs-extra'

import config from '../../config'

import { FileTransferInterface } from './'

export default class FileDownload implements FileTransferInterface {
  private s3Object: AWS.S3.Object
  private bucketName: string
  private downloadRequest: AWS.Request<AWS.S3.GetObjectOutput, AWS.AWSError>
  private bytesLoaded = 0
  private fs: typeof fsExtra

  public constructor(
    s3: AWS.S3,
    options: {
      bucketName: string
      s3Object: AWS.S3.Object
    },
    fs: typeof fsExtra
  ) {
    const { bucketName, s3Object } = options

    this.s3Object = s3Object
    this.bucketName = bucketName
    this.downloadRequest = s3.getObject({
      Bucket: bucketName,
      Key: s3Object.Key
    })
    this.fs = fs
  }

  public start = async (): Promise<void> => {
    const filePath = this.s3Object.Key
    const directoryPath = filePath.substring(0, filePath.lastIndexOf('/'))
    // create folder structure if it doesn't exist
    await this.fs.ensureDir(
      `${config.downloadPath}/${this.bucketName}/${directoryPath}`
    )

    const stream = this.downloadRequest.createReadStream()

    stream.on('data', (chunk) => {
      this.bytesLoaded += chunk.length
    })

    stream.pipe(
      this.fs.createWriteStream(
        `${config.downloadPath}/${this.bucketName}/${filePath}`
      )
    )

    return new Promise((resolve) => {
      stream.on('finish', () => resolve())
    })
  }

  public getStats = () => ({
    bytesLoaded: this.bytesLoaded,
    percentProgress: (this.bytesLoaded / this.s3Object.Size) * 100,
    totalSize: this.s3Object.Size
  })
}
