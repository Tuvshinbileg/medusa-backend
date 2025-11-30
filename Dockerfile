FROM node:20-alpine

# Enable Corepack for Yarn
RUN corepack enable

# Set working directory
WORKDIR /app

# Copy package files first (for better layer caching)
#COPY package.json yarn.lock .yarnrc.yml ./

# Copy source code
COPY . .

# Install dependencies
RUN yarn install 

# Build the application
RUN yarn build

# Expose Medusa port
EXPOSE 9000

# Run migrations and start server
CMD ["sh", "-c", "medusa db:migrate"]