# ==========================================
# Stage 1: Build Frontend (React + Vite)
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install
COPY . .

ARG VITE_SUPABASE_URL=https://nqwlbqxzdmbsgyprwikd.supabase.co
ARG VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2xicXh6ZG1ic2d5cHJ3aWtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3ODcxMTAsImV4cCI6MjEwNjM2MzExMH0.ksCNePOT8XALSbjAiXBnH55IrOJvLd_-Gfrl1OZVWtg
ARG VITE_ADMIN_SETUP_KEY=FIRST_ADMIN_SETUP
ARG VITE_API_BASE_URL=

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_ADMIN_SETUP_KEY=$VITE_ADMIN_SETUP_KEY
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

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

ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-Xmx350m", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
