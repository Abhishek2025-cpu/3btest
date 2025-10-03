# Use Node.js LTS base image
FROM node:18

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install


bprofiles-54714-firebase-adminsdk-fbsvc-5ae26f5109.json ./



# Copy the app source
COPY . .

# Expose the port that Cloud Run expects
EXPOSE 8080

# Start the server
CMD [ "node", "server.js" ]
