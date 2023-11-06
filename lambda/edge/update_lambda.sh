#!/bin/bash
# (c) Meta Platforms, Inc. and affiliates. Copyright
set -e
BASEDIR=$(dirname "$0")

for i in "viewer_request","tileset-edge-lambda-jwt" "origin_response","tileset-edge-lambda-response-jwt";
    do IFS=",";set -- $i;
    FUNC=$1
    echo "Zipping Lambda $1"
    rm -rf src/$FUNC/node_modules/
    cd $BASEDIR/src/$FUNC/; npm install --only=prod; cd -
    rm -f function.zip
    cd $BASEDIR/src/$FUNC; zip -r ../../function.zip *; cd -
    echo "Updating Lambda function $2"
    aws lambda update-function-code --region us-east-1 \
    --function-name $2 --zip-file fileb://$BASEDIR/function.zip
done
