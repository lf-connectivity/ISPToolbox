# ISP Toolbox Webserver
ISP Toolbox Backend Server Code
- powers market evaluator, network cost comparison
- hosted: AWS, EC2
- database: AWS Postgres
- KV store: Elasticache
- domain: https://fbctower.com

## Make command list
`make setup`
- Installs required packages on system. Should only need to be ran once during first-time setup.

`make update`
- Updates and/or installs python packages as definred in requirements.txt via pip.

`make makemigrations`
- Creates django migrations for model changes.

`make migrate`
- Performs django migrations for model changes.

`make run`
- Starts the webserver.

`make debug`
- runs backend in debug configuration. attach to django using vscode

## Running fbctower locally with WWW OnDemand

1. On your EC2 instance

    `make debug`

this will startup the whole backend stack on your machine

in VSCode forward port 8000 to your localhost (macbook)

![Alt text](images/port_forwarding.png?raw=true "Title")

2. On your WWW OnDemand

Update the CSP policy in XIspToolboxControllerConfig.php
![Alt text](images/csp_update.png?raw=true "Title")

Change the domain name in WispMarketSizingUtils.js
![Alt text](images/new_domain.png?raw=true "Title")

## Pushing New Images to Production

Option 1: Github action
1. push latest code change to github master branch, wait for workflow to complete successfully. Make sure aws cli is configured locally -

    ``` git push origin master```

    ```aws configure```

2. deploy images to ecs

    ```./scripts/deploy_latest_image_to_prod.sh```

Option 2: Scripts for manual push (something broke)

1. login to AWS and ECR repository

    ```aws configure```

    ```aws ecr get-login-password --region us-west-1 | docker login --username AWS --password-stdin 623762516657.dkr.ecr.us-west-1.amazonaws.com```

2. build docker images locally and change tags, push to ecr

    ```./scripts/buildnpush.sh```

3. deploy images to ecs

    ```./scripts/deploy_latest_image_to_prod.sh```

## Debugging Django Tests with VSCode
add the following to your test:

```
import ptvsd # @nocommit - vscode python debugger
ptvsd.enable_attach(address=('0.0.0.0', 3000))
ptvsd.wait_for_attach()
```
then run the following command:
```
docker-compose -f docker-compose.yml -f docker-compose.dev.yml run --service-ports django-app python manage.py test IspToolboxApp.<TestPath>
```

`--service-ports` makes port 3000 available for debugging

vscode debugger must attach before the test is run

## Locally run Django Webserver (Ubuntu) (Old steps, follow "Running fbctower locally with WWW OnDemand" unless you really need to run without docker)
### Configure system environment (once):
- `make setup`

Make sure to follow steps printed to console in order to set up a test postgres db. Find them here as well for convenience:
- `sudo -i -u postgres`
- `createdb django_test`
- `psql`
- ` \password postgres`

Set the password to "password"

### Install required packages:
- `make update`

### Perform django migrations:
- `make migrate`

### Run the Webserver:
- `make run`

### Database Migrations (Standard Django Process)
Run when you have made changes to or added to Django Models.
- `make makemigrations`
- `make migrate`

Test changes locally and unit test if applicable.

Once you're ready to push database schema changes to production:

The latest environment variables are in the `terraform/variables.tf` file


## Troubleshooting:

### My code works on my dev server but not on the prod image!

1. pull the docker image from AWS ECR

`docker pull 623762516657.dkr.ecr.us-west-1.amazonaws.com/isptoolbox-django`

2. set the environment to point to the production database (create a .env file)

`.env`
```
DB_NAME=
DB_PASSWORD=
DB_USERNAME=
DEBUG=True
POSTGRES_DB=
REDIS_BACKEND=
```

3. run the following command:

`docker run --env-file .env -p 0.0.0.0:8000:8000 -p 127.0.0.1:3000:3000 623762516657.dkr.ecr.us-west-1.amazonaws.com/isptoolbox-django:latest python manage.py runserver 0.0.0.0:8000`
