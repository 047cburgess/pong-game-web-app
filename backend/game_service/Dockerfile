FROM node:24.9

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

RUN npm run build
# command defined in docker-compose.yml
