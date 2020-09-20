variable "aws_region" {
  description = "The AWS region to create things in."
  default     = "us-west-1"
}

variable "aws_account_id" {
  description = "AWS account ID"
  default = "fbc-tower-design"
}

variable "access_key" {
  description = "AWS access_key"
}

variable "secret_key" {
  description = "AWS secret_key"
}

variable "az_count" {
  description = "Number of AZs to cover in a given AWS region"
  default     = "2"
}

variable "app_image" {
  description = "Docker image to run in the ECS cluster"
  default     = "nginx:latest"
}

variable "nginx_image" {
  description = "Nginx image to run in the ECS cluster"
  default = "isptoolbox-nginx:latest"
}

variable "django_image" {
  description = "Django image to run in the ECS cluster"
  default = "isptoolbox-django:latest"
}

variable "app_port" {
  description = "Port exposed by the docker image to redirect traffic to"
  default     = 80
}

variable "app_count" {
  description = "Number of docker containers to run"
  default     = 2
}

variable "fargate_cpu" {
  description = "Fargate instance CPU units to provision (1 vCPU = 1024 CPU units)"
  default     = "4096"
}

variable "fargate_memory" {
  description = "Fargate instance memory to provision (in MiB)"
  default     = "8192"
}

variable "nginx_cpu" {
  description = "nginx instance CPU units to provision (1 vCPU = 1024 CPU units)"
  default     = "1024"
}

variable "nginx_memory" {
  description = "nginx instance memory to provision (in MiB)"
  default     = "1024"
}

variable "django_cpu" {
  description = "django instance CPU units to provision (1 vCPU = 1024 CPU units)"
  default     = "1024"
}

variable "django_memory" {
  description = "django instance memory to provision (in MiB)"
  default     = "1024"
}

variable "celery_cpu" {
  description = "celery instance CPU units to provision (1 vCPU = 1024 CPU units)"
  default     = "2048"
}

variable "celery_memory" {
  description = "celery instance memory to provision (in MiB)"
  default     = "2048"
}

variable "vpc_id" {
  default = "vpc-00fc5161aed753684"
}

variable "aws_subnet_privates" {
  type    = list(string)
  default = ["isptoolbox_subnet-private-0", "isptoolbox_subnet-private-1"]
}

variable "aws_subnet_publics" {
  type    = list(string)
  default = ["isptoolbox_subnet-public-0", "isptoolbox_subnet-public-1"]
}
