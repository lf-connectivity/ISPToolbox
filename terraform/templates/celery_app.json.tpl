[
  {
    "name": "celery-app",
    "image": "${docker_image_url_celery}",
    "essential": true,
    "cpu": 4096,
    "memory": 16384,
    "ulimits": [
      {
        "name": "core",
        "softLimit": 0,
        "hardLimit": 0
      }
    ],
    "command": ["celery","--app","celery_async","worker","-l","info"],
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
        "name" : "GOOGLE_APPLICATION_CREDENTIALS",
        "value" : "/usr/src/app/dataUpdate/config/gcp-service-key.json"
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
