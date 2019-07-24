import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'

import config from '../../../config'
import ConcurrentFileUpload from '../../../lib/ConcurrentFileTransfer/ConcurrentFileUpload'
import { flushAsyncFn } from '../../helpers/promise'
import fsMock from '../../mocks/fs'
import generateGlob from '../../mocks/glob'
import S3Mock, { mockS3RequestId } from '../../mocks/S3'

// const {
//   emitCallback,
//   mockGlob
// } = generateGlob()

chai.use(chaiAsPromised)

describe('ConcurrentFileUpload', () => {
  describe('without maxConcurrentUploads option', () => {
    let s3: S3Mock
    let concurrentFileUpload: ConcurrentFileUpload
    const destBucketName = 'mockBucket'
    const srcDirectory = 'somewhere'
    const keys = ['1', '2', '3', '4', '5']
    const mockFiles = keys.map(
      (key) => `${config.downloadPath}/${srcDirectory}/${key}`
    )
    const globPath = `${config.downloadPath}/${srcDirectory}/**/*`
    let emitCallback: (path: string, files: string[]) => void

    beforeEach(() => {
      s3 = new S3Mock()
      const options = {
        destBucketName,
        srcDirectory
      }
      const glob = generateGlob()
      emitCallback = glob.emitCallback

      concurrentFileUpload = new ConcurrentFileUpload(
        s3 as any,
        options as any,
        fsMock as any,
        glob.mockGlob as any
      )
    })

    it('by default only 4 concurrent uploads will happen', async () => {
      concurrentFileUpload.start()

      emitCallback(globPath, mockFiles)

      await flushAsyncFn()

      const stats = concurrentFileUpload.getStats()
      expect(Object.keys(stats)).to.have.lengthOf(4)
      expect(Boolean(stats[mockFiles[0]])).to.equal(true)
      expect(Boolean(stats[mockFiles[1]])).to.equal(true)
      expect(Boolean(stats[mockFiles[2]])).to.equal(true)
      expect(Boolean(stats[mockFiles[3]])).to.equal(true)
      expect(Boolean(stats[mockFiles[4]])).to.equal(false)
    })

    it('when an upload finishes later ones in the queue will start', async () => {
      concurrentFileUpload.start()

      emitCallback(globPath, mockFiles)

      await flushAsyncFn()

      s3.emitUploadSendEvent(mockS3RequestId(destBucketName, '1'))

      await flushAsyncFn()

      const stats = concurrentFileUpload.getStats()
      expect(Object.keys(stats)).to.have.lengthOf(4)
      expect(Boolean(stats[mockFiles[0]])).to.equal(false)
      expect(Boolean(stats[mockFiles[1]])).to.equal(true)
      expect(Boolean(stats[mockFiles[2]])).to.equal(true)
      expect(Boolean(stats[mockFiles[3]])).to.equal(true)
      expect(Boolean(stats[mockFiles[4]])).to.equal(true)
    })

    it('whichever upload finishes first will be replaced by pending ones in the queue', async () => {
      concurrentFileUpload.start()

      emitCallback(globPath, mockFiles)

      await flushAsyncFn()

      s3.emitUploadSendEvent(mockS3RequestId(destBucketName, '3'))

      await flushAsyncFn()

      const stats = concurrentFileUpload.getStats()
      expect(Object.keys(stats)).to.have.lengthOf(4)
      expect(Boolean(stats[mockFiles[0]])).to.equal(true)
      expect(Boolean(stats[mockFiles[1]])).to.equal(true)
      expect(Boolean(stats[mockFiles[2]])).to.equal(false)
      expect(Boolean(stats[mockFiles[3]])).to.equal(true)
      expect(Boolean(stats[mockFiles[4]])).to.equal(true)
    })

    it('stats will be empty once all uploads have finished', async () => {
      concurrentFileUpload.start()

      emitCallback(globPath, mockFiles)

      await flushAsyncFn()
      s3.emitUploadSendEvent(mockS3RequestId(destBucketName, '1'))
      await flushAsyncFn()
      s3.emitUploadSendEvent(mockS3RequestId(destBucketName, '2'))
      await flushAsyncFn()
      s3.emitUploadSendEvent(mockS3RequestId(destBucketName, '3'))
      await flushAsyncFn()
      s3.emitUploadSendEvent(mockS3RequestId(destBucketName, '4'))
      await flushAsyncFn()
      s3.emitUploadSendEvent(mockS3RequestId(destBucketName, '5'))

      await flushAsyncFn()

      const stats = concurrentFileUpload.getStats()
      expect(Object.keys(stats)).to.have.lengthOf(0)
      expect(Boolean(stats[mockFiles[0]])).to.equal(false)
      expect(Boolean(stats[mockFiles[1]])).to.equal(false)
      expect(Boolean(stats[mockFiles[2]])).to.equal(false)
      expect(Boolean(stats[mockFiles[3]])).to.equal(false)
      expect(Boolean(stats[mockFiles[4]])).to.equal(false)
    })
  })

  describe('with maxConcurrentUploads option', () => {
    let s3: S3Mock
    let concurrentFileUpload: ConcurrentFileUpload
    const destBucketName = 'mockBucket'
    const srcDirectory = 'somewhere'
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8']
    const mockFiles = keys.map(
      (key) => `${config.downloadPath}/${srcDirectory}/${key}`
    )
    const globPath = `${config.downloadPath}/${srcDirectory}/**/*`
    const maxConcurrentUploads = 5
    let emitCallback: (path: string, files: string[]) => void

    beforeEach(() => {
      s3 = new S3Mock()
      const options = {
        destBucketName,
        maxConcurrentUploads,
        srcDirectory
      }
      const glob = generateGlob()
      emitCallback = glob.emitCallback

      concurrentFileUpload = new ConcurrentFileUpload(
        s3 as any,
        options as any,
        fsMock as any,
        glob.mockGlob as any
      )
    })

    it('concurrent uploads as per set in constructor will happen', async () => {
      concurrentFileUpload.start()

      emitCallback(globPath, mockFiles)

      await flushAsyncFn()

      const stats = concurrentFileUpload.getStats()
      expect(Object.keys(stats)).to.have.lengthOf(maxConcurrentUploads)
      expect(Boolean(stats[mockFiles[0]])).to.equal(true)
      expect(Boolean(stats[mockFiles[1]])).to.equal(true)
      expect(Boolean(stats[mockFiles[2]])).to.equal(true)
      expect(Boolean(stats[mockFiles[3]])).to.equal(true)
      expect(Boolean(stats[mockFiles[4]])).to.equal(true)
      expect(Boolean(stats[mockFiles[5]])).to.equal(false)
      expect(Boolean(stats[mockFiles[6]])).to.equal(false)
      expect(Boolean(stats[mockFiles[7]])).to.equal(false)
    })

    it('when an upload finishes later ones in the queue will start', async () => {
      concurrentFileUpload.start()

      emitCallback(globPath, mockFiles)

      await flushAsyncFn()

      s3.emitUploadSendEvent(mockS3RequestId(destBucketName, '1'))

      await flushAsyncFn()

      const stats = concurrentFileUpload.getStats()
      expect(Object.keys(stats)).to.have.lengthOf(maxConcurrentUploads)
      expect(Boolean(stats[mockFiles[0]])).to.equal(false)
      expect(Boolean(stats[mockFiles[1]])).to.equal(true)
      expect(Boolean(stats[mockFiles[2]])).to.equal(true)
      expect(Boolean(stats[mockFiles[3]])).to.equal(true)
      expect(Boolean(stats[mockFiles[4]])).to.equal(true)
      expect(Boolean(stats[mockFiles[5]])).to.equal(true)
      expect(Boolean(stats[mockFiles[6]])).to.equal(false)
      expect(Boolean(stats[mockFiles[7]])).to.equal(false)
    })

    it('whichever upload finishes first will be replaced by pending ones in the queue', async () => {
      concurrentFileUpload.start()

      emitCallback(globPath, mockFiles)

      await flushAsyncFn()

      s3.emitUploadSendEvent(mockS3RequestId(destBucketName, '3'))

      await flushAsyncFn()

      const stats = concurrentFileUpload.getStats()
      expect(Object.keys(stats)).to.have.lengthOf(maxConcurrentUploads)
      expect(Boolean(stats[mockFiles[0]])).to.equal(true)
      expect(Boolean(stats[mockFiles[1]])).to.equal(true)
      expect(Boolean(stats[mockFiles[2]])).to.equal(false)
      expect(Boolean(stats[mockFiles[3]])).to.equal(true)
      expect(Boolean(stats[mockFiles[4]])).to.equal(true)
      expect(Boolean(stats[mockFiles[5]])).to.equal(true)
      expect(Boolean(stats[mockFiles[6]])).to.equal(false)
      expect(Boolean(stats[mockFiles[7]])).to.equal(false)
    })

    it('stats will be empty once all uploads have finished', async () => {
      concurrentFileUpload.start()

      emitCallback(globPath, mockFiles)

      await flushAsyncFn()
      s3.emitUploadSendEvent(mockS3RequestId(destBucketName, '1'))
      await flushAsyncFn()
      s3.emitUploadSendEvent(mockS3RequestId(destBucketName, '2'))
      await flushAsyncFn()
      s3.emitUploadSendEvent(mockS3RequestId(destBucketName, '3'))
      await flushAsyncFn()
      s3.emitUploadSendEvent(mockS3RequestId(destBucketName, '4'))
      await flushAsyncFn()
      s3.emitUploadSendEvent(mockS3RequestId(destBucketName, '5'))
      await flushAsyncFn()
      s3.emitUploadSendEvent(mockS3RequestId(destBucketName, '6'))
      await flushAsyncFn()
      s3.emitUploadSendEvent(mockS3RequestId(destBucketName, '7'))
      await flushAsyncFn()
      s3.emitUploadSendEvent(mockS3RequestId(destBucketName, '8'))

      await flushAsyncFn()

      const stats = concurrentFileUpload.getStats()
      expect(Object.keys(stats)).to.have.lengthOf(0)
      expect(Boolean(stats[mockFiles[0]])).to.equal(false)
      expect(Boolean(stats[mockFiles[1]])).to.equal(false)
      expect(Boolean(stats[mockFiles[2]])).to.equal(false)
      expect(Boolean(stats[mockFiles[3]])).to.equal(false)
      expect(Boolean(stats[mockFiles[4]])).to.equal(false)
      expect(Boolean(stats[mockFiles[5]])).to.equal(false)
      expect(Boolean(stats[mockFiles[6]])).to.equal(false)
      expect(Boolean(stats[mockFiles[7]])).to.equal(false)
    })
  })
})
