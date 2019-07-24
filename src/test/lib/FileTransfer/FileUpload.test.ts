import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'

import FileUpload from '../../../lib/FileTransfer/FileUpload'
import { flushAsyncFn } from '../../helpers/promise'
import fsMock from '../../mocks/fs'
import S3Mock, { mockS3RequestId } from '../../mocks/S3'

chai.use(chaiAsPromised)

describe('FileUpload', () => {
  let s3: S3Mock
  let destBucketName: string
  let destFilePath: string
  let fileUpload: FileUpload

  beforeEach(() => {
    s3 = new S3Mock()
    destBucketName = 'mockBucket'
    destFilePath = 'mockKey'
    const options = {
      destBucketName,
      destFilePath,
      srcFilePath: {
        size: 1000
      }
    }

    fileUpload = new FileUpload(s3 as any, options as any, fsMock as any)
  })

  it("upload promise resolves on stream 'finish' event being emitted", async () => {
    const uploadPromise = fileUpload.start()

    await flushAsyncFn()
    s3.emitUploadSendEvent(mockS3RequestId(destBucketName, destFilePath))

    return expect(uploadPromise).to.be.fulfilled
  })

  it('updates bytesLoaded as chunks are uploaded', async () => {
    fileUpload.start()

    await flushAsyncFn()
    s3.emitUploadEvent(
      mockS3RequestId(destBucketName, destFilePath),
      'httpUploadProgress',
      { loaded: 50 }
    )

    expect(fileUpload.getStats().bytesLoaded).to.equal(50)
  })

  it('generates correct stats', async () => {
    fileUpload.start()

    await flushAsyncFn()
    s3.emitUploadEvent(
      mockS3RequestId(destBucketName, destFilePath),
      'httpUploadProgress',
      { loaded: 50 }
    )

    expect(fileUpload.getStats().bytesLoaded).to.equal(50)
    expect(fileUpload.getStats().percentProgress).to.equal(5)
    expect(fileUpload.getStats().totalSize).to.equal(1000)
  })
})
