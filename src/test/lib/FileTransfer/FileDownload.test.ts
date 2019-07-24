import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'

import FileDownload from '../../../lib/FileTransfer/FileDownload'
import { flushAsyncFn } from '../../helpers/promise'
import fsMock from '../../mocks/fs'
import S3Mock, { mockObjectId } from '../../mocks/S3'

chai.use(chaiAsPromised)

describe('FileDownload', () => {
  it("download promise resolves on stream 'finish' event being emitted", async () => {
    const s3 = new S3Mock()
    const bucketName = 'mockBucket'
    const key = 'mockKey'
    const options = {
      bucketName,
      s3Object: {
        Key: key,
        Size: 1000
      }
    }

    const fileDownload = new FileDownload(
      s3 as any,
      options as any,
      fsMock as any
    )
    const downloadPromise = fileDownload.start()

    await flushAsyncFn()
    s3.emitReadStreamEvent(mockObjectId(bucketName, key), 'finish')

    return expect(downloadPromise).to.be.fulfilled
  })
})
