MANIFEST_DJANGO=$(aws ecr batch-get-image --repository-name isptoolbox-django --image-ids imageTag=prevStable --query 'images[].imageManifest' --output text)
aws ecr put-image --repository-name isptoolbox-django --image-tag latest --image-manifest "$MANIFEST_DJANGO"
MANIFEST_NGINX=$(aws ecr batch-get-image --repository-name isptoolbox-nginx --image-ids imageTag=prevStable --query 'images[].imageManifest' --output text)
aws ecr put-image --repository-name isptoolbox-nginx --image-tag latest --image-manifest "$MANIFEST_NGINX"