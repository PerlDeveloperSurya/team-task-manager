FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

ENV PORT=7860
EXPOSE 7860

CMD ["npm", "start"]
