#!/bin/bash
systemctl stop redis
redis-server ./redis.conf --daemonize yes 