# ISP Toolbox Webserver
ISP Toolbox Backend Server Code
- powers market evaluator, network cost comparison
- hosted: AWS, EC2
- database: AWS Postgres
- KV store: Elasticache
- domain: https://fbctower.com

## To Run Entire Stack Locally (Production Database, KV Store, nginx, gunicorn, celery):
`docker-compose build`
`docker-compose up`

## Locally run Django Webserver
`cd webserver`

configure environment (once):
- `pip install -r requirements.txt`

- `sudo apt-get update && sudo apt-get install -y gdal-bin python-gdal python3-gdal libglib2.0-0 libsm6 libxext6 libxrender-dev`

`python manage.py runserver`

## Database Migrations (Standard Django Process)
`cd webserver`

`python manage.py makemigrations`

Once you're ready to push database schema changes to production:

`DJANGO_SETTINGS_MODULE=webserver.settings_prod python manage.py migrate`