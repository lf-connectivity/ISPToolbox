# ISP Toolbox Webserver
ISP Toolbox Backend Server Code
- powers market evaluator, network cost comparison
hosted: AWS, EC2
database: AWS Postgres
KV store: Elasticache
domain: https://fbctower.com

`docker-compose build`
`docker-compose run`

Worker command (GPU):
`celery worker -A deep_gis --loglevel=info`

Server Side (webserver):
run django or `python3 manage.py shell`
```from gis_creator.tasks import adding_task
task = adding_task.delay(2, 5)```
