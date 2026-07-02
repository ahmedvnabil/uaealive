FROM node:22-alpine AS build

WORKDIR /srv/web

COPY package.json package-lock.json ./
# Lockfile is authored with npm 11 — npm 10 (bundled with node:22) rejects it.
RUN npm install -g npm@11 && npm ci

COPY . .

# NEXT_PUBLIC_* vars are baked into the client bundle at build time.
ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

FROM node:22-alpine

WORKDIR /srv/web
ENV NODE_ENV=production

COPY --from=build /srv/web ./

EXPOSE 3000
CMD ["npm", "start"]
