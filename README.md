# RFCoverageWebServer
Go based RF coverage webserver

Requires Signal Server HD binary, with SDF files
Requires ImageMagick library convert utility
`sudo yum install ImageMagick`

Must add rc.local file to /etc/rc.local for run on bootup
This script adds the efs filesystem

Make sure you add aws cli for s3 functionality