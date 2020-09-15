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
