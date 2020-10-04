#!/bin/bash
set -e

POSTGRES="psql --username pvog"

echo "Creating database: "

$POSTGRES <<EOSQL
CREATE DATABASE TESTDB OWNER pvog;

EOSQL

