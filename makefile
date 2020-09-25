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
	@echo ----------------------------------------------RUNNING DJANGO MIGRATIONS----------------------------------------
	python3 ./webserver/manage.py migrate

makemigrations:
	@echo ----------------------------------------------CREATING DJANGO MIGRATIONS----------------------------------------
	python3 ./webserver/manage.py makemigrations

run:
	@echo ----------------------------------------------RUNNING WEBSERVER----------------------------------------
	python3 ./webserver/manage.py runserver
