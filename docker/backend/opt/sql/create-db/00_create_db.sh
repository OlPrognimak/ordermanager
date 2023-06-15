#!/bin/bash
set -e

POSTGRES="psql --username test"

echo "Creating database: "

$POSTGRES <<EOSQL
CREATE DATABASE test_db OWNER test;

EOSQL