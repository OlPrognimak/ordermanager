### Build docker image
To build docker image runs this script from location of Dockerfile
````
docker build -t prognimak.ordermanager/backend .
````
### Run docker image

If wants to run only ordermanager image than run that script
```
 docker run --env DB_PORT=5432 --env DB_HOST=prognimak -p 8083:8083 prognimak.ordermanager/backend
```

### Run docker-compose
To run docker compose with postgresql data base and orderimage backend application
```
 docker-compose -f mycompose.yaml up -d
```

### Deploy with docker stack
To deploy docker stack with postgresql data base and orderimage backend application
```
 docker stack deploy -c mycompose.yaml my-stack
```