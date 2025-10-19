# Use Node.js LTS base image
FROM node:18

# Create app directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the app source code (without JSON secrets)
COPY . .

# Expose the port Cloud Run expects
EXPOSE 8080

# Start the server
CMD ["node", "server.js"]
