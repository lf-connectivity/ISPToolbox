'use strict';

const querystring = require('querystring');
const jwt = require("jsonwebtoken");

// Load the AWS SDK
var AWS = require('aws-sdk'),
  region = "us-west-1",
  secretName = "prod/tileset_jwt_secret",
  tileSetSecretKey = 'TILESET_LAMBDA_EDGE_SECRET';

// Create a Secrets Manager client
var client = new AWS.SecretsManager({
  region: region
});

// Use Secret From AWS Secrets Manager
let secret;
const getSecret = async () => {
  const secret_request = await client.getSecretValue({ SecretId: secretName }).promise();
  const secrets = JSON.parse(secret_request.SecretString);
  return secrets[tileSetSecretKey];
};

function getTileset(uri) {
  return
}

function checkTilesetMatchesURI(tileset, uri) {
  const matches_prod_uri = uri.startsWith(`/viewshed/tiles/${tileset}/`);
  const matches_test_uri = uri.startsWith(`/viewshed/tiles_test/${tileset}/`);
  return matches_prod_uri || matches_test_uri;
}

/**
 * Check if user is allowed to access tile based on access token
 * @param {*} event 
 * @param {*} context
 * @param {*} callback
 * @returns 
 */
exports.handler = async (event, context, callback) => {
  const request = event.Records[0].cf.request;
  const { access_token } = querystring.parse(request.querystring);
  if (access_token) {
    try {
      if (!secret) {
        secret = await getSecret();
      }
      const verified_decoded_token = jwt.verify(
        access_token, secret
      );
      const { tileset } = verified_decoded_token;
      if (checkTilesetMatchesURI(tileset, request.uri)) {
        callback(null, request);
      } else {
        throw 'jwt does not match uri';
      }
    } catch (error) {
      const response = {
        status: "401",
        statusDescription: "Unauthorized JWT",
        error: String(error),
        headers: {
          location: [
            {
              key: "Location",
              value: "isptoolbox.io/401",
            },
          ],
        },
      };
      callback(null, response);
    }
  } else {
    const unauthorizedResponse = {
      status: "403",
      statusDescription: "Forbidden",
      headers: {
        location: [
          {
            key: "Location",
            value: "isptoolbox.io/403",
          },
        ],
      },
    };
    callback(null, unauthorizedResponse);
  }
};