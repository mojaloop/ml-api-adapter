FROM node:12.16.0-alpine
USER root

WORKDIR /opt/ml-api-adapter

RUN apk --no-cache add git
RUN apk add --no-cache -t build-dependencies make gcc g++ python libtool autoconf automake && \
    cd $(npm root -g)/npm \
    && npm config set unsafe-perm true \
    && npm install -g node-gyp tape tap-xunit

COPY package.json package-lock.json* /opt/ml-api-adapter/
RUN npm install

RUN apk del build-dependencies

COPY src /opt/ml-api-adapter/src
COPY test /opt/ml-api-adapter/test
COPY config /opt/ml-api-adapter/config
COPY secrets /opt/ml-api-adapter/secrets
# overwrite default.json with integration environment specific config
RUN cp -f /opt/ml-api-adapter/test/integration-config.json /opt/ml-api-adapter/config/default.json

EXPOSE 3000
CMD ["node /opt/ml-api-adapter/src/api/index.js"]
