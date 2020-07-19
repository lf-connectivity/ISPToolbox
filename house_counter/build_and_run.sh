#!/bin/bash
docker stop `docker ps -q`
docker build . -t homespassed && docker run -p 80:80 -d homespassed