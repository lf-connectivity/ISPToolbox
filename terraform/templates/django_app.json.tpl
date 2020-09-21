[
  {
    "name": "django-app",
    "image": "${docker_image_url_django}",
    "essential": true,
    "cpu": 1536,
    "memory": 4096,
    "links": [],
    "portMappings": [
      {
        "containerPort": 8000,
        "hostPort": 0,
        "protocol": "tcp"
      }
    ],
    "command": ["gunicorn", "webserver.wsgi","-b", "0.0.0.0", "-w","2"],
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
    "mountPoints": [
      {
        "containerPath": "/usr/src/app/staticfiles/",
        "sourceVolume": "static_volume"
      }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/django-app",
        "awslogs-region": "${region}",
        "awslogs-stream-prefix": "django-app-log-stream"
      }
    }
  },
  {
    "name": "nginx",
    "image": "${docker_image_url_nginx}",
    "essential": true,
    "cpu": 512,
    "memory": 2048,
    "links": ["django-app"],
    "portMappings": [
      {
        "containerPort": 80,
        "hostPort": 0,
        "protocol": "tcp"
      }
    ],
    "mountPoints": [
      {
        "containerPath": "/usr/src/app/staticfiles/",
        "sourceVolume": "static_volume"
      }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/nginx",
        "awslogs-region": "${region}",
        "awslogs-stream-prefix": "nginx-log-stream"
      }
    }
  }
]
