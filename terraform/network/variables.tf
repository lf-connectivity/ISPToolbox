variable "aws_region" {
  description = "The AWS region to create things in."
  default     = "us-west-2"
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

# variable "app_image" {
#   description = "Docker image to run in the ECS cluster"
#   default     = "nginx:latest"
# }

variable "app_port" {
  description = "Port exposed by the docker image to redirect traffic to"
  default     = 80
}
