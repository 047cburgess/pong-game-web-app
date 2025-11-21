FROM node:24.9

WORKDIR /app

COPY package*.json ./
RUN npm i

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
