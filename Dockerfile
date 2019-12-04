FROM node:10.15.3-alpine as builder
USER root

WORKDIR /opt/ml-api-adapter

RUN apk --no-cache add git
RUN apk add --no-cache -t build-dependencies make gcc g++ python libtool autoconf automake \
    && cd $(npm root -g)/npm \
    && npm config set unsafe-perm true \
    && npm install -g node-gyp

COPY package.json package-lock.json* /opt/ml-api-adapter/

RUN npm install

COPY src /opt/ml-api-adapter/src
COPY config /opt/ml-api-adapter/config

FROM node:10.15.3-alpine

WORKDIR /opt/ml-api-adapter

COPY --from=builder /opt/ml-api-adapter .
RUN npm prune --production

# Create empty log file & link stdout to the application log file
RUN mkdir ./logs && touch ./logs/combined.log
RUN ln -sf /dev/stdout ./logs/combined.log

EXPOSE 3000
CMD ["node", "src/api/index.js"]
