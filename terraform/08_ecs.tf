resource "aws_ecs_cluster" "webserver-production" {
  name = "${var.ecs_cluster_name}-webserver-cluster"
}
resource "aws_ecs_cluster" "async-production" {
  name = "${var.ecs_cluster_name}-async-cluster"
}

data "aws_ami" "ecs" {
  most_recent = true # get the latest version

  filter {
    name = "name"
    values = [
      "amzn2-ami-ecs-*"] # ECS optimized image
  }

  filter {
    name = "virtualization-type"
    values = [
      "hvm"]
  }

  owners = [
    "amazon" # Only official images
  ]
}

resource "aws_launch_configuration" "ecs-webserver" {
  name_prefix                 = aws_ecs_cluster.webserver-production.name
  image_id                    = data.aws_ami.ecs.id
  instance_type               = var.instance_type
  security_groups             = [aws_security_group.ecs.id]
  iam_instance_profile        = aws_iam_instance_profile.ecs.name
  key_name                    = aws_key_pair.production.key_name
  associate_public_ip_address = true
  user_data                   = "#!/bin/bash\necho ECS_CLUSTER='${aws_ecs_cluster.webserver-production.name}' > /etc/ecs/ecs.config"
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_launch_configuration" "ecs-async" {
  name_prefix                 = aws_ecs_cluster.async-production.name
  image_id                    = data.aws_ami.ecs.id
  instance_type               = var.instance_type
  security_groups             = [aws_security_group.ecs.id]
  iam_instance_profile        = aws_iam_instance_profile.ecs.name
  key_name                    = aws_key_pair.production.key_name
  associate_public_ip_address = true
  user_data                   = "#!/bin/bash\necho ECS_CLUSTER='${aws_ecs_cluster.async-production.name}' > /etc/ecs/ecs.config"
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_ecr_repository" "django" {
  name = "isptoolbox-django"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_repository" "nginx" {
  name = "isptoolbox-nginx"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration {
    scan_on_push = true
  }
}

data "template_file" "app" {
  template = file("templates/django_app.json.tpl")

  vars = {
    docker_image_url_django = "${aws_ecr_repository.django.repository_url}:latest"
    docker_image_url_nginx  = "${aws_ecr_repository.nginx.repository_url}:latest"
    region                  = var.region
    rds_hostname            = data.aws_db_instance.database.address
    rds_db_name             = var.POSTGRES_DB_NAME
    rds_db_username         = var.POSTGRES_DB_USERNAME
    rds_db_password         = var.POSTGRES_DB_PASSWORD
    redis                   = "redis://${aws_elasticache_replication_group.isptoolbox_redis.primary_endpoint_address}:${aws_elasticache_replication_group.isptoolbox_redis.port}"
    allowed_hosts           = var.allowed_hosts
  }
}

resource "aws_ecs_task_definition" "app" {
  family                = "django-app"
  container_definitions = data.template_file.app.rendered
  depends_on            = [aws_elasticache_replication_group.isptoolbox_redis]

  volume {
    name      = "static_volume"
    host_path = "/usr/src/app/staticfiles/"
  }
}

resource "aws_ecs_service" "production" {
  name            = "${var.ecs_cluster_name}-webserver-service"
  cluster         = aws_ecs_cluster.webserver-production.id
  task_definition = aws_ecs_task_definition.app.arn
  iam_role        = aws_iam_role.ecs-service-role.arn
  desired_count   = var.app_count
  depends_on      = [aws_alb_listener.ecs-alb-http-listener, aws_alb_listener.http, aws_iam_role_policy.ecs-service-role-policy]

  load_balancer {
    target_group_arn = aws_alb_target_group.default-target-group.arn
    container_name   = "nginx"
    container_port   = 80
  }
  lifecycle {
    ignore_changes = [desired_count]
  }
}


data "template_file" "celery_app" {
  template = file("templates/celery_app.json.tpl")

  vars = {
    docker_image_url_celery = "${aws_ecr_repository.django.repository_url}:latest"
    region                  = var.region
    rds_hostname            = data.aws_db_instance.database.address
    rds_db_name             = var.POSTGRES_DB_NAME
    rds_db_username         = var.POSTGRES_DB_USERNAME
    rds_db_password         = var.POSTGRES_DB_PASSWORD
    redis                   = "redis://${aws_elasticache_replication_group.isptoolbox_redis.primary_endpoint_address}:${aws_elasticache_replication_group.isptoolbox_redis.port}"
  }
}

resource "aws_ecs_task_definition" "celery-app" {
  family                = "celery-app"
  container_definitions = data.template_file.celery_app.rendered
  depends_on            = [aws_elasticache_replication_group.isptoolbox_redis]
}

resource "aws_ecs_service" "async-production" {
  name            = "${var.ecs_cluster_name}-async-service"
  cluster         = aws_ecs_cluster.async-production.id
  task_definition = aws_ecs_task_definition.celery-app.arn
  desired_count   = var.app_count
  depends_on      = [aws_iam_role_policy.ecs-service-role-policy]
  lifecycle {
    ignore_changes = [desired_count]
  }
}

data "template_file" "celery_app_scheduler" {
  template = file("templates/celery_app_scheduler.json.tpl")

  vars = {
    docker_image_url_celery = "${aws_ecr_repository.django.repository_url}:latest"
    region                  = var.region
    rds_hostname            = data.aws_db_instance.database.address
    rds_db_name             = var.POSTGRES_DB_NAME
    rds_db_username         = var.POSTGRES_DB_USERNAME
    rds_db_password         = var.POSTGRES_DB_PASSWORD
    redis                   = "redis://${aws_elasticache_replication_group.isptoolbox_redis.primary_endpoint_address}:${aws_elasticache_replication_group.isptoolbox_redis.port}"
  }
}

resource "aws_ecs_task_definition" "celery-app-scheduler" {
  family                = "celery-app-scheduler"
  container_definitions = data.template_file.celery_app_scheduler.rendered
  depends_on            = [aws_elasticache_replication_group.isptoolbox_redis]
}

resource "aws_ecs_service" "async-production-scheduler" {
  name            = "${var.ecs_cluster_name}-async-service-scheduler"
  cluster         = aws_ecs_cluster.async-production.id
  task_definition = aws_ecs_task_definition.celery-app-scheduler.arn
  desired_count   = 1
  depends_on      = [aws_iam_role_policy.ecs-service-role-policy]
  lifecycle {
    ignore_changes = [desired_count]
  }
}