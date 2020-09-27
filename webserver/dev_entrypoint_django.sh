## DO NOT USE FOR PRODUCTION - only for local dev testing
# Apply database migrations
echo "Apply database migrations"
python3 manage.py migrate

# Start server
echo "Starting server"
python3 manage.py runserver 0.0.0.0:8000