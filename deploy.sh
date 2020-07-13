#!/bin/bash
aws elb register-instances-with-load-balancer --load-balancer-name WISPCatLB --instances i-00c3c5c0f6f5eb42b
aws elb register-instances-with-load-balancer --load-balancer-name WISPCatLB --instances i-0c60c800044d3c51c

aws elb deregister-instances-from-load-balancer --load-balancer-name WISPCatLB --instances i-0c60c800044d3c51c
aws elb deregister-instances-from-load-balancer --load-balancer-name WISPCatLB --instances i-00c3c5c0f6f5eb42b
