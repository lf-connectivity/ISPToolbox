// (c) Meta Platforms, Inc. and affiliates. Copyright
/**
 * Copyright 2010-2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * This file is licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License. A copy of
 * the License is located at
 *
 * http://aws.amazon.com/apache2.0/
 *
 * This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 */

// ABOUT THIS NODE.JS SAMPLE: This sample is part of the AWS Secrets Manager.
// In this sample we only handle the specific exceptions for the 'GetSecretValue' API.
// If you need more information about configurations or implementing the sample code, visit the AWS docs:
// https://aws.amazon.com/developers/getting-started/nodejs/

// Load the AWS SDK
var AWS = require("aws-sdk"),
  region = "us-west-1";

// Create a Secrets Manager client
var client = new AWS.SecretsManager({
  region: region,
});

// In this sample we only handle the specific exceptions for the 'GetSecretValue' API.
// See https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
// We rethrow the exception by default.

export async function getSecretValue(secretName: string) {
  return JSON.parse(
    (await client.getSecretValue({ SecretId: secretName }).promise())
      .SecretString
  );
}
