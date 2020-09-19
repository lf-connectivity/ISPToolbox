### ======================================== Elasticache ========================================
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
}
### ======================================== Elasticache ========================================