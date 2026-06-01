FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package dependencies
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Set environment defaults
ENV PORT=5000
ENV NODE_ENV=production

# Expose server port
EXPOSE 5000

# Start server
CMD ["node", "index.js"]
