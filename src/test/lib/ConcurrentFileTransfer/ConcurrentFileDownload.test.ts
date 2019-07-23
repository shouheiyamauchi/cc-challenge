import AWS from 'aws-sdk'
import { expect } from 'chai'
import fs from 'fs-extra'

import ConcurrentFileDownload from '../../../lib/ConcurrentFileTransfer/ConcurrentFileDownload'

describe('ConcurrentFileDownload', () => {
  it('dummy test', () => {
    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      region: 'ap-southeast-2',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    })

    const sample = new ConcurrentFileDownload(s3, { s3Objects: [] } as any, fs)

    expect(1).to.equal(1)
  })
})
