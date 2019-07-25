import fs from 'fs-extra'
import inquirer from 'inquirer'

import config from '../../config'

export const promptOptions = (choices: string[]) =>
  inquirer.prompt<{
    choice: string
  }>([
    {
      choices,
      message: 'Please choose from the following options.',
      name: 'choice',
      type: 'list'
    }
  ])

export const getAwsCredentials = () =>
  inquirer.prompt<{
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

export const askUseSameCredentials = () =>
  inquirer.prompt<{
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

export const getDownloadbucketName = () =>
  inquirer.prompt<{
    bucketName: string
  }>([
    {
      message:
        'Please enter the name of the S3 bucket you would like to download',
      name: 'bucketName',
      type: 'input',
      validate: async (value) => {
        if (!value) {
          return 'Bucket name is required'
        }
        return (await fs.pathExists(`${config.downloadPath}/${value}`))
          ? 'You must remove the already existing folder'
          : true
      }
    }
  ])

export const askUploadDownloadedFolder = (bucketName: string) =>
  inquirer.prompt<{
    upload: string
  }>([
    {
      choices: ['Yes', 'No'],
      message: `Would you like to upload the folder '${bucketName}' which you downloaded in the current session?`,
      name: 'upload',
      type: 'list'
    }
  ])

export const getUploadSrcDirectory = () =>
  inquirer.prompt<{
    srcDirectory: string
  }>([
    {
      message:
        'Please enter the name of the directory in the downloads folder you would like to upload',
      name: 'srcDirectory',
      type: 'input',
      validate: async (value) => {
        if (!value) {
          return 'Directory name is required'
        }
        return (await fs.pathExists(`${config.downloadPath}/${value}`))
          ? true
          : 'Directory does not exist'
      }
    }
  ])

export const getUploadOptions = () =>
  inquirer.prompt<{
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

export const getConcurrentTransferNo = () =>
  inquirer.prompt<{
    concurrentTransfers: number
  }>([
    {
      default: 4,
      message:
        'Select the number of concurrent file transfers you would like to perform',
      name: 'concurrentTransfers',
      type: 'number',
      validate: (value) => typeof value === 'number' || 'Valid number required'
    }
  ])
