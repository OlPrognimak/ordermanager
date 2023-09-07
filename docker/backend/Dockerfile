FROM openjdk:17-alpine
ARG JAR_FILE=ordermanager-backend.jar
COPY ${JAR_FILE} app.jar
RUN apk add fontconfig ttf-dejavu
ENTRYPOINT ["java","-jar","/app.jar"]