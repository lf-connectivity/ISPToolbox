#!/bin/bash
# (c) Meta Platforms, Inc. and affiliates. Copyright
set -e
echo "Checking for any outstanding migrations"
make prod_check_migrations
# DEPLOY LATEST ECR DOCKER IMAGES TO ECS, PRODUCTION
echo "Pushing Latest image to Async Scheduler"
aws ecs update-service --cluster isptoolbox-production-async-cluster \
    --service isptoolbox-production-async-service-scheduler --force-new-deployment
echo "Pushing Latest image to Async Tier"
aws ecs update-service --cluster isptoolbox-production-async-cluster \
    --service isptoolbox-production-async-service --force-new-deployment
echo "Pushing Latest image to Web Tier"
aws ecs update-service --cluster isptoolbox-production-webserver-cluster \
    --service isptoolbox-production-webserver-service --force-new-deployment
echo "It may take a few minutes for the old containers to stop. \
    The webserver has a 300 second draining period from the load balancer"
echo "Make sure you ran migrations - otherwise users might get 500 errors"
