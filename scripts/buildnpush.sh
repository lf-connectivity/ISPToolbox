docker-compose build
docker tag isptoolbox-django:latest 623762516657.dkr.ecr.us-west-1.amazonaws.com/isptoolbox-django:latest
docker push 623762516657.dkr.ecr.us-west-1.amazonaws.com/isptoolbox-django:latest
docker tag isptoolbox-nginx:latest 623762516657.dkr.ecr.us-west-1.amazonaws.com/isptoolbox-nginx:latest
docker push 623762516657.dkr.ecr.us-west-1.amazonaws.com/isptoolbox-nginx:latest
docker tag isptoolbox-celery:latest 623762516657.dkr.ecr.us-west-1.amazonaws.com/isptoolbox-celery:latest
docker push 623762516657.dkr.ecr.us-west-1.amazonaws.com/isptoolbox-celery:latest