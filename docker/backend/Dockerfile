FROM eclipse-temurin:21-jdk
ARG JAR_FILE=ordermanager-backend.jar
COPY ${JAR_FILE} app.jar
#That's need only on Mac
#RUN apk add fontconfig ttf-dejavu
ENTRYPOINT ["java","-jar","/app.jar"]