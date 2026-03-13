@echo off
REM ATTENTION! Be careful. This script kills all containers and removes all images you have built before
REM script base directory
set "BASEDIR=%~dp0"

REM kill containers and remove volumes
docker-compose kill && docker-compose rm -f
docker volume prune --force

REM remove backend image
docker image rm prognimak.ordermanager/backend:001

REM remove frontend image
docker image rm prognimak.ordermanager/frontend:002

REM remove discovery image
docker image rm prognimak.ordermanager/discovery:002

REM ----------------

REM create backend image
docker build -t prognimak.ordermanager/backend:001  %BASEDIR%/backend

REM create frontend image
docker build -t prognimak.ordermanager/frontend:002 %BASEDIR%/frontend

REM create eureka image
docker build -t prognimak.ordermanager/discovery:002  %BASEDIR%/discovery

REM create postgres image. It is commented first because
REM docker build -t prognimak.ordermanager/postgres:14  %BASEDIR%/db

REM ----------------

REM deploy all images defined in docker-compose.yaml and start containers
docker-compose -f %BASEDIR%/docker-compose.yaml up -d

REM pause