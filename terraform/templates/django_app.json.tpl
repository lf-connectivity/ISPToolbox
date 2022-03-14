[
  {
    "name": "django-app",
    "image": "${docker_image_url_django}",
    "essential": true,
    "cpu": 1536,
    "memory": 4096,
    "links": ["flower"],
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
    "name": "websocket-app",
    "image": "${docker_image_url_django}",
    "essential": true,
    "cpu": 1024,
    "memory": 1024,
    "links": [],
    "portMappings": [
      {
        "containerPort": 8010,
        "hostPort": 0,
        "protocol": "tcp"
      }
    ],
    "command": ["daphne", "webserver.asgi:application","-b", "0.0.0.0","-p","8010","--access-log","-"],
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
        "awslogs-group": "/ecs/websocket-app",
        "awslogs-region": "${region}",
        "awslogs-stream-prefix": "websocket-app-log-stream"
      }
    }
  },
  {
    "name": "node-app",
    "image": "${docker_image_url_node}",
    "essential": false,
    "cpu": 512,
    "memory": 1024,
    "links": [],
    "portMappings": [
      {
        "containerPort": 8020,
        "hostPort": 0,
        "protocol": "tcp"
      }
    ],
    "command": ["npm", "run", "start", "--", "8020"],
    "environment": [
      {
        "name": "NODE_ENV",
        "value": "production"
      }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/node-app",
        "awslogs-region": "${region}",
        "awslogs-stream-prefix": "node-app-log-stream"
      }
    }
  },
  {
    "name": "nginx",
    "image": "${docker_image_url_nginx}",
    "essential": true,
    "cpu": 512,
    "memory": 2048,
    "links": ["django-app", "websocket-app", "node-app"],
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
  },
  {
    "name": "flower",
    "image": "${docker_image_url_django}",
    "essential": true,
    "cpu": 512,
    "memory": 512,
    "links": [],
    "portMappings": [
      {
        "containerPort": 5555,
        "hostPort": 0,
        "protocol": "tcp"
      }
    ],
    "command": ["celery","--app","celery_async","flower","--conf=flower_config.py"],
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
      }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/flower",
        "awslogs-region": "${region}",
        "awslogs-stream-prefix": "flower-log-stream"
      }
    }
  }
]
