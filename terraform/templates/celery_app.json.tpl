[
  {
    "name": "celery-app",
    "image": "${docker_image_url_celery}",
    "essential": true,
    "cpu": 2048,
    "memory": 6144,
    "command": ["celery","-A","webserver","worker","-l","info"],
    "environment": [
      {
        "name": "DEBUG",
        "value": "false"
      },
      {
        "name": "PROD",
        "value": "TRUE"
      },
      {
        "name": "POSTGRES_DB",
        "value": "${rds_hostname}"
      },
      {
        "name": "DB_NAME",
        "value": "${rds_db_name}"
      },
      {
        "name": "DB_USERNAME",
        "value": "${rds_db_username}"
      },
      {
        "name": "DB_PASSWORD",
        "value": "${rds_db_password}"
      },
      {
        "name" : "REDIS_BACKEND",
        "value" : "${redis}"
      }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/celery",
        "awslogs-region": "${region}",
        "awslogs-stream-prefix": "celery-log-stream"
      }
    }
  }
]
