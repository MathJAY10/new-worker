FROM node:18-slim

# Install system dependencies required for:
# - tesseract
# - pdf2pic (graphicsmagick)
# - pdfkit
# - prisma (openssl)
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    graphicsmagick \
    imagemagick \
    libssl-dev \
    libc6 \
    libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy all project files
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Worker runs on start
CMD ["npm", "start"]
