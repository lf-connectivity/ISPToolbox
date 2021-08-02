#!/bin/bash
# wait-for-postgres.sh
# this file is needed for automated testing to make sure the postgres
# database is running before executing the tests

set -e
  
cmd="$@"
  
>&2 echo "Checking if postgres is available"

until PGPASSWORD="password" psql -h "postgres" -U "postgres" -c '\q'; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done
  
>&2 echo "Postgres is up - executing command"
exec $cmd