# Frontend Dockerfile
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY . .

# Debug: Show .env files
RUN echo "=== .env files in container ===" && ls -la .env* 2>/dev/null || echo "No .env files found"

# Set environment variable for API URL (default for Docker environment)
ARG REACT_APP_API_BASE_URL=http://localhost:8000
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL

# Debug: Show environment variable
RUN echo "Building with API_BASE_URL: $REACT_APP_API_BASE_URL"

# Build the application
RUN npm run build

# List build directory for debugging
RUN ls -la /app/build/

# Production stage
FROM nginx:alpine

# Copy built app to nginx
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# List nginx html directory for debugging
RUN ls -la /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
