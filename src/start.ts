import AWS from 'aws-sdk'
import dotenv from 'dotenv'
import fs from 'fs-extra'
import logUpdate from 'log-update'

import config from './config'
import ConcurrentDownload from './lib/ConcurrentFileTransfer/ConcurrentFileDownload'
import FileUpload from './lib/FileTransfer/FileUpload'
import { getAllBucketContents } from './lib/helpers/aws'

dotenv.config()

const downloadScript = async () => {
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    region: 'ap-southeast-2',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  })

  // const fileUpload = new FileUpload(s3, 'h3rmes', 'video.mp4', 'arn:aws:kms:ap-southeast-2:558337816626:key/06d94ed8-5752-4a27-aad9-e3af37649462', fs)
  // fileUpload.start()

  const contents = await getAllBucketContents(s3, 'h3rmes')

  const concurrentDownload = new ConcurrentDownload(s3, 'h3rmes', contents, fs)

  concurrentDownload.start()
  //
  setInterval(() => {
    console.log(concurrentDownload.getStats())
    // console.log(fileUpload.getStats())
  }, 10)
}

downloadScript()
