import AWS from 'aws-sdk'
import fsExtra from 'fs-extra'

import { FileTransferInterface } from './'

export default class FileUpload implements FileTransferInterface {
  private uploadRequestPromise: Promise<AWS.S3.ManagedUpload>
  private bytesLoaded = 0
  private totalSize: number

  public constructor(
    s3: AWS.S3,
    bucketName: string,
    filePath: string,
    kmsKeyId: string,
    fs: typeof fsExtra
  ) {
    this.uploadRequestPromise = new Promise(async (resolve) => {
      const data = await fs.readFile(filePath)

      resolve(
        s3.upload({
          ACL: 'public-read',
          Body: data,
          Bucket: bucketName,
          Key: filePath,
          // https://docs.aws.amazon.com/kms/latest/APIReference/API_Encrypt.html#API_Encrypt_RequestSyntax
          SSEKMSKeyId: kmsKeyId,
          ServerSideEncryption: 'aws:kms'
        })
      )
    })
    this.totalSize = fs.statSync(filePath).size
  }

  public start = async (): Promise<void> => {
    const uploadRequest = await this.uploadRequestPromise

    uploadRequest.on('httpUploadProgress', (progress) => {
      console.log(progress)
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
