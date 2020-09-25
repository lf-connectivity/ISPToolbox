## DO NOT USE FOR PRODUCTION - only for local dev testing
echo "Creating database migrations"
python3 manage.py makemigrations

# Apply database migrations
echo "Apply database migrations"
python3 manage.py migrate

# Start server
echo "Starting server http://0.0.0.0:8000"
echo "You must connect the VSCode debugger in order to proceed!"
python3 manage.py runserver 0.0.0.0:8000