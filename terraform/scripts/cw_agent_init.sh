# (c) Meta Platforms, Inc. and affiliates. Copyright
sudo yum -y install amazon-cloudwatch-agent
sudo touch /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json 
echo '{
        "agent": {
                "metrics_collection_interval": 60,
                "run_as_user": "root"
        },
        "metrics": {
                "namespace": "ISPToolbox/AsyncWorkerDiskStats",
                "append_dimensions": {
                        "AutoScalingGroupName": "${aws:AutoScalingGroupName}",
                        "ImageId": "${aws:ImageId}",
                        "InstanceId": "${aws:InstanceId}",
                        "InstanceType": "${aws:InstanceType}"
                },
                "aggregation_dimensions" : [["AutoScalingGroupName"], ["InstanceId", "InstanceType"]],
                "metrics_collected": {
                        "disk": {
                                "measurement": [
                                        "used_percent"
                                ],
                                "metrics_collection_interval": 60,
                                "resources": [
                                        "*"
                                ]
                        }
                }
        }
}' | sudo tee /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -s -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json