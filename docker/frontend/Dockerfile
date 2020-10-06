# Stage 1 Node
#FROM node:10.16.3
#WORKDIR /usr/src/app
#RUN npm install
#RUN npm install -g @angular/cli

#Stage 2 Springboot
FROM openjdk:14-jdk-alpine
ARG JAR_FILE=ordermanager-ui.jar
COPY ${JAR_FILE} app.jar
ENTRYPOINT ["java","-jar","/app.jar"]
