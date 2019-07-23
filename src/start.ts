import AWS from 'aws-sdk'
import dotenv from 'dotenv'

dotenv.config()

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  region: 'ap-southeast-2',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
})
