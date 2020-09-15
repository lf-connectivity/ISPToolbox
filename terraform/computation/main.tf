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

### Network
# Fetch AZs in the current region
data "aws_availability_zones" "available" {}

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

### ECR
resource "aws_ecr_repository" "main" {
  name                 = "${terraform.workspace}-repo"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

### ALB
resource "aws_alb" "main" {
  name            = "${terraform.workspace}-tf-ecs-alb"
  subnets         = data.aws_subnet_ids.public_selected.ids
  security_groups = [data.aws_security_group.lb.id]
}

resource "aws_alb_target_group" "app" {
  name        = "${terraform.workspace}-tf-ecs-alb-group"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"
}

# Redirect all traffic from the ALB to the target group
resource "aws_alb_listener" "front_end" {
  load_balancer_arn = aws_alb.main.id
  port              = "80"
  protocol          = "HTTP"

  default_action {
    target_group_arn = aws_alb_target_group.app.id
    type             = "forward"
  }
}

### ECS
resource "aws_iam_role" "ecsTaskExecutionRole" {
  name               = "${terraform.workspace}-tf-ecs-role"
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
  name = "${terraform.workspace}-tf-ecs-cluster"
}

resource "aws_ecs_task_definition" "app" {
  family                   = "app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.fargate_cpu
  memory                   = var.fargate_memory
  execution_role_arn       = aws_iam_role.ecsTaskExecutionRole.arn

  container_definitions = <<DEFINITION
[
  {
    "cpu": ${var.fargate_cpu},
    "image": "${var.app_image}",
    "memory": ${var.fargate_memory},
    "name": "${terraform.workspace}-app",
    "networkMode": "awsvpc",
    "portMappings": [
      {
        "containerPort": ${var.app_port},
        "hostPort": ${var.app_port}
      }
    ]
  }
]
DEFINITION
}

resource "aws_ecs_service" "main" {
  name            = "${terraform.workspace}-tf-ecs-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.app_count
  launch_type     = "FARGATE"

  network_configuration {
    security_groups = [data.aws_security_group.ecs_tasks.id]
    subnets         = data.aws_subnet_ids.private_selected.ids
  }

  load_balancer {
    target_group_arn = aws_alb_target_group.app.id
    container_name   = "${terraform.workspace}-app"
    container_port   = var.app_port
  }

  depends_on = [
    aws_alb_listener.front_end,
  ]
}
