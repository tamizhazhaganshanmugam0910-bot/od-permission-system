# ==========================================
# Stage 1: Build Frontend (React + Vite)
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install
COPY . .
RUN npm run build

# ==========================================
# Stage 2: Build Backend (Maven + Spring Boot)
# ==========================================
FROM maven:3.9.6-eclipse-temurin-17 AS backend-builder
WORKDIR /app/backend
COPY backend/pom.xml .
RUN mvn dependency:go-offline -B || true

COPY backend/src ./src
# Copy compiled frontend SPA directly into Spring Boot static resources
COPY --from=frontend-builder /app/dist ./src/main/resources/static

# Build executable standalone JAR
RUN mvn clean package -DskipTests

# ==========================================
# Stage 3: Minimal Secure Production Runtime
# ==========================================
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=backend-builder /app/backend/target/*.jar app.jar

USER appuser
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
