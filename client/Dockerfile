# Stage 1: Build React Application
FROM node:25-alpine AS build

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

# Stage 2: Serve static assets via nginx.
#
# Built on plain Alpine rather than the nginx image: the official image ships no
# Brotli module, and a module has to match the exact nginx build it loads into.
# Alpine's own `nginx` and `nginx-mod-http-brotli` packages are built together,
# so they always agree.
FROM alpine:3.20

RUN apk add --no-cache nginx nginx-mod-http-brotli && \
    mkdir -p /var/cache/nginx/api /var/cache/nginx/uploads /etc/nginx/snippets /run/nginx && \
    chown -R nginx:nginx /var/cache/nginx && \
    ln -sf /dev/stdout /var/log/nginx/access.log && \
    ln -sf /dev/stderr /var/log/nginx/error.log

# Site config (Alpine includes /etc/nginx/http.d/*.conf at http level).
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY nginx/security-headers.conf nginx/csp.conf /etc/nginx/snippets/

# Copy build artifacts from Stage 1
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
