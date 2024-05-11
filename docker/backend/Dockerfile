FROM openjdk:21-jdk
ARG JAR_FILE=ordermanager-backend.jar
COPY ${JAR_FILE} app.jar
#Thas need only on Mac
#RUN apk add fontconfig ttf-dejavu
ENTRYPOINT ["java","-jar","/app.jar"]