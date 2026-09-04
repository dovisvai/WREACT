# WREACT server image.
#
# Runs the Express + WebSocket process that owns the world standings. Works
# unchanged on Fly, Railway, Render and anything else that takes a Dockerfile.
#
# Build with the public origin baked in, because Vite inlines VITE_* at build
# time rather than reading them at runtime:
#
#   docker build --build-arg VITE_API_ORIGIN=https://api.wreact.app -t wreact .

FROM node:22-slim AS build

WORKDIR /app

# Install with the lockfile so builds are reproducible.
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Client-side configuration is compiled into the bundle.
ARG VITE_API_ORIGIN=""
ARG VITE_SHARE_ORIGIN=""
ARG VITE_ONESIGNAL_APP_ID=""
ARG VITE_REVENUECAT_IOS_KEY=""
ARG VITE_REVENUECAT_ANDROID_KEY=""
ENV VITE_API_ORIGIN=$VITE_API_ORIGIN \
    VITE_SHARE_ORIGIN=$VITE_SHARE_ORIGIN \
    VITE_ONESIGNAL_APP_ID=$VITE_ONESIGNAL_APP_ID \
    VITE_REVENUECAT_IOS_KEY=$VITE_REVENUECAT_IOS_KEY \
    VITE_REVENUECAT_ANDROID_KEY=$VITE_REVENUECAT_ANDROID_KEY

RUN npm run build


FROM node:22-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

# Only runtime dependencies ship. The build toolchain stays behind.
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# Never run as root.
USER node

# The platform overrides this; the default matches local development.
ENV PORT=3000
EXPOSE 3000

# The server already exposes /api/health, so platforms can probe it directly.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.cjs"]
