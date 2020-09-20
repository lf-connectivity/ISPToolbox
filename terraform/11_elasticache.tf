### ======================================== Elasticache ========================================
resource "aws_elasticache_subnet_group" "production" {
  name       = "isptoolbox-elasticache-subnet-main"
  subnet_ids = [aws_subnet.private-subnet-1.id, aws_subnet.private-subnet-2.id]
}

resource "aws_elasticache_replication_group" "isptoolbox_redis" {
  automatic_failover_enabled    = true
  replication_group_id          = "isptoolbox-redis-replication"
  replication_group_description = "isptoolbox redis"
  node_type                     = "cache.r4.large"
  number_cache_clusters         = 2
  parameter_group_name          = "default.redis5.0"
  port                          = 6379
  engine                        = "redis"
  engine_version                = "5.0.6"
  subnet_group_name           = aws_elasticache_subnet_group.production.name
  security_group_ids          = [aws_security_group.redis.id]

}
### ======================================== Elasticache ========================================