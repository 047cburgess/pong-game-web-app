FROM node:24.9 AS builder

RUN mkdir -p /app
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install

COPY frontend ./
RUN npm run build

FROM nginx:1.29.3

RUN rm -rf /etc/nginx/conf.d
COPY ./nginx_conf.d /etc/nginx/conf.d

COPY --from=builder --chmod=444 \
  /app/dist /usr/share/nginx/html

RUN <<EOF
cd /etc/ssl/private
openssl req -x509 -newkey rsa:4096 \
  -keyout key.pem -out cert.pem \
  -sha256 -days 3650 -nodes -subj "/C=FR"
EOF

EXPOSE 443
