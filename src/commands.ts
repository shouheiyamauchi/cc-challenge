import AWS from 'aws-sdk'
import fs from 'fs-extra'
import glob from 'glob'
import logUpdate from 'log-update'

import config from './config'
import sessionValues, {
  resetAwsCredentials,
  resetDownloadOptions,
  resetUploadOptions
} from './config/sessionValues'
import ConcurrentFileTransfer, {
  displayProgress,
  generateFileDownloadObjects,
  generateFileUploadObjects
} from './lib/ConcurrentFileTransfer'
import {
  askUploadDownloadedFolder,
  askUseSameCredentials,
  getAwsCredentials,
  getConcurrentTransferNo,
  getDownloadbucketName,
  getUploadOptions,
  getUploadSrcDirectory,
  promptOptions
} from './lib/helpers/inquirer'

export const start = async () => {
  const downloadChoice = 'Download S3 bucket'
  const uploadChoice = 'Upload files to S3 bucket'
  const exitChoice = 'Exit'

  const action = await promptOptions([downloadChoice, uploadChoice, exitChoice])

  switch (action.choice) {
    case downloadChoice:
      try {
        await downloadS3Bucket()
      } catch {
        // remove invalid data on fail
        resetAwsCredentials()
        resetDownloadOptions()
        console.log(
          'There was an error while attempting to download due to invalid inputs. Please check your inputs and try again.'
        )
      }
      break
    case uploadChoice:
      try {
        await uploadToS3Bucket()
      } catch {
        // remove invalid data on fail
        resetAwsCredentials()
        resetUploadOptions()
        console.log(
          'There was an error while attempting to upload due to invalid inputs. Please check your inputs and try again.'
        )
      }
      break
    case exitChoice:
      process.exit()
      break
  }

  start()
}

const setAWSCredentials = async () => {
  const { accessKeyId, region, secretAccessKey } = sessionValues.awsCredentials
  if (accessKeyId && region && secretAccessKey) {
    const useSameCredentials = await askUseSameCredentials()

    if (useSameCredentials.reuse === 'Yes') {
      return
    }
  }

  const awsCredentials = await getAwsCredentials()

  sessionValues.awsCredentials = awsCredentials
}

const downloadS3Bucket = async () => {
  await setAWSCredentials()

  const s3 = new AWS.S3(sessionValues.awsCredentials)

  const downloadOptions = await getDownloadbucketName()

  // persist values for use when uploading
  sessionValues.downloadOptions = downloadOptions

  const { bucketName } = sessionValues.downloadOptions

  const fileDownloadObjects = await generateFileDownloadObjects(
    s3,
    { bucketName },
    fs
  )

  const { concurrentTransfers } = await getConcurrentTransferNo()

  const concurrentDownload = new ConcurrentFileTransfer(
    fileDownloadObjects,
    concurrentTransfers
  )

  const displayProgressInterval = displayProgress(concurrentDownload)

  return new Promise((resolve) => {
    console.log('Download Progress:')
    concurrentDownload.start().then(() => {
      clearInterval(displayProgressInterval)
      logUpdate.clear()
      console.log(`All files saved to: ${config.downloadPath}/${bucketName}/`)
      resolve()
    })
  })
}

const uploadToS3Bucket = async () => {
  await setAWSCredentials()

  const s3 = new AWS.S3(sessionValues.awsCredentials)

  const { bucketName } = sessionValues.downloadOptions

  if (bucketName) {
    const uploadDownloadedFolder = await askUploadDownloadedFolder(bucketName)

    if (uploadDownloadedFolder.upload === 'Yes') {
      sessionValues.uploadOptions.srcDirectory = bucketName
    }
  }

  if (!sessionValues.uploadOptions.srcDirectory) {
    const srcDirectoryOption = await getUploadSrcDirectory()

    sessionValues.uploadOptions.srcDirectory = srcDirectoryOption.srcDirectory
  }

  const uploadOptions = await getUploadOptions()

  sessionValues.uploadOptions.destBucketName = uploadOptions.destBucketName
  sessionValues.uploadOptions.kmsKeyId = uploadOptions.kmsKeyId

  const fileUploadObjects = await generateFileUploadObjects(
    s3,
    sessionValues.uploadOptions,
    glob,
    fs
  )

  const { concurrentTransfers } = await getConcurrentTransferNo()

  const concurrentUpload = new ConcurrentFileTransfer(
    fileUploadObjects,
    concurrentTransfers
  )

  const displayProgressInterval = displayProgress(concurrentUpload)

  return new Promise((resolve) => {
    console.log('Upload Progress:')
    concurrentUpload.start().then(() => {
      clearInterval(displayProgressInterval)
      logUpdate.clear()
      console.log(`All files uploaded to AWS bucket: ${bucketName}`)
      resolve()
    })
  })
}
