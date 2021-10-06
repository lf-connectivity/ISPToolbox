'use strict';

const querystring = require('querystring');
const request_lib = require('request');
// Load the AWS SDK
var AWS = require('aws-sdk'),
    region = "us-west-1",
    secretName = "prod/fb_sdk_isptoolbox",
    app_id_key = 'fb_sdk_isptoolbox_app_key',
    app_secret_key = 'fb_sdk_isptoolbox_app_secret';

// Create a Secrets Manager client
var client = new AWS.SecretsManager({
    region: region
});

// Use Secret From AWS Secrets Manager
let secret;
const getSecret = async () => {
    const secret_request = await client.getSecretValue({ SecretId: secretName }).promise();
    const secrets = JSON.parse(secret_request.SecretString);
    return { app_id: secrets[app_id_key], app_secret: secrets[app_secret_key] };
};

function alertOncall(msg, options) {
    if (!secret) {
        secret = await getSecret();
    }
    const app_id = secret.app_id;
    const app_secret = secret.app_secret;
    var options = {
        'method': 'POST',
        'url': 'https://www.facebook.com/isptoolbox/admin_page/',
        'headers': {
            'Authorization': `Bearer ${app_id}|${app_secret}`,
        },
        formData: {
            'app_id': app_id,
            'msg': msg,
            'call': options.call,
            'mail': options.mail,
            'sms': options.sms,
            'push': options.push
        }
    };
    request_lib(options, function (error, response) {
        if (error) throw new Error(error);
        console.log(response.body);
    });
}

/**
 * Check if user is allowed to access tile based on access token
 * @param {*} event 
 * @param {*} context
 * @param {*} callback
 * @returns 
 */
exports.handler = async (event, context) => {
    const sns_msg = event.Records[0].Sns;
    const msg = `${sns_msg.Subject} - ${sns_msg.Message} - ${sns_msg.UnsubscribeUrl}`
    const default_options = {
        'call': false,
        'mail': true,
        'sms': true,
        'push': true,
    };
    alertOncall(msg, default_options);
    console.log(`Alerted Oncall: ${msg}`);
};