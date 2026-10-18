FROM node:20-bullseye

# Install chromium for whatsapp-web.js in Docker
RUN apt-get update && apt-get install -y \
    chromium \
    && rm -rf /var/lib/apt/lists/*

ENV TZ=Asia/Jakarta

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8828

CMD ["npm", "run", "start:all"]
