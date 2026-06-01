# Stage 1: Build React Application
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy client source files
COPY . .

# Accept API URL build argument to bake into the static assets
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Build the application
RUN npm run build

# Stage 2: Serve Static Assets via Nginx
FROM nginx:1.25-alpine

# Copy custom Nginx configuration for React SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts from Stage 1
COPY --from=build /app/dist /usr/share/nginx/html

# Expose web port
EXPOSE 80

# Run Nginx
CMD ["nginx", "-g", "daemon off;"]
