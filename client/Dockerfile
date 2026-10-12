# ---- build stage ------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# npm ci in its own layer, keyed on the lockfile only.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite inlines env vars at build time, so these are build args, not runtime env.
# The default keeps the app same-origin and proxied by nginx (see nginx.conf).
ARG VITE_API_BASE_URL=/api
ARG VITE_API_TIMEOUT=15000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_API_TIMEOUT=$VITE_API_TIMEOUT

RUN npm run build

# ---- runtime stage ----------------------------------------------------------
FROM nginx:1.29-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1
