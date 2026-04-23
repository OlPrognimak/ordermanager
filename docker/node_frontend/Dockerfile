# Stage 1 Node
FROM node:20-alpine

WORKDIR /app

# install only production deps
COPY src-node/package*.json ./
RUN npm ci --omit=dev

# copy only runtime files
COPY src-node/dist ./dist
COPY src-node/public ./public

CMD ["npm", "start"]