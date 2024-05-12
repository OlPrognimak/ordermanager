#Stage 2 Springboot
FROM openjdk:21-jdk
ARG JAR_FILE=service-discovery.jar
COPY ${JAR_FILE} app.jar
ENTRYPOINT ["java","-jar","/app.jar"]
