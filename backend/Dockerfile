FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install dependencies first (leverage Docker cache)
COPY package*.json ./
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Expose the default port for Hugging Face Spaces
EXPOSE 7860

# Start the application
CMD [ "npm", "start" ]
