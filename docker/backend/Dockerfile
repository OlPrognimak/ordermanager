FROM openjdk:14
ARG JAR_FILE=ordermanager-backend.jar
COPY ${JAR_FILE} app.jar
ENTRYPOINT ["java","-jar","/app.jar"]