# ---- build stage ------------------------------------------------------------
# The Maven wrapper is used rather than a maven:* image so the build pins the
# exact Maven version already committed in .mvn/wrapper.
FROM eclipse-temurin:25-jdk AS build

WORKDIR /build

# Resolve dependencies in their own layer so a source-only change does not
# re-download the world.
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B dependency:go-offline

COPY src/ src/
RUN ./mvnw -B -DskipTests package

# ---- runtime stage ----------------------------------------------------------
FROM eclipse-temurin:25-jre AS runtime

# curl backs the Compose healthcheck against /actuator/health.
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*

# Never run the service as root.
RUN groupadd --system spring && useradd --system --gid spring spring

WORKDIR /app
COPY --from=build --chown=spring:spring /build/target/*.jar app.jar

USER spring:spring

EXPOSE 8081

ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
