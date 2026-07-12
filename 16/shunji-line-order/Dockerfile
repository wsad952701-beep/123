FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# 訂單資料放這裡（部署時記得掛一顆永久磁碟到 /app/data，不然重開會清空）
RUN mkdir -p /app/data
VOLUME /app/data

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]
