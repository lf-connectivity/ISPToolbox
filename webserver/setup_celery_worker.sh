#!/bin/bash
cd ~/
git clone https://github.com/alexychongfb/RFCoverageWebServer
sudo apt-get update
sudo apt-get install python3-venv
python3 -m venv env
source ~/env/bin/activate
pip install -r ~/RFCoverageWebServer/deep_gis/requirements.txt
sudo apt-get install gdal-bin python-gdal python3-gdal libglib2.0-0 libsm6 libxext6 libxrender-dev