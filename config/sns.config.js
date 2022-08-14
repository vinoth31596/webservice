const AWS = require('aws-sdk');
require("dotenv").config();

AWS.config.region = "us-east-1";
AWS.config.credentials = new AWS.EC2MetadataCredentials({
    httpOptions: { timeout: 5000 },
    maxRetries: 10,
    retryDelayOptions: { base: 200 },
});

const publishTextPromise = new AWS.SNS({
    credentials: AWS.config.credentials,
    region: "us-east-1",
});

const sns = {};
console.log("Inside sns config");
sns.publishTextPromise = publishTextPromise;

module.exports = sns;