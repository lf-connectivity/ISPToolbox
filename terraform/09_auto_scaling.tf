resource "aws_autoscaling_group" "ecs-cluster-webserver" {
  name                 = "${var.ecs_cluster_name}-web_auto_scaling_group"
  min_size             = var.autoscale_min
  max_size             = var.autoscale_max
  desired_capacity     = var.autoscale_desired
  health_check_type    = "EC2"
  launch_configuration = aws_launch_configuration.ecs-webserver.name
  vpc_zone_identifier  = [aws_subnet.public-subnet-1.id, aws_subnet.public-subnet-2.id]
}

resource "aws_autoscaling_group" "ecs-cluster-async" {
  name                 = "${var.ecs_cluster_name}-async_auto_scaling_group"
  min_size             = var.autoscale_min
  max_size             = var.autoscale_max
  desired_capacity     = var.autoscale_desired_async
  health_check_type    = "EC2"
  launch_configuration = aws_launch_configuration.ecs-async.name
  vpc_zone_identifier  = [aws_subnet.public-subnet-1.id, aws_subnet.public-subnet-2.id]
}

resource "aws_appautoscaling_target" "autoscale_web" {
  max_capacity       = 4
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.webserver-production.name}/${aws_ecs_service.production.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_target" "autoscale_async" {
  max_capacity       = 4
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.async-production.name}/${aws_ecs_service.async-production.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "ecs_policy_web" {
  name               = "scale-down"
  policy_type        = "StepScaling"
  resource_id        = aws_appautoscaling_target.autoscale_web.resource_id
  scalable_dimension = aws_appautoscaling_target.autoscale_web.scalable_dimension
  service_namespace  = aws_appautoscaling_target.autoscale_web.service_namespace

  step_scaling_policy_configuration {
    adjustment_type         = "ChangeInCapacity"
    cooldown                = 60
    metric_aggregation_type = "Maximum"

    step_adjustment {
      metric_interval_upper_bound = 0
      scaling_adjustment          = -1
    }
  }
}

resource "aws_appautoscaling_policy" "ecs_policy_async" {
  name               = "scale-down"
  policy_type        = "StepScaling"
  resource_id        = aws_appautoscaling_target.autoscale_async.resource_id
  scalable_dimension = aws_appautoscaling_target.autoscale_async.scalable_dimension
  service_namespace  = aws_appautoscaling_target.autoscale_async.service_namespace

  step_scaling_policy_configuration {
    adjustment_type         = "ChangeInCapacity"
    cooldown                = 60
    metric_aggregation_type = "Maximum"

    step_adjustment {
      metric_interval_upper_bound = 0
      scaling_adjustment          = -1
    }
  }
}