FROM node:16.15.0-alpine
USER root

WORKDIR /opt/app

RUN apk --no-cache add git
RUN apk add --no-cache -t build-dependencies make gcc g++ python3 libtool libressl-dev openssl-dev autoconf automake

COPY package.json package-lock.json* /opt/app/

RUN npm ci --ignore-scripts \
    && npm rebuild node-rdkafka

RUN apk del build-dependencies

COPY src /opt/app/src
COPY test /opt/app/test
COPY config /opt/app/config

EXPOSE 3000
CMD ["npm", "start"]
