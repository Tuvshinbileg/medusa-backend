FROM node:20-alpine

# Enable Corepack for Yarn
RUN corepack enable

# Set working directory
WORKDIR /server

# Copy package files first (for better layer caching)
COPY package.json yarn.lock .yarnrc.yml ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN yarn build

# Expose Medusa port
EXPOSE 9000

# Run migrations and start server
CMD ["sh", "-c", "medusa db:migrate"]