import AWS from 'aws-sdk';
import config from './env.js';

const s3 = new AWS.S3({
  accessKeyId: config.AWS_ACCESS_KEY,
  secretAccessKey: config.AWS_SECRET_KEY,
  region: config.AWS_REGION,
});

export const uploadToS3 = async (file, key) => {
  const params = {
    Bucket: config.S3_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  };
  const result = await s3.upload(params).promise();
  return result.Location;
};

export { s3 };