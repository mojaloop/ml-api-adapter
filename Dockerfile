FROM mhart/alpine-node:8.9.4
USER root

WORKDIR /opt/ml-api-adapter
COPY src /opt/ml-api-adapter/src
COPY config /opt/ml-api-adapter/config
COPY package.json /opt/ml-api-adapter/
COPY logs /opt/ml-api-adapter/logs

RUN apk --no-cache add git
RUN apk add --no-cache -t build-dependencies make gcc g++ python libtool autoconf automake \
    && cd $(npm root -g)/npm \
    && npm config set unsafe-perm true \
    && npm install -g node-gyp

RUN npm install --production && \
  npm uninstall -g npm

RUN apk del build-dependencies

EXPOSE 3000

# Create empty log file
RUN touch ./logs/combined.log

# Link the stdout to the application log file
RUN ln -sf /dev/stdout ./logs/combined.log

CMD node src/api/index.js
