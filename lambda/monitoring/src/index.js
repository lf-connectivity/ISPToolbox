'use strict';

const redis = require('redis');
// Load the AWS SDK
var AWS = require('aws-sdk'),
    region = "us-west-1",
    secretName = "prod/isptoolbox_django",
    redis_endpoint = 'elastiCache',
    redis_host = 'redis_endpoint',
    redis_port = 'redis_port';
const cloudwatch = new AWS.CloudWatch({
    region: region
});

const QUEUE_NAMES = ['celery', 'dsm'];

// Create a Secrets Manager client
var client = new AWS.SecretsManager({
    region: region
});

// Use Secret From AWS Secrets Manager
let secret;
const getSecret = async () => {
    const secret_request = await client.getSecretValue({ SecretId: secretName }).promise();
    const secrets = JSON.parse(secret_request.SecretString);
    return { endpoint: secrets[redis_endpoint], host: secrets[redis_host], port: secrets[redis_port]};
};

async function getStatsRedis(){
    if (!secret) {
        secret = await getSecret();
    }
    const redis_client = redis.createClient({url: secret.endpoint});
    await redis_client.connect();
    const len = {}
    await Promise.all(
        QUEUE_NAMES.map( async (n) => {len[n] = await redis_client.LLEN(n)})
    );
    redis_client.quit();
    return len;
}

/**
 * Send page to oncall for isptoolbox
 * @param {*} event 
 * @param {*} context
 * @returns 
 */
exports.handler = async (event, context, callback) => {
    const stats = await getStatsRedis();
    const params = {
        MetricData: 
            Object.keys(stats).map( k => {
                    return {
                        'MetricName': 'queue_length',
                        Dimensions: [
                            {
                              Name: 'queue_name',
                              Value: k
                            },
                        ],
                        'Unit': 'None',
                        'Value': stats[k]
                    }
                }
            ),
        Namespace: 'ISPToolbox-Celery',
      };
    await cloudwatch.putMetricData(
        params
    ).promise();
    callback(null, {});
};