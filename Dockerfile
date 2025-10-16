# Use Node.js LTS base image
FROM node:18

# Create app directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy Firebase credentials and app source
COPY bprofiles-54714-firebase-adminsdk-fbsvc-5ae26f5109.json ./
COPY . .

# Expose the port Cloud Run expects
EXPOSE 8080

# Start the server
CMD ["node", "server.js"]
