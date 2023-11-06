# (c) Meta Platforms, Inc. and affiliates. Copyright
resource "aws_cloudwatch_log_group" "django-log-group" {
  name              = "/ecs/django-app"
  retention_in_days = var.log_retention_in_days
}

resource "aws_cloudwatch_log_stream" "django-log-stream" {
  name           = "django-app-log-stream"
  log_group_name = aws_cloudwatch_log_group.django-log-group.name
}

resource "aws_cloudwatch_log_group" "websocket-log-group" {
  name              = "/ecs/websocket-app"
  retention_in_days = var.log_retention_in_days
}

resource "aws_cloudwatch_log_stream" "websocket-log-stream" {
  name           = "websocket-app-log-stream"
  log_group_name = aws_cloudwatch_log_group.websocket-log-group.name
}

resource "aws_cloudwatch_log_group" "node-log-group" {
  name              = "/ecs/node-app"
  retention_in_days = var.log_retention_in_days
}

resource "aws_cloudwatch_log_stream" "node-log-stream" {
  name           = "node-app-log-stream"
  log_group_name = aws_cloudwatch_log_group.node-log-group.name
}

resource "aws_cloudwatch_log_group" "nginx-log-group" {
  name              = "/ecs/nginx"
  retention_in_days = var.log_retention_in_days
}

resource "aws_cloudwatch_log_stream" "nginx-log-stream" {
  name           = "nginx-log-stream"
  log_group_name = aws_cloudwatch_log_group.nginx-log-group.name
}

resource "aws_cloudwatch_log_group" "celery-log-group" {
  name              = "/ecs/celery"
  retention_in_days = var.log_retention_in_days
}

resource "aws_cloudwatch_log_stream" "celery-log-stream" {
  name           = "celery-log-stream"
  log_group_name = aws_cloudwatch_log_group.celery-log-group.name
}

resource "aws_cloudwatch_log_group" "flower-log-group" {
  name              = "/ecs/flower"
  retention_in_days = var.log_retention_in_days
}

resource "aws_cloudwatch_log_stream" "flower-log-stream" {
  name           = "flower-log-stream"
  log_group_name = aws_cloudwatch_log_group.flower-log-group.name
}