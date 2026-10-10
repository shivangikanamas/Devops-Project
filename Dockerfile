FROM maven:3.9.11-eclipse-temurin-25-alpine AS build
WORKDIR /workspace
COPY pom.xml .
COPY src ./src
COPY index.html .
COPY assets ./assets
RUN mvn --batch-mode --no-transfer-progress -DskipTests package

FROM eclipse-temurin:25-jre-alpine
RUN apk add --no-cache curl \
    && addgroup -S app \
    && adduser -S -G app -u 10001 app \
    && mkdir -p /app/data \
    && chown -R app:app /app
WORKDIR /app
COPY --from=build --chown=app:app /workspace/target/devops-eng-proj-1.0.0-SNAPSHOT.jar /app/app.jar
USER 10001:10001
EXPOSE 8080
VOLUME ["/app/data"]
HEALTHCHECK --interval=30s --timeout=3s --start-period=45s --retries=3 \
    CMD curl --fail --silent http://localhost:8080/actuator/health || exit 1
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
