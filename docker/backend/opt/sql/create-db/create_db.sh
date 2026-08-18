#!/bin/bash
set -e

POSTGRES="psql --username test --dbname postgres"

echo "Creating database: "

$POSTGRES -tc "SELECT 1 FROM pg_database WHERE datname = 'test_db'" | grep -q 1 \
  || $POSTGRES -c "CREATE DATABASE test_db OWNER test;"
