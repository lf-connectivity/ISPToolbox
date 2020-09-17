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
    key            = "computation/terraform.tfstate"
    region         = "us-west-2"
    # Replace this with your DynamoDB table name!
    dynamodb_table = "terraform-up-and-running-locks"
    encrypt        = true
  }
}


### ======================================== Network ========================================
# Fetch AZs in the current region
data "aws_availability_zones" "available" {}

data "aws_acm_certificate" "cert" {
  domain = "*.fbctower.com"
}

data "aws_subnet_ids" "public_selected" {
  vpc_id = var.vpc_id
  filter {
    name   = "tag:Name"
    values = var.aws_subnet_publics
  }
}

data "aws_subnet_ids" "private_selected" {
  vpc_id = var.vpc_id
  filter {
    name   = "tag:Name"
    values = var.aws_subnet_privates
  }
}

data "aws_security_group" "lb" {
  filter {
    name = "tag:Name"
    values = ["aws_security_group-lb"]
  }
}

data "aws_security_group" "ecs_tasks" {
  filter {
    name = "tag:Name"
    values = ["aws_security_group-ecs_tasks"]
  }
}
### ======================================== Network ========================================


### ======================================== ECR ========================================
resource "aws_ecr_repository" "main" {
  name                 = "${terraform.workspace}-repo"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}
### ======================================== ECR ========================================


### ======================================== S3 ========================================
# resource "aws_s3_bucket" "log_bucket" {
#   bucket = "my-tf-log-bucket"
#   acl    = "log-delivery-write"
# }

# resource "aws_s3_bucket" "main" {
#   bucket = "my-tf-test-bucket"
#   acl    = "private"

#   logging {
#     target_bucket = aws_s3_bucket.log_bucket.id
#     target_prefix = "log/"
#   }
# }

# resource "aws_s3_bucket" "main" {
#   bucket = "${terraform.workspace}-wisp-tf-s3"
#   acl    = "private"

#   tags   = {
#     Name = "${terraform.workspace}-aws_s3_bucket-main"
#   }
# }

# resource "aws_s3_bucket_policy" "main" {
#   bucket = aws_s3_bucket.main.id

#   policy = <<POLICY
# {
#     "Version": "2012-10-17",
#     "Statement": [
#         {
#             "Effect": "Allow",
#             "Principal": {
#                 "AWS": "arn:aws:iam::797873946194:root"
#             },
#             "Action": "s3:PutObject",
#             "Resource": "arn:aws:s3:::victor-wisp-tf-s3/logs/AWSLogs/623762516657/*"
#         },
#         {
#             "Effect": "Allow",
#             "Principal": {
#                 "Service": "delivery.logs.amazonaws.com"
#             },
#             "Action": "s3:PutObject",
#             "Resource": "arn:aws:s3:::victor-wisp-tf-s3/logs/AWSLogs/623762516657/*",
#             "Condition": {
#                 "StringEquals": {
#                     "s3:x-amz-acl": "bucket-owner-full-control"
#                 }
#             }
#         },
#         {
#             "Effect": "Allow",
#             "Principal": {
#                 "Service": "delivery.logs.amazonaws.com"
#             },
#             "Action": "s3:GetBucketAcl",
#             "Resource": "arn:aws:s3:::victor-wisp-tf-s3"
#         }
#     ]
# }
# POLICY
# }
### ======================================== S3 ========================================


### ======================================== ALB ========================================
resource "aws_alb" "main" {
  name            = "${terraform.workspace}-wisp-ecs-alb"
  subnets         = data.aws_subnet_ids.public_selected.ids
  security_groups = [data.aws_security_group.lb.id]
  # access_logs {
  #   bucket  = aws_s3_bucket.main.bucket
  #   prefix  = "log"
  #   enabled = true
  # }
}

resource "aws_alb_target_group" "main" {
  name        = "${terraform.workspace}-wisp-ecs-alb-group"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"
}

# Redirect all traffic from the ALB to the target group
resource "aws_alb_listener" "https" {
  load_balancer_arn = aws_alb.main.id
  port              = 443
  protocol          = "HTTPS"
	ssl_policy        = "ELBSecurityPolicy-2016-08"
  depends_on        = [aws_alb_target_group.main]
	certificate_arn   = data.aws_acm_certificate.cert.arn

  default_action {
    target_group_arn = aws_alb_target_group.main.arn
    type             = "forward"
  }
}

resource "aws_alb_listener" "http" {
  load_balancer_arn = aws_alb.main.id
  port              = 80
  protocol          = "HTTP"

  default_action {
    target_group_arn = aws_alb_target_group.main.arn
    type             = "forward"
  }
}

resource "aws_lb_listener_certificate" "https" {
  listener_arn    = aws_alb_listener.https.arn
  certificate_arn = data.aws_acm_certificate.cert.arn
}
### ======================================== ALB ========================================


### ======================================== ECS ========================================
resource "aws_iam_role" "ecsTaskExecutionRole" {
  name               = "${terraform.workspace}-wisp-ecs-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role_policy.json
}

data "aws_iam_policy_document" "assume_role_policy" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy_attachment" "ecsTaskExecutionRole_policy" {
  role       = aws_iam_role.ecsTaskExecutionRole.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_ecs_cluster" "main" {
  name = "${terraform.workspace}-wisp-ecs-cluster"
}

data "aws_ecr_repository" "django" {
  name = "isptoolbox-django"
}
data "aws_ecr_repository" "nginx" {
  name = "isptoolbox-nginx"
}
    ## ---------------------------------------- ECS service & task ----------------------------------------
        # ........................................ Webserver ........................................
resource "aws_ecs_task_definition" "main" {
  family                   = "wisp-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.fargate_cpu
  memory                   = var.fargate_memory
  execution_role_arn       = aws_iam_role.ecsTaskExecutionRole.arn

  container_definitions = <<DEFINITION
[
  {
    "cpu": ${var.nginx_cpu},
    "image": "${data.aws_ecr_repository.nginx.repository_url}:latest",
    "memory": ${var.nginx_memory},
    "name": "${terraform.workspace}-wisp-app-nginx",
    "portMappings": [
      {
        "containerPort": 80
      }
    ],
    "dependsOn" : [
      {
        "condition" : "START",
        "containerName" : "django_webserver"
      }
    ]
  },
  {
    "cpu": ${var.django_cpu},
    "image": "${data.aws_ecr_repository.django.repository_url}:latest",
    "memory": ${var.django_memory},
    "name": "django_webserver",
    "portMappings": [
      {
        "containerPort": 8020
      }
    ]
  }
]
DEFINITION
}

resource "aws_ecs_service" "main" {
  name            = "${terraform.workspace}-wisp-ecs-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.main.arn
  desired_count   = var.app_count
  launch_type     = "FARGATE"

  network_configuration {
    security_groups = [data.aws_security_group.ecs_tasks.id]
    subnets         = data.aws_subnet_ids.private_selected.ids
  }

  load_balancer {
    target_group_arn = aws_alb_target_group.main.arn
    container_name   = "${terraform.workspace}-wisp-app-nginx"
    container_port   = 80
  }

  depends_on = [
    aws_alb_listener.https,
    aws_alb_listener.http,
  ]
}
        # ........................................ Django ........................................
    ## ---------------------------------------- ECS service & task ----------------------------------------
### ======================================== ECS ========================================
