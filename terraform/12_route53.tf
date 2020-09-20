### ======================================== route53 ========================================
data "aws_route53_zone" "fbctower_domain" {
  name         = "fbctower.com."
}

resource "aws_route53_record" "test_domain_record" {
  allow_overwrite = true
  name            = "test.${data.aws_route53_zone.fbctower_domain.name}"
  type            = "A"
  zone_id         = data.aws_route53_zone.fbctower_domain.zone_id

  alias {
    name                   = aws_lb.production.dns_name
    zone_id                = aws_lb.production.zone_id
    evaluate_target_health = false
  }
}
### ======================================== route53 ========================================