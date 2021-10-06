#!/bin/bash
set -e
BASEDIR=$(dirname "$0")

LAMBDA_FUNC_NAME="alert_fb_oncall"
echo "Zipping Lambda Oncall"
rm -rf src/node_modules/
cd $BASEDIR/src/; npm install --only=prod; cd -
rm -f function.zip
cd $BASEDIR/src/; zip -r ../../function.zip *; cd -
echo "Updating Lambda function"
aws lambda update-function-code --region us-west-1 \
--function-name $2 --zip-file fileb://$BASEDIR/function.zip