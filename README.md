# RFCoverageWebServer
Go based RF coverage webserver

Requires Signal Server HD binary, with SDF files
Requires ImageMagick library convert utility
`sudo yum install ImageMagick`

Must add rc.local file to /etc/rc.local for run on bootup
This script adds the efs filesystem

Make sure you add aws cli for s3 functionality

Worker command (GPU):
`celery worker -A deep_gis --loglevel=info`

Server Side (webserver):
run django or `python3 manage.py shell`
```from gis_creator.tasks import adding_task
task = adding_task.delay(2, 5)```