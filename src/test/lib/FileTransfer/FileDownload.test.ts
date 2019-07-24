import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'

import FileDownload from '../../../lib/FileTransfer/FileDownload'
import { flushAsyncFn } from '../../helpers/promise'
import fsMock from '../../mocks/fs'
import S3Mock, { mockS3RequestId } from '../../mocks/S3'

chai.use(chaiAsPromised)

describe('FileDownload', () => {
  let s3: S3Mock
  let bucketName: string
  let key: string
  let fileDownload: FileDownload

  beforeEach(() => {
    s3 = new S3Mock()
    bucketName = 'mockBucket'
    key = 'mockKey'
    const options = {
      bucketName,
      s3Object: {
        Key: key,
        Size: 1000
      }
    }

    fileDownload = new FileDownload(s3 as any, options as any, fsMock as any)
  })

  it("download promise resolves on stream 'finish' event being emitted", async () => {
    const downloadPromise = fileDownload.start()

    await flushAsyncFn()
    s3.emitReadStreamEvent(mockS3RequestId(bucketName, key), 'finish')

    return expect(downloadPromise).to.be.fulfilled
  })

  it('updates bytesLoaded as chunks are loaded', async () => {
    fileDownload.start()

    await flushAsyncFn()
    s3.emitReadStreamEvent(mockS3RequestId(bucketName, key), 'data', {
      length: 50
    })

    expect(fileDownload.getStats().bytesLoaded).to.equal(50)
  })

  it('generates correct stats', async () => {
    fileDownload.start()

    await flushAsyncFn()
    s3.emitReadStreamEvent(mockS3RequestId(bucketName, key), 'data', {
      length: 50
    })

    expect(fileDownload.getStats().bytesLoaded).to.equal(50)
    expect(fileDownload.getStats().percentProgress).to.equal(5)
    expect(fileDownload.getStats().totalSize).to.equal(1000)
  })
})
