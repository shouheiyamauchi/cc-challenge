const sessionValues = {
  awsCredentials: {
    accessKeyId: '',
    region: '',
    secretAccessKey: ''
  },
  downloadOptions: {
    bucketName: ''
  },
  uploadOptions: {
    destBucketName: '',
    kmsKeyId: '',
    srcDirectory: ''
  }
}

export const resetAwsCredentials = () => {
  sessionValues.awsCredentials = {
    accessKeyId: '',
    region: '',
    secretAccessKey: ''
  }
}

export const resetDownloadOptions = () => {
  sessionValues.downloadOptions = {
    bucketName: ''
  }
}

export const resetUploadOptions = () => {
  sessionValues.uploadOptions = {
    destBucketName: '',
    kmsKeyId: '',
    srcDirectory: ''
  }
}

export default sessionValues
