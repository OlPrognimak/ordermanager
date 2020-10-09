### Build docker image
To build docker image runs this script from location of Dockerfile
````
docker build -t prognimak.ordermanager/frontend:<version> .
````
### Run docker image

If wants to run only ordermanager image than run that script
```
 docker run  prognimak.ordermanager/frontend
```

### Run docker-compose
To run docker compose with postgresql data base and orderimage backend application
```
 docker-compose -f docker-compose.yaml up -d
```

### Deploy with docker stack
To deploy docker stack with postgresql data base and orderimage backend application.
Before need to init SWARM. Run command:
```
docker swarm init
```
then run
```
 docker stack deploy -c docker-compose.yaml my-stack
```