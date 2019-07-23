import AWS from 'aws-sdk'
import fs from 'fs-extra'

interface FileDownloadInterface {
  start: () => Promise<void>
  getStats: () => {
    bytesLoaded: number
    progress: number
    totalSize: number
  }
}

export default class FileDownload implements FileDownloadInterface {
  private s3Object: AWS.S3.Object
  private destinationPrefix: string
  private downloadRequest: AWS.Request<AWS.S3.GetObjectOutput, AWS.AWSError>
  private bytesLoaded = 0

  public constructor(
    s3: AWS.S3,
    s3Object: AWS.S3.Object,
    bucketName: string,
    destinationPrefix: string
  ) {
    this.s3Object = s3Object
    this.destinationPrefix = destinationPrefix
    this.downloadRequest = s3.getObject({
      Bucket: bucketName,
      Key: s3Object.Key
    })
  }

  public start = async (): Promise<void> => {
    const filePath = this.s3Object.Key
    const directoryPath = filePath.substring(0, filePath.lastIndexOf('/'))
    // create folder structure if it doesn't exist
    await fs.ensureDir(this.destinationPrefix + directoryPath)

    const stream = this.downloadRequest.createReadStream()

    stream.on('data', (chunk) => {
      this.bytesLoaded += chunk.length
    })

    stream.pipe(fs.createWriteStream(this.destinationPrefix + filePath))

    return new Promise((resolve) => {
      stream.on('finish', () => resolve())
    })
  }

  public getStats = () => ({
    bytesLoaded: this.bytesLoaded,
    progress: (this.bytesLoaded / this.s3Object.Size) * 100,
    totalSize: this.s3Object.Size
  })
}
