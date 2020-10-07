### Build front end and back application 
- go to the project **ordermanager-backend** and run there maven goals ```mvn clean install``` the goal creates artifact **ordermanager-backend.jar** in
target directory and then ant plugin copies  one to the directory docker/backend. This artifact will be necessary 
for creation docker image. 
- go to the project **ordermanager-ui** and run there maven goals ```mvn clean install``` the goal creates artifact **ordermanager-jar.jar** in
target directory and then ant plugin copies  one to the directory **docker/frontend**. This artifact will be necessary 
for creation docker image. 

### Build backend docker image
To build docker image runs this script from location of Dockerfile
````
docker build -t prognimak.ordermanager/backend:<version> .
````
### Build frontend docker image
To build docker image runs this script from location of Dockerfile
````
docker build -t prognimak.ordermanager/frontend:<version> .
````


### Run with docker-compose
- change version of images in compose file which you have created above
- remove older docker containers and volumes
- run script 
```
 docker-compose -f ordermanager-compose.yaml up -d
```

### Deploy with docker stack
Before need to init SWARM if not yet initialized then run command:
```
docker swarm init
```
and then run
```
 docker stack deploy -c ordermanager-compose.yaml my-stack
```

### Remove deployed containers, recreate and restart with compose file 
simple run script
```
 ./delete-start.sh
```