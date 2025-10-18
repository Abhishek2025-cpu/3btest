# Use Node.js LTS base image
FROM node:18

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy Firebase credentials (both files, if needed)
COPY bprofiles-54714-firebase-adminsdk-fbsvc-5ae26f5109.json ./
# Copy the Firebase credentials that exist
COPY serviceAccountKey.json ./


# Copy the rest of the app source code
COPY . .

# Expose the port Cloud Run expects
EXPOSE 8080

# Start the server
CMD ["node", "server.js"]
