const AWS = require("aws-sdk");
require("dotenv").config();


AWS.config.region = "us-east-1";
AWS.config.credentials = new AWS.EC2MetadataCredentials({
    httpOptions: { timeout: 5000 },
    maxRetries: 10,
    retryDelayOptions: { base: 200 },
});
const dynamoDBClient = new AWS.DynamoDB({
    credentials: AWS.config.credentials,
    region: "us-east-1",
});

const dynamo = {};
dynamo.dynamoDBClient = dynamoDBClient;

module.exports = dynamo;
