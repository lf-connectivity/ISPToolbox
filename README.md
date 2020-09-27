# ISP Toolbox Webserver
ISP Toolbox Backend Server Code
- powers market evaluator, network cost comparison
- hosted: AWS, EC2
- database: AWS Postgres
- KV store: Elasticache
- domain: https://fbctower.com

## Locally run Django Webserver (Ubuntu)
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

## Database Migrations (Standard Django Process)
Run when you have made changes to or added to Django Models.
- `make makemigrations`
- `make migrate`

Test changes locally and unit test if applicable.

Once you're ready to push database schema changes to production:

The latest environment variables are in the `terraform/variables.tf` file

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
