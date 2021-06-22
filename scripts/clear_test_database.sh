docker-compose -f docker-compose.yml -f docker-compose.dev.yml run -e PGPASSWORD=password django-app psql -h postgres -U postgres -c "DROP DATABASE django_test"
docker-compose -f docker-compose.yml -f docker-compose.dev.yml run -e PGPASSWORD=password django-app psql -h postgres -U postgres -c "CREATE DATABASE django_test;"
docker-compose -f docker-compose.yml -f docker-compose.dev.yml run django-app python manage.py makemigrations
docker-compose -f docker-compose.yml -f docker-compose.dev.yml run django-app python manage.py migrate
make default_objects
docker-compose -f docker-compose.yml -f docker-compose.dev.yml run django-app python manage.py createsuperuser