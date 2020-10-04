### Build docker image
````
docker build -t ordermanager/backend .
````
### Run docker image

```
 docker run --env DB_PORT=5432 --env DB_HOST=prognimak -p 8083:8083 ordermanager/backend
```
