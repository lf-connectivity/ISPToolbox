#!/bin/bash
INSTANCE_ID=$(ec2-metadata -i | awk '{ print $2 }')
aws elb deregister-instances-from-load-balancer --load-balancer-name WISPCatLB --instances $INSTANCE_ID
sudo docker stop `sudo docker ps -q`
cd ~/RFCoverageWebServer/
git pull
sudo docker-compose build
sudo docker-compose up -d
aws elb register-instances-with-load-balancer --load-balancer-name WISPCatLB --instances $INSTANCE_ID