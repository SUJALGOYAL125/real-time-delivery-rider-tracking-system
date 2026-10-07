# Use an official Node LTS image
FROM node:20-slim

# Set working directory inside the container
WORKDIR /app

# Copy package files first (better Docker layer caching)
COPY package*.json ./

# Install only production dependencies for a leaner image
RUN npm install --omit=dev

# Copy the rest of the backend source code
COPY . .

# Exclude the frontend folder from this image — it gets built/deployed separately
# (handled via .dockerignore below)

EXPOSE 5000

CMD ["node", "app.js"]