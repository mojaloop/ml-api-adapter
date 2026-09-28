FROM node:16.15.0-alpine
USER root

WORKDIR /opt/app

COPY package.json package-lock.json* /opt/app/

RUN apk add --no-cache -t build-dependencies autoconf automake g++ gcc git libressl-dev libtool make openssl-dev python3 \
    && npm ci --ignore-scripts \
    && npm rebuild node-rdkafka \
    && apk del build-dependencies

COPY src /opt/app/src
COPY test /opt/app/test
COPY config /opt/app/config

EXPOSE 3000
CMD ["npm", "start"]
