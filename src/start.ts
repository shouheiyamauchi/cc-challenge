import AWS from 'aws-sdk'
import fs from 'fs-extra'
import glob from 'glob'
import inquirer from 'inquirer'
import logUpdate from 'log-update'

import config from './config'
import sessionValues from './config/sessionValues'
import ConcurrentFileTransfer, {
  displayProgress,
  generateFileDownloadObjects,
  generateFileUploadObjects
} from './lib/ConcurrentFileTransfer'

const setAWSCredentials = async () => {
  const { accessKeyId, region, secretAccessKey } = sessionValues.awsCredentials
  if (accessKeyId && region && secretAccessKey) {
    const useSameCredentials = await inquirer.prompt<{
      reuse: string
    }>([
      {
        choices: ['Yes', 'No'],
        message:
          'Would you like to reuse the same AWS credentials already entered?',
        name: 'reuse',
        type: 'list'
      }
    ])

    if (useSameCredentials.reuse === 'Yes') {
      return
    }
  }

  const awsValues = await inquirer.prompt<{
    accessKeyId: string
    region: string
    secretAccessKey: string
  }>([
    {
      message:
        'Please enter the AWS region the bucket is located (e.g. ap-southeast-2)',
      name: 'region',
      type: 'input',
      validate: (value) => Boolean(value) || 'Region is required'
    },
    {
      message:
        'Please enter your AWS access key ID which has access to the bucket',
      name: 'accessKeyId',
      type: 'input',
      validate: (value) => Boolean(value) || 'Access key ID is required'
    },
    {
      message:
        'Please enter your AWS secret access key which has access to the bucket',
      name: 'secretAccessKey',
      type: 'input',
      validate: (value) => Boolean(value) || 'Secret access key is required'
    }
  ])

  sessionValues.awsCredentials = awsValues
}

const downloadS3Bucket = async () => {
  await setAWSCredentials()

  const s3 = new AWS.S3(sessionValues.awsCredentials)

  const downloadOptions = await inquirer.prompt<{
    bucketName: string
  }>([
    {
      message:
        'Please enter the name of the S3 bucket you would like to download',
      name: 'bucketName',
      type: 'input',
      validate: (value) => Boolean(value) || 'Bucket name is required'
    }
  ])

  sessionValues.downloadOptions = downloadOptions

  const { bucketName } = sessionValues.downloadOptions

  const fileDownloadObjects = await generateFileDownloadObjects(
    s3,
    { bucketName },
    fs
  )

  const concurrentDownload = new ConcurrentFileTransfer(fileDownloadObjects)

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
    const uploadDownloadedBucket = await inquirer.prompt<{
      upload: string
    }>([
      {
        choices: ['Yes', 'No'],
        message: `Would you like to upload the folder '${bucketName}' which you downloaded in the current session?`,
        name: 'upload',
        type: 'list'
      }
    ])

    if (uploadDownloadedBucket.upload === 'Yes') {
      sessionValues.uploadOptions.srcDirectory = bucketName
    }
  }

  if (!sessionValues.uploadOptions.srcDirectory) {
    const srcDirectoryOption = await inquirer.prompt<{
      srcDirectory: string
    }>([
      {
        message:
          'Please enter the name of the source directory in the download folder',
        name: 'srcDirectory',
        type: 'input',
        validate: (value) => Boolean(value) || 'Source directory is required'
      }
    ])

    sessionValues.uploadOptions.srcDirectory = srcDirectoryOption.srcDirectory
  }

  const uploadOptions = await inquirer.prompt<{
    destBucketName: string
    kmsKeyId: string
  }>([
    {
      message:
        'Please enter the name of the S3 bucket you would like to upload to',
      name: 'destBucketName',
      type: 'input',
      validate: (value) => Boolean(value) || 'Bucket name is required'
    },
    {
      // https://docs.aws.amazon.com/kms/latest/APIReference/API_Encrypt.html
      message:
        'Please enter your CMK key ID you would like to encrypt the files with',
      name: 'kmsKeyId',
      type: 'input',
      validate: (value) => Boolean(value) || 'CMK key ID is required'
    }
  ])

  sessionValues.uploadOptions.destBucketName = uploadOptions.destBucketName
  sessionValues.uploadOptions.kmsKeyId = uploadOptions.kmsKeyId

  const fileUploadObjects = await generateFileUploadObjects(
    s3,
    sessionValues.uploadOptions,
    glob,
    fs
  )

  const concurrentDownload = new ConcurrentFileTransfer(fileUploadObjects)

  const displayProgressInterval = displayProgress(concurrentDownload)

  return new Promise((resolve) => {
    console.log('Upload Progress:')
    concurrentDownload.start().then(() => {
      clearInterval(displayProgressInterval)
      logUpdate.clear()
      console.log(`All files uploaded to AWS bucket: ${bucketName}`)
      resolve()
    })
  })
}

const start = async () => {
  const downloadChoice = 'Download S3 bucket'
  const uploadChoice = 'Upload files to S3 bucket'
  const exitChoice = 'Exit'

  const action = await inquirer.prompt<{
    choice: string
  }>([
    {
      choices: [downloadChoice, uploadChoice, exitChoice],
      message: 'Please choose from the following options.',
      name: 'choice',
      type: 'list'
    }
  ])

  switch (action.choice) {
    case downloadChoice:
      try {
        await downloadS3Bucket()
      } catch {
        console.log(
          'There was an error while attempting to download due to invalid inputs. Please check your inputs and try again.'
        )
      }
      break
    case uploadChoice:
      try {
        await uploadToS3Bucket()
      } catch {
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

start()
