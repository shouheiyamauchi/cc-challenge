export const mockObjectId = (bucket: string, key: string) => `${bucket}-${key}`

export default class S3Mock {
  private readStreamEvents: {
    [key: string]: {
      [key: string]: () => void
    }
  } = {}

  public emitReadStreamEvent = (objectId: string, event: string) =>
    this.readStreamEvents[objectId][event]()

  public getObject = (options: { Bucket: string; Key: string }) => {
    // way to distinguish between mock S3 objects while testing
    const objectId = mockObjectId(options.Bucket, options.Key)

    this.readStreamEvents[objectId] = {}

    return {
      createReadStream: () => {
        return {
          on: (event: string, fn: () => void) => {
            this.readStreamEvents[objectId][event] = fn
          },
          pipe: () => {
            // mock
          }
        }
      }
    }
  }
}
