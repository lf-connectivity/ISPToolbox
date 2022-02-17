## DO NOT USE FOR PRODUCTION - only for local integration testing

echo "Creating database migrations"
python3 manage.py makemigrations

# Apply database migrations
echo "Apply database migrations"
python3 manage.py migrate

# Test site customize
echo "import coverage" >  /opt/conda/lib/python3.8/site-packages/sitecustomize.py
echo "coverage.process_startup()" >>  /opt/conda/lib/python3.8/site-packages/sitecustomize.py

# Start server
echo "Starting server http://0.0.0.0:8000"
echo "You must connect the VSCode debugger in order to proceed!"
exec python3 manage.py runserver 0.0.0.0:8000
