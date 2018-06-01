FROM mhart/alpine-node:8.9.4
USER root

WORKDIR /opt/ml-api-adapter
COPY src /opt/ml-api-adapter/src
COPY config /opt/ml-api-adapter/config
COPY package.json /opt/ml-api-adapter/

RUN apk --no-cache add git
RUN apk add --no-cache -t build-dependencies make gcc g++ python libtool autoconf automake \
    && cd $(npm root -g)/npm \
    && npm install -g node-gyp

RUN npm install --production && \
  npm uninstall -g npm

RUN apk del build-dependencies

EXPOSE 3000
CMD node src/api/index.js
