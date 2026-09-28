# Arguments
ARG NODE_VERSION=24.14.1-alpine3.23

# NOTE: Ensure you set NODE_VERSION Build Argument as follows...
#
#  export NODE_VERSION="$(cat .nvmrc)-alpine" \
#  docker build \
#    --build-arg NODE_VERSION=$NODE_VERSION \
#    -t mojaloop/sdk-scheme-adapter:local \
#    . \
#

# Build Image
FROM node:${NODE_VERSION} AS builder
USER root

WORKDIR /opt/app

COPY package.json package-lock.json* /opt/app/

RUN apk add --no-cache -t build-dependencies autoconf automake bash g++ gcc git libtool make openssl-dev python3 \
    && npm ci --ignore-scripts \
    && npm prune --omit=dev --ignore-scripts \
    && npm rebuild node-rdkafka

FROM node:${NODE_VERSION}

WORKDIR /opt/app
# Create empty log file & link stdout to the application log file
RUN mkdir ./logs \
    && touch ./logs/combined.log \
    && ln -sf /dev/stdout ./logs/combined.log

# Create a non-root user: ml-user
RUN adduser -D app-user
USER app-user

COPY --chown=app-user --from=builder /opt/app .

COPY src /opt/app/src
COPY config /opt/app/config

EXPOSE 3000

CMD ["npm", "start"]
