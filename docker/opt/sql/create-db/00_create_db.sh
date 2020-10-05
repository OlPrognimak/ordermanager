#!/bin/bash
set -e

POSTGRES="psql --username pvog"

echo "Creating database: "

$POSTGRES <<EOSQL
CREATE DATABASE test_db OWNER pvog;

EOSQL

