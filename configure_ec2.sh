#!/bin/bash
sudo cp /mnt/efs/fs1/alex/* ~/.aws
sudo chown -R ec2-user:ec2-user ~/.aws
yum update
sudo amazon-linux-extras install epel
sudo yum install redis
sudo curl -L "https://github.com/docker/compose/releases/download/1.26.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
sudo ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose
sudo systemctl start docker
docker-compose build
docker-compose up -d
