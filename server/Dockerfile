FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package dependencies
COPY package*.json ./

# Install production dependencies
# --omit=dev replaces the deprecated --only=production; dropping npm's cache
# keeps ~tens of MB out of the image.
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# Copy application files
COPY . .

# Set environment defaults
ENV PORT=5000
ENV NODE_ENV=production

# Expose server port
EXPOSE 5000

# Start server
CMD ["node", "index.js"]
