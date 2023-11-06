// (c) Meta Platforms, Inc. and affiliates
'use strict';

// Load the Lambda Function we are going to test
const lambda = require("./index.js");
const jwt = require("jsonwebtoken");
// Load the AWS SDK
var AWS = require('aws-sdk'),
    region = "us-west-1",
    secretName = "prod/tileset_jwt_secret",
    tileSetSecretKey = 'TILESET_LAMBDA_EDGE_SECRET';
const uuid = require('uuid');

// Create a Secrets Manager client
var client = new AWS.SecretsManager({
    region: region
});
const getSecret = async () => {
    const secret_request = await client.getSecretValue({ SecretId: secretName }).promise();
    const secrets = JSON.parse(secret_request.SecretString);
    return secrets[tileSetSecretKey];
};

const createRequest = (secret, uuid_tileset) => {
    const token = jwt.sign({
        tileset: uuid_tileset,
    }, secret);
    return {
        "Records": [
            {
                "cf": {
                    "config": {
                        "distributionId": "EXAMPLE-CLOUDFRONT-DIST"
                    },
                    "request": {
                        "uri": `/viewshed/tiles_test/${uuid_tileset}/16/3000/3000.png`,
                        "querystring": `access_token=${token}`,
                        "method": "GET",
                    }
                }
            }
        ]
    }
}
const create_test_callback = (expected_value) => {
    return (idk, value) => {
        console.log("Response from lambda");
        console.dir(value);
        if (value.status === undefined && expected_value === '200'){
        } else {
            console.log(expected_value);
            if (value.status !== expected_value) {
                console.error(`Failed test, unexpected value\ngot ${value.status}\n expected:${expected_value}\n`);
                process.exit(1);
            }
        }
    }
}

const runTests = async () => {
    const secret = await getSecret();
    const uuid_tileset = uuid.v4();
    const test_request_1 = createRequest(secret, uuid_tileset);
    const test_request_2 = createRequest('invalid_secret', uuid_tileset);
    // Test Responses from Handler Function
    await lambda.handler(test_request_1, {}, create_test_callback('200'));
    await lambda.handler(test_request_2, {}, create_test_callback('401'));
}

runTests()