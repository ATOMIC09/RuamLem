# Use official Bun image
FROM oven/bun:1

# Create app directory
WORKDIR /app

# Copy all files
COPY . .

# Install dependencies
RUN bun install

# Build the project
RUN bun run build

# Expose the port Elysia listens on
EXPOSE 3030

# Start the server
CMD ["bun", "run", "start"]
