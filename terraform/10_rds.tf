
resource "aws_db_subnet_group" "production" {
  name       = "main"
  subnet_ids = [aws_subnet.private-subnet-1.id, aws_subnet.private-subnet-2.id]
}

### ======================================== Database ========================================
data "aws_db_instance" "database" {
 db_instance_identifier = "isptoolbox-db-prod"
}
### ======================================== Database ========================================
