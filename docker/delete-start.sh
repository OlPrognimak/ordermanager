#!/bin/bash
#ATTANTION! Be careful. This script kill all containers and remove all images you have build before

# kill containers and remove volumes
docker-compose kill && docker-compose rm -f
docker volume prune --force
# remove backend image
docker image rm prognimak.ordermanager/backend:001
# remove frontend image
docker image rm prognimak.ordermanager/frontend:002
###--
# creates backend image
docker build -t prognimak.ordermanager/backend:001 ./backend
# creates frontend image
docker build -t prognimak.ordermanager/frontend:002 ./frontend
# creates postgres image
#docker build -t prognimak.ordermanager/postgres:14 ./db
#------
# deploy all images which defined in docker-compose.yaml and start all containers which defines docker-compose.yaml
docker-compose -f docker-compose.yaml up -d