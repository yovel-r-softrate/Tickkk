# Build stage
FROM node:20-alpine as build-stage

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build the Angular app
COPY . .
RUN npm run build -- --configuration production

# Serve stage
FROM nginx:alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built Angular app from the build stage
# Angular 17+ with the application builder outputs to browser/
COPY --from=build-stage /app/dist/task-management-app/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
