# --- STAGE 1: BUILD ---
# Development Dockerfile for Medusa
FROM node:20-alpine

# Enable Corepack
RUN corepack enable

# Prepare and activate a specific Yarn version
RUN yarn install --frozen-lockfile
# Set working directory
WORKDIR /server

# Copy package files and yarn config
COPY package.json yarn.lock .yarnrc.yml ./

# Install all dependencies using yarn
RUN yarn install


# Copy source code
COPY . .

RUN yarn build

# Expose the port Medusa runs on
EXPOSE 9000

# Start with migrations and then the development server
CMD ["./start.sh"] CMD ["sh", "-c", "medusa migrations run && /usr/local/bin/node dist/main.js"]