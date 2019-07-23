import AWS from "aws-sdk";
import { PromiseResult } from "aws-sdk/lib/request";

export const getAllBucketContents = async (s3: AWS.S3, bucketName: string) => {
  let contents: AWS.S3.Object[] = [];
  let nextContinuationToken;

  while (true) {
    const listObjectsOutput: PromiseResult<
      AWS.S3.ListObjectsV2Output,
      AWS.AWSError
    > = await s3
      .listObjectsV2({
        Bucket: bucketName,
        ContinuationToken: nextContinuationToken,
        MaxKeys: 1
      })
      .promise();

    contents = [...contents, ...listObjectsOutput.Contents];
    nextContinuationToken = listObjectsOutput.NextContinuationToken;

    if (!nextContinuationToken) {
      return contents;
    }
  }
};
