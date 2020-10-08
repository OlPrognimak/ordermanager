#!/bin/bash
#ATTANTION! Be careful. This script kill all containers and images you have build
# kill containers and remove volumes
docker-compose kill && docker-compose rm -f
docker volume prune --force
# remove backend image
docker image rm prognimak.ordermanager/backend:001
# remove frontend image
docker image rm prognimak.ordermanager/frontend:001
###--
# creates backend image
docker build -t prognimak.ordermanager/backend:001 ./backend
# creates frontend image
docker build -t prognimak.ordermanager/frontend:001 ./frontend
#------
# deploy and start all containers
docker-compose -f docker-compose.yaml up -d