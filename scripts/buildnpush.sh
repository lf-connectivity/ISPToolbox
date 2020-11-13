# aws ecr get-login-password --region us-west-1 | sudo docker login --username AWS --password-stdin 623762516657.dkr.ecr.us-west-1.amazonaws.com
docker-compose build
docker tag isptoolbox-django:latest 623762516657.dkr.ecr.us-west-1.amazonaws.com/isptoolbox-django:latest
docker push 623762516657.dkr.ecr.us-west-1.amazonaws.com/isptoolbox-django:latest
docker tag isptoolbox-nginx:latest 623762516657.dkr.ecr.us-west-1.amazonaws.com/isptoolbox-nginx:latest
docker push 623762516657.dkr.ecr.us-west-1.amazonaws.com/isptoolbox-nginx:latest
docker tag isptoolbox-flower-nginx:latest 623762516657.dkr.ecr.us-west-1.amazonaws.com/isptoolbox-flower-nginx:latest
docker push 623762516657.dkr.ecr.us-west-1.amazonaws.com/isptoolbox-flower-nginx:latest
