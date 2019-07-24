export const mockS3RequestId = (bucket: string, key: string) =>
  `${bucket}-${key}`

export default class S3Mock {
  private readStreamEvents: {
    [key: string]: {
      [key: string]: (...args: any) => void
    }
  } = {}

  private uploadEvents: {
    [key: string]: {
      [key: string]: (...args: any) => void
    }
  } = {}

  public emitReadStreamEvent = (
    objectId: string,
    event: string,
    ...args: any
  ) => this.readStreamEvents[objectId][event](...args)

  public emitUploadEvent = (uploadId: string, event: string, ...args: any) =>
    this.uploadEvents[uploadId][event](...args)

  public emitUploadSendEvent = (uploadId: string, ...args: any) =>
    this.uploadEvents[uploadId].send(...args)

  public getObject = (options: { Bucket: string; Key: string }) => {
    // way to distinguish between mock S3 objects while testing
    const objectId = mockS3RequestId(options.Bucket, options.Key)

    this.readStreamEvents[objectId] = {}

    return {
      createReadStream: () => {
        return {
          on: (event: string, fn: (...args: any) => void) => {
            this.readStreamEvents[objectId][event] = fn
          },
          pipe: () => {
            // mock
          }
        }
      }
    }
  }

  public upload = (options: { Bucket: string; Key: string }) => {
    // way to distinguish between mock S3 uploads while testing
    const uploadId = mockS3RequestId(options.Bucket, options.Key)

    this.uploadEvents[uploadId] = {}

    return {
      on: (event: string, fn: (...args: any) => void) => {
        this.uploadEvents[uploadId][event] = fn
      },
      send: (fn: (...args: any) => void) => {
        this.uploadEvents[uploadId].send = fn
      }
    }
  }
}
