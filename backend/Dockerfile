FROM node:20-alpine

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy backend source code
COPY . .

# Expose the backend port
EXPOSE 3000

# Start the Node server
CMD ["node", "index.js"]
