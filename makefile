SHELL := /bin/bash
setup:
	@echo ----------------------------------------------INSTALLING SYSTEM REQUIREMENTS------------------------------------------
	sudo apt-get update
	sudo apt-get install -y python3.8 python3-pip
	sudo apt-get install -y gdal-bin python-gdal python3-gdal libglib2.0-0 libsm6 libxext6 libxrender-dev
	sudo apt-get install -y redis
	sudo apt-get install -y postgresql postgresql-contrib
	sudo apt-get install -y postgis
	@echo "Making python3.8 and pip3 defaults ~/.bash_aliases"
	@echo "alias python=python3" >> ~/.bash_aliases
	@echo "alias pip=pip3" >> ~/.bash_aliases
	source ~/.bash_aliases
	source ~/.bashrc
	@echo "Reload terminal for changes to propagate"
	@echo "Run the following to set up the test postgres db:"
	@echo "$$ sudo -i -u postgres"
	@echo "$$ createdb django_test"
	@echo "$$ psql"
	@echo "=# \password postgres"
	@echo "And set the password to 'password'"

update:
	@echo ----------------------------------------------INSTALLING PACKAGE REQUIREMENTS------------------------------------------
	pip3 install -r ./webserver/requirements.txt

migrate:
	@echo ----------------------------------------------RUNNING DJANGO MIGRATIONS PROD----------------------------------------
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml build
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml run django-app python3 manage.py migrate

makemigrations:
	@echo ----------------------------------------------CREATING DJANGO MIGRATIONS PROD----------------------------------------
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml build
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml run django-app python3 manage.py makemigrations

shell:
	@echo ----------------------------------------------DJANGO SHELL PROD----------------------------------------
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml build
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml run django-app python3 manage.py shell

debug_shell:
	@echo ----------------------------------------------STARTING DEBUG----------------------------------------
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml build
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml run django-app python3 manage.py shell

default_objects:
	@echo ----------------------------------------------CREATING SAMPLE OBJECTS----------------------------------------
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml build
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml run django-app python3 manage.py create_default_overlays
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml run django-app python3 manage.py get_latest_usgs


run:
	@echo ----------------------------------------------RUNNING WEBSERVER----------------------------------------
	python3 ./webserver/manage.py runserver

debug:
	@echo ----------------------------------------------STARTING DEBUG----------------------------------------
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml build
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

test: 
	@echo ----------------------------------------------STARTING TESTS----------------------------------------
	@echo -e "\e[46mWant to debug a single test? - don't want to rebuild docker container?\nSee the readme: https://github.com/ISPToolbox/ISPToolbox#debugging-django-tests-with-vscode \e[0m"
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml build
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml run django-app ./wait-for-postgres.sh python3 manage.py test

static_prod:
	@echo ----------------------------------------------BUIDLING STATIC FILES \& PUSHING TO PROD \(S3\)----------------------------------------
	docker-compose -f docker-compose.yml -f webserver/static/docker-compose.static-prod.yml build
	docker-compose -f docker-compose.yml -f webserver/static/docker-compose.static-prod.yml run static
	@echo This next step may take 5-10 minutes, hashing static files and pushing to S3, commit the new staticfiles.json to git, feel free to try to improve this push step
	docker-compose -f docker-compose.yml -f webserver/static/docker-compose.static-prod.yml run django-app python3 manage.py collectstatic --noinput