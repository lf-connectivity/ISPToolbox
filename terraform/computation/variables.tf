variable "aws_region" {
  description = "The AWS region to create things in."
  default     = "us-east-2"
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
  default     = "2048"
}

variable "fargate_memory" {
  description = "Fargate instance memory to provision (in MiB)"
  default     = "4096"
}

variable "nginx_cpu" {
  description = "nginx instance CPU units to provision (1 vCPU = 1024 CPU units)"
  default     = "1024"
}

variable "nginx_memory" {
  description = "nginx instance memory to provision (in MiB)"
  default     = "2048"
}

variable "django_cpu" {
  description = "django instance CPU units to provision (1 vCPU = 1024 CPU units)"
  default     = "1024"
}

variable "django_memory" {
  description = "django instance memory to provision (in MiB)"
  default     = "2048"
}
variable "vpc_id" {
  default = "vpc-0391b5488b2625125"
}

variable "aws_subnet_privates" {
  type    = list(string)
  default = ["isptoolbox-private-1"]
}

variable "aws_subnet_publics" {
  type    = list(string)
  default = ["isptoolbox-public-1", "isptoolbox-public-2"]
}
