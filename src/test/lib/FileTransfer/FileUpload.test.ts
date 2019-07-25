import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'

import S3FileUpload from '../../../lib/FileTransfer/S3FileUpload'
import { flushAsyncFn } from '../../helpers/promise'
import fsMock from '../../mocks/fs'
import S3Mock, { mockS3RequestId } from '../../mocks/S3'

chai.use(chaiAsPromised)

describe('S3FileUpload', () => {
  let s3: S3Mock
  let destBucketName: string
  let destFilePath: string
  let s3FileUpload: S3FileUpload

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

    s3FileUpload = new S3FileUpload(s3 as any, options as any, fsMock as any)
  })

  it("upload promise resolves on stream 'finish' event being emitted", async () => {
    const uploadPromise = s3FileUpload.start()

    await flushAsyncFn()
    s3.emitUploadSendEvent(mockS3RequestId(destBucketName, destFilePath))

    return expect(uploadPromise).to.be.fulfilled
  })

  it('updates bytesLoaded as chunks are uploaded', async () => {
    s3FileUpload.start()

    await flushAsyncFn()
    s3.emitUploadEvent(
      mockS3RequestId(destBucketName, destFilePath),
      'httpUploadProgress',
      { loaded: 50 }
    )

    expect(s3FileUpload.getStats().bytesLoaded).to.equal(50)
  })

  it('generates correct stats', async () => {
    s3FileUpload.start()

    await flushAsyncFn()
    s3.emitUploadEvent(
      mockS3RequestId(destBucketName, destFilePath),
      'httpUploadProgress',
      { loaded: 50 }
    )

    expect(s3FileUpload.getStats().bytesLoaded).to.equal(50)
    expect(s3FileUpload.getStats().percentProgress).to.equal(5)
    expect(s3FileUpload.getStats().totalSize).to.equal(1000)
  })
})
