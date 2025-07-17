FROM node:lts-alpine

WORKDIR /usr/app

# Expose port 3001 instead of 3000
EXPOSE 3001

# Install system dependencies
RUN apk update \
    && apk upgrade \
    && apk add --no-cache --upgrade bash \
    && apk add git

# Copy package files first for better Docker layer caching
COPY package*.json ./
COPY yarn.lock* ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build the Next.js application
RUN yarn build

# Set permissions
RUN chmod +x /usr/app

# Set environment variable to run on port 3001
ENV PORT=3001

# Use production start command instead of dev
CMD ["yarn", "start", "-p", "3001"]

