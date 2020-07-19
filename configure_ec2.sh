#!/bin/bash
apt-get update
apt-get install docker-compose redis-server
docker-compose build
docker-compose up -d
