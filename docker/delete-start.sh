#!/bin/bash

# kill containers and remove volumes
docker-compose kill && docker-compose rm -f 
docker volume prune --force
# deploy and start all containers
docker-compose -f ordermanager-compose.yaml up -d