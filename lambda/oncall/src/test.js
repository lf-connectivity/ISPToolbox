// (c) Meta Platforms, Inc. and affiliates. Copyright
const lambda = require('./index.js');

const TEST_ALERT = {
    "Records": [
      {
        "EventSource": "aws:sns",
        "EventVersion": "1.0",
        "EventSubscriptionArn": "arn:aws:sns:us-east-1:{{{accountId}}}:ExampleTopic",
        "Sns": {
          "Type": "Notification",
          "MessageId": "95df01b4-ee98-5cb9-9903-4c221d41eb5e",
          "TopicArn": "arn:aws:sns:us-east-1:123456789012:ExampleTopic",
          "Subject": "example subject",
          "Message": "example message",
          "Timestamp": "1970-01-01T00:00:00.000Z",
          "SignatureVersion": "1",
          "Signature": "EXAMPLE",
          "SigningCertUrl": "EXAMPLE",
          "UnsubscribeUrl": "EXAMPLE",
          "MessageAttributes": {
            "Test": {
              "Type": "String",
              "Value": "TestString"
            },
            "TestBinary": {
              "Type": "Binary",
              "Value": "TestBinary"
            }
          }
        }
      }
    ]
  }

const test_callback = (response) => {
    console.log(response);
}

const runTests = async () => {
    await lambda(TEST_ALERT, {});
}

runTests();
