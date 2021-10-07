'use strict';

const querystring = require('querystring');
var axios = require('axios');
var FormData = require('form-data');

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

async function alertOncall(msg, options) {
    if (!secret) {
        secret = await getSecret();
    }
    const app_id = secret.app_id;
    const app_secret = secret.app_secret;

    var data = new FormData();
    data.append('app_id', app_id);
    data.append('msg', msg);
    data.append('call', options.call);
    data.append('mail', options.mail);
    data.append('sms', options.sms);
    data.append('push', options.push);

    var config = {
        method: 'post',
        url: 'https://www.facebook.com/isptoolbox/admin_page/',
        headers: {
            'Authorization': `Bearer ${app_id}|${app_secret}`,
            ...data.getHeaders()
        },
        data: data
    };
    try {
        const resp = await axios(config);
        console.log(resp.data);
    } catch (err) {
        console.error(err)
    }
}

/**
 * Send page to oncall for isptoolbox
 * @param {*} event 
 * @param {*} context
 * @returns 
 */
exports.handler = async (event, context) => {
    const sns_msg = event.Records[0].Sns;
    const msg = `${sns_msg.Subject} - ${sns_msg.Message} - ${sns_msg.UnsubscribeUrl}`
    const default_options = {
        'call': 'true',
        'mail': 'true',
        'sms': 'true',
        'push': 'true',
    };
    await alertOncall(msg, default_options);
    console.log(`Alerted Oncall: ${msg}`);
};