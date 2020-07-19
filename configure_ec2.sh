#!/bin/bash
apt-get update
apt-get install docker-compose
docker-compose build
docker-compose up -d