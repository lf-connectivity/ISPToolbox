# (c) Meta Platforms, Inc. and affiliates. Copyright
output "alb_hostname" {
  value = aws_lb.production.dns_name
}
