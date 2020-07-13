#!/bin/bash
#13.58.12.120
aws elb deregister-instances-from-load-balancer --load-balancer-name WISPCatLB --instances i-0c60c800044d3c51c
cd ~/RFCoverageWebServer/
git pull
sudo ~/RFCoverageWebServer/build_and_run.sh
aws elb register-instances-with-load-balancer --load-balancer-name WISPCatLB --instances i-0c60c800044d3c51c





#52.14.179.116
aws elb deregister-instances-from-load-balancer --load-balancer-name WISPCatLB --instances i-00c3c5c0f6f5eb42b
cd ~/RFCoverageWebServer/
git pull
sudo ~/RFCoverageWebServer/build_and_run.sh
aws elb register-instances-with-load-balancer --load-balancer-name WISPCatLB --instances i-00c3c5c0f6f5eb42b