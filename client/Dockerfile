FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_TURN_URL
ARG VITE_TURN_USER
ARG VITE_TURN_PASSWORD
RUN npm run build
FROM ghcr.io/nginx/nginx-unprivileged:1.30.3-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
