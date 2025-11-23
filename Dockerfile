# --- STAGE 1: BUILD ---
# Use the same base image as development for consistency, but this is the 'builder'
FROM node:20-alpine AS builder

# Enable Corepack
RUN corepack enable

# Prepare and activate a specific Yarn version
RUN corepack prepare yarn@4.9.4 --activate

# Set working directory for the server build
WORKDIR /server

# Copy package files and yarn config
COPY package.json yarn.lock .yarnrc.yml ./

# Install only production dependencies for the build step
# The dependencies needed for the *build* process (TypeScript, etc.) will be installed.
RUN yarn install --immutable

# Copy all source code
COPY . .

# Run the Medusa build command (adjust if your package.json uses a different script name)
RUN yarn build

# --- STAGE 2: PRODUCTION RUNTIME ---
# Use a lean runtime image for the final deployment
FROM node:20-slim AS production

# Set working directory
WORKDIR /server

# Create a non-root user for security
RUN groupadd -r medusa && useradd -r -g medusa medusa
USER medusa

# Copy only the compiled output, node_modules, and necessary files from the builder
# 1. node_modules (production dependencies)
COPY --from=builder /server/node_modules ./node_modules
# 2. Compiled source code (usually under 'dist' for Medusa)
COPY --from=builder /server/dist ./dist
# 3. package.json and yarn files (needed for 'npm start' or running scripts)
COPY package.json .yarnrc.yml ./
# 4. Optional: Any necessary config files (e.g., medusa-config.js, .env, public folder)
# For Medusa, you often need the config file and potentially the 'uploads' folder structure.
# COPY medusa-config.js ./
# You should manage environment variables separately (e.g., via Kubernetes Secrets or Docker Compose)

# Expose the port Medusa runs on
EXPOSE 9000

# Start with migrations and then the production server
# Note: For production, it's safer to run migrations as a separate step outside the main CMD,
# or use a dedicated entrypoint script that handles both, but here's the typical structure:

# ENTRYPOINT ["/usr/local/bin/node", "dist/main.js"]
CMD ["/usr/local/bin/node", "dist/main.js"]
# If you need to run migrations first (like your original start.sh), you'd use a script:
# CMD ["sh", "-c", "medusa migrations run && /usr/local/bin/node dist/main.js"]