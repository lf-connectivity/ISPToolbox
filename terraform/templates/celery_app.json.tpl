[
  {
    "name": "celery-app",
    "image": "${docker_image_url_celery}",
    "essential": true,
    "cpu": 2048,
    "memory": 1024,
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
