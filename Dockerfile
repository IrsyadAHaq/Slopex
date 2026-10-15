FROM node:20-bullseye

# Install firefox for whatsapp-web.js as configured in index.js
RUN apt-get update && apt-get install -y \
    firefox-esr \
    chromium \
    && rm -rf /var/lib/apt/lists/*

ENV TZ=Asia/Jakarta

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8828

CMD ["npm", "run", "start:all"]
