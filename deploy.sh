#!/bin/bash
INSTANCE_ID=$(ec2-metadata -i | awk '{ print $2 }')
aws elb deregister-instances-from-load-balancer --load-balancer-name WISPCatLB --instances $INSTANCE_ID
cd ~/RFCoverageWebServer/
git pull
sudo ~/RFCoverageWebServer/build_and_run.sh
aws elb register-instances-with-load-balancer --load-balancer-name WISPCatLB --instances $INSTANCE_ID