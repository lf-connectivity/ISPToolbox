# This script tags a untagged ECR Images using its diggest
ECR_REPO=isptoolbox-django
# image digest as first argument (e.g sha256:e2f718ad3a386b210a55bccb21ee8d94d4bf99b67e466ff6ded8f369a96c8d88)
IMAGE_DIGEST="$1"
TAG=latest
# ---
MANIFEST=$(aws ecr batch-get-image --repository-name $ECR_REPO --image-ids imageDigest=$IMAGE_DIGEST --query 'images[].imageManifest' --output text)
aws ecr put-image --repository-name $ECR_REPO --image-tag $TAG --image-manifest "$MANIFEST"