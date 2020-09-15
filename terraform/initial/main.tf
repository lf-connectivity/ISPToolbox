# Specify the provider and access details
provider "aws" {
  access_key = var.access_key
  secret_key = var.secret_key
  region = var.aws_region
}

terraform {
  backend "s3" {
    # Replace this with your bucket name!
    bucket         = "wisp-terraform-up-and-running-state"
    key            = "initial/terraform.tfstate"
    region         = "us-west-2"
    # Replace this with your DynamoDB table name!
    dynamodb_table = "terraform-up-and-running-locks"
    encrypt        = true
  }
}

### bucket
# to store remote state
resource "aws_s3_bucket" "terraform_state" {
  bucket = "wisp-terraform-up-and-running-state"
  # Enable versioning so we can see the full revision history of our
  # state files
  versioning {
    enabled = true
  }
  # Enable server-side encryption by default
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}

# Remote Lock
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-up-and-running-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"
  attribute {
    name = "LockID"
    type = "S"
  }
}
