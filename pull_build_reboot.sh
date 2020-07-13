#!/bin/bash
cd ~/RFCoverageWebServer
git pull
go build main.go
sudo reboot
