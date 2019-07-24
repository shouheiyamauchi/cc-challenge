import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'

import ConcurrentFileDownload from '../../../lib/ConcurrentFileTransfer/ConcurrentFileDownload'
import { flushAsyncFn } from '../../helpers/promise'
import fsMock from '../../mocks/fs'
import S3Mock, { mockObjectId } from '../../mocks/S3'

chai.use(chaiAsPromised)

describe('ConcurrentFileDownload', () => {
  describe('without maxConcurrentDownloads option', () => {
    let s3: S3Mock
    let bucketName: string
    let keys: string[]
    let concurrentFileDownload: ConcurrentFileDownload

    beforeEach(() => {
      s3 = new S3Mock()
      bucketName = 'mockBucket'
      keys = ['1', '2', '3', '4', '5']
      const s3Objects = keys.map((key) => ({
        Key: key,
        Size: 1000
      }))
      const options = {
        bucketName,
        s3Objects
      }

      concurrentFileDownload = new ConcurrentFileDownload(
        s3 as any,
        options as any,
        fsMock as any
      )
    })

    it('by default only 4 concurrent downloads will happen', async () => {
      concurrentFileDownload.start()

      const stats = concurrentFileDownload.getStats()
      expect(Object.keys(stats)).to.have.lengthOf(4)
      expect(Boolean(stats['1'])).to.equal(true)
      expect(Boolean(stats['2'])).to.equal(true)
      expect(Boolean(stats['3'])).to.equal(true)
      expect(Boolean(stats['4'])).to.equal(true)
      expect(Boolean(stats['5'])).to.equal(false)
    })

    it('when a download finishes later ones in the queue will start', async () => {
      concurrentFileDownload.start()

      await flushAsyncFn()
      s3.emitReadStreamEvent(mockObjectId(bucketName, '1'), 'finish')

      await flushAsyncFn()

      const stats = concurrentFileDownload.getStats()
      expect(Object.keys(stats)).to.have.lengthOf(4)
      expect(Boolean(stats['1'])).to.equal(false)
      expect(Boolean(stats['2'])).to.equal(true)
      expect(Boolean(stats['3'])).to.equal(true)
      expect(Boolean(stats['4'])).to.equal(true)
      expect(Boolean(stats['5'])).to.equal(true)
    })

    it('whichever download finishes first will be replaced by pending ones in the queue', async () => {
      concurrentFileDownload.start()

      await flushAsyncFn()
      s3.emitReadStreamEvent(mockObjectId(bucketName, '3'), 'finish')

      await flushAsyncFn()

      const stats = concurrentFileDownload.getStats()
      expect(Object.keys(stats)).to.have.lengthOf(4)
      expect(Boolean(stats['1'])).to.equal(true)
      expect(Boolean(stats['2'])).to.equal(true)
      expect(Boolean(stats['3'])).to.equal(false)
      expect(Boolean(stats['4'])).to.equal(true)
      expect(Boolean(stats['5'])).to.equal(true)
    })

    it('stats will be empty once all downloads have finished', async () => {
      concurrentFileDownload.start()

      await flushAsyncFn()
      s3.emitReadStreamEvent(mockObjectId(bucketName, '1'), 'finish')
      await flushAsyncFn()
      s3.emitReadStreamEvent(mockObjectId(bucketName, '2'), 'finish')
      await flushAsyncFn()
      s3.emitReadStreamEvent(mockObjectId(bucketName, '3'), 'finish')
      await flushAsyncFn()
      s3.emitReadStreamEvent(mockObjectId(bucketName, '4'), 'finish')
      await flushAsyncFn()
      s3.emitReadStreamEvent(mockObjectId(bucketName, '5'), 'finish')

      await flushAsyncFn()

      const stats = concurrentFileDownload.getStats()
      expect(Object.keys(stats)).to.have.lengthOf(0)
      expect(Boolean(stats['1'])).to.equal(false)
      expect(Boolean(stats['2'])).to.equal(false)
      expect(Boolean(stats['3'])).to.equal(false)
      expect(Boolean(stats['4'])).to.equal(false)
      expect(Boolean(stats['5'])).to.equal(false)
    })
  })

  describe('with maxConcurrentDownloads option', () => {
    let s3: S3Mock
    let bucketName: string
    let keys: string[]
    let concurrentFileDownload: ConcurrentFileDownload
    const maxConcurrentDownloads = 5

    beforeEach(() => {
      s3 = new S3Mock()
      bucketName = 'mockBucket'
      keys = ['1', '2', '3', '4', '5', '6', '7', '8']
      const s3Objects = keys.map((key) => ({
        Key: key,
        Size: 1000
      }))
      const options = {
        bucketName,
        maxConcurrentDownloads,
        s3Objects
      }

      concurrentFileDownload = new ConcurrentFileDownload(
        s3 as any,
        options as any,
        fsMock as any
      )
    })

    it('concurrent downloads as per set in constructor will happen', async () => {
      concurrentFileDownload.start()

      const stats = concurrentFileDownload.getStats()
      expect(Object.keys(stats)).to.have.lengthOf(maxConcurrentDownloads)
      expect(Boolean(stats['1'])).to.equal(true)
      expect(Boolean(stats['2'])).to.equal(true)
      expect(Boolean(stats['3'])).to.equal(true)
      expect(Boolean(stats['4'])).to.equal(true)
      expect(Boolean(stats['5'])).to.equal(true)
      expect(Boolean(stats['6'])).to.equal(false)
      expect(Boolean(stats['7'])).to.equal(false)
      expect(Boolean(stats['8'])).to.equal(false)
    })

    it('when a download finishes later ones in the queue will start', async () => {
      concurrentFileDownload.start()

      await flushAsyncFn()
      s3.emitReadStreamEvent(mockObjectId(bucketName, '1'), 'finish')

      await flushAsyncFn()

      const stats = concurrentFileDownload.getStats()
      expect(Object.keys(stats)).to.have.lengthOf(maxConcurrentDownloads)
      expect(Boolean(stats['1'])).to.equal(false)
      expect(Boolean(stats['2'])).to.equal(true)
      expect(Boolean(stats['3'])).to.equal(true)
      expect(Boolean(stats['4'])).to.equal(true)
      expect(Boolean(stats['5'])).to.equal(true)
      expect(Boolean(stats['6'])).to.equal(true)
      expect(Boolean(stats['7'])).to.equal(false)
      expect(Boolean(stats['8'])).to.equal(false)
    })

    it('whichever download finishes first will be replaced by pending ones in the queue', async () => {
      concurrentFileDownload.start()

      await flushAsyncFn()
      s3.emitReadStreamEvent(mockObjectId(bucketName, '3'), 'finish')

      await flushAsyncFn()

      const stats = concurrentFileDownload.getStats()
      expect(Object.keys(stats)).to.have.lengthOf(maxConcurrentDownloads)
      expect(Boolean(stats['1'])).to.equal(true)
      expect(Boolean(stats['2'])).to.equal(true)
      expect(Boolean(stats['3'])).to.equal(false)
      expect(Boolean(stats['4'])).to.equal(true)
      expect(Boolean(stats['5'])).to.equal(true)
      expect(Boolean(stats['6'])).to.equal(true)
      expect(Boolean(stats['7'])).to.equal(false)
      expect(Boolean(stats['8'])).to.equal(false)
    })

    it('stats will be empty once all downloads have finished', async () => {
      concurrentFileDownload.start()

      await flushAsyncFn()
      s3.emitReadStreamEvent(mockObjectId(bucketName, '1'), 'finish')
      await flushAsyncFn()
      s3.emitReadStreamEvent(mockObjectId(bucketName, '2'), 'finish')
      await flushAsyncFn()
      s3.emitReadStreamEvent(mockObjectId(bucketName, '3'), 'finish')
      await flushAsyncFn()
      s3.emitReadStreamEvent(mockObjectId(bucketName, '4'), 'finish')
      await flushAsyncFn()
      s3.emitReadStreamEvent(mockObjectId(bucketName, '5'), 'finish')
      await flushAsyncFn()
      s3.emitReadStreamEvent(mockObjectId(bucketName, '6'), 'finish')
      await flushAsyncFn()
      s3.emitReadStreamEvent(mockObjectId(bucketName, '7'), 'finish')
      await flushAsyncFn()
      s3.emitReadStreamEvent(mockObjectId(bucketName, '8'), 'finish')

      await flushAsyncFn()

      const stats = concurrentFileDownload.getStats()
      expect(Object.keys(stats)).to.have.lengthOf(0)
      expect(Boolean(stats['1'])).to.equal(false)
      expect(Boolean(stats['2'])).to.equal(false)
      expect(Boolean(stats['3'])).to.equal(false)
      expect(Boolean(stats['4'])).to.equal(false)
      expect(Boolean(stats['5'])).to.equal(false)
      expect(Boolean(stats['6'])).to.equal(false)
      expect(Boolean(stats['7'])).to.equal(false)
      expect(Boolean(stats['8'])).to.equal(false)
    })
  })
})
