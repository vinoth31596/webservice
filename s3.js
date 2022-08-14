// require('dotenv').config()
const fs = require('fs')
const S3 = require('aws-sdk/clients/s3')

const bucketName = process.env.S3_BUCKET_NAME
const region = process.env.S3_BUCKET_REGION
const accessKeyId = "AKIAYV3O5ORLK5G5FDUE"
const secretAccessKey = "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"

const s3 = new S3({
  region,
  accessKeyId,
  secretAccessKey
})

// uploads a file to s3
function uploadFile(file) {
  const fileStream = fs.createReadStream(file.path)
  console.log(bucketName);
  console.log(region);
  console.log(accessKeyId);
  console.log(secretAccessKey);

  const uploadParams = {
    Bucket: bucketName,
    Body: fileStream,
    Key: file.filename
  }

  return s3.upload(uploadParams).promise()
}
exports.uploadFile = uploadFile


// downloads a file from s3
function getFileStream(fileKey) {
  const downloadParams = {
    Key: fileKey,
    Bucket: bucketName
  }

  return s3.getObject(downloadParams).createReadStream()
}
exports.getFileStream = getFileStream

//delete file
function deleteFile(fileKey) {
    const downloadParams = {
      Key: fileKey,
      Bucket: bucketName
    }
  
    return s3.deleteObject(downloadParams).createReadStream()
  }

  exports.deleteFile = deleteFile