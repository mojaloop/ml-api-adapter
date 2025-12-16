# Onboarding


>*Note:* Before completing this guide, make sure you have completed the _general_ onboarding guide in the [base mojaloop repository](https://github.com/mojaloop/mojaloop/blob/master/onboarding.md#mojaloop-onboarding).

## <a name='Contents'></a>Contents 

<!-- vscode-markdown-toc -->
1. [Prerequisites](#Prerequisites)
2. [Installing and Building](#InstallingandBuilding)
3. [Running Locally](#RunningLocally)
4. [Running Inside Docker](#RunningInsideDocker)
5. [Testing](#Testing)
6. [Common Errors/FAQs](#CommonErrorsFAQs)

<!-- vscode-markdown-toc-config
	numbering=true
	autoSave=true
	/vscode-markdown-toc-config -->
<!-- /vscode-markdown-toc -->

##  1. <a name='Prerequisites'></a>Prerequisites

If you have followed the [general onboarding guide](https://github.com/mojaloop/mojaloop/blob/master/onboarding.md#mojaloop-onboarding), you should already have the following cli tools installed:

* `brew` (macOS), [todo: windows package manager]
* `curl`, `wget`
* `docker` + `docker-compose`
* `node`, `npm` and (optionally) `nvm`

In addition to the above cli tools, you will need to install the following to build and run the `ml-api-adapter`:

<!-- Commented out until there is content in this section
###  1.1. <a name='macOS'></a>macOS
```bash
#none - you have everything you need!
```

###  1.2. <a name='Linux'></a>Linux

[todo]

###  1.3. <a name='Windows'></a>Windows

[todo]
-->


##  2. <a name='InstallingandBuilding'></a>Installing and Building

Firstly, clone your fork of the `ml-api-adapter` onto your local machine:
```bash
git clone https://github.com/<your_username>/ml-api-adapter.git
```

Then `cd` into the directory and install the node modules:
```bash
cd ml-api-adapter
npm install
```

> If you run into problems running `npm install`, make sure to check out the [Common Errors/FAQs](#CommonErrorsFAQs) below.


##  3. <a name='RunningLocally'></a>Running Locally


In this method, we will run all of the core dependencies (`kafka`, `mysql` and `mockserver`) inside of docker containers, while running the `central-ledger` server on your local machine.

> Alternatively, you can run the `ml-api-adapter` inside of `docker-compose` with the rest of the dependencies to make the setup a little easier: [Running Inside Docker](#RunningInsideDocker).

### 3.1 Run all back-end dependencies as part of the Docker Compose

> Note: mockserver below is optional. Include it if you require its use.

```bash
# start all back-end dependencies in Docker
docker-compose up -d mysql kafka simulator mockserver central-ledger
```

This will do the following:
* `docker pull` down any dependencies defined in the `docker-compose.yml` file, and the services (mysql, kafka, etc) specified in the above command
* run all of the containers together
* ensure that all dependencies (i.e. mysql, kafka) have started for each services.

### 3.2 Configure the DB environment variable and run the server

```bash
# start the server
npm run start
```

Upon running `npm run start`, your output should look similar to:

```bash
> @mojaloop/ml-api-adapter@4.4.1 start /fullpath/to/ml-api-adapter
> run-p start:api


> @mojaloop/ml-api-adapter@4.4.1 start:api /fullpath/to/ml-api-adapter
> node src/api/index.js

http://hostname.local:4000
  GET    /                              Metadata
  GET    /documentation
  GET    /health                        Status of adapter
  GET    /metrics                       Prometheus metrics endpoint
  GET    /swagger.json
  GET    /swaggerui/{path*}
  GET    /swaggerui/extend.js
  POST   /transfers                     Transfer API.
  GET    /transfers/{id}                Get a transfer by Id
  PUT    /transfers/{id}                Fulfil a transfer

2019-02-01T13:30:30.454Z - info: participantEndpointCache::initializeCache::start
2019-02-01T13:30:30.456Z - info: participantEndpointCache::initializeCache::Cache initialized successfully
2019-02-01T13:30:30.457Z - info: Notification::startConsumer
2019-02-01T13:30:30.458Z - info: Notification::startConsumer - starting Consumer for topicNames: [topic-notification-event]
```

### **3. Follow logs of the back-end dependencies**
```bash
docker-compose logs -f
```


##  4. <a name='RunningInsideDocker'></a>Running Inside Docker

We use `docker-compose` to manage and run the `ml-api-adapter` along with its dependencies with one command.

### 4.1 Run Central-Ledger and all dependencies as part of the Docker Compose
```bash
# start all services in Docker
docker-compose up -d
```

This will do the following:
* `docker pull` down any dependencies defined in the `docker-compose.yml` file
* `docker build` the `ml-api-adapter` image based on the `Dockerfile` defined in this repo
* run all of the containers together
* ensure that all dependencies (i.e. mysql, kafka) have started for each services.

### 4.2 Follow the logs
```bash
docker-compose logs -f
```

## 5. Handy Docker Compose Tips

You can run `docker-compose` in 'detached' mode as follows:

```bash
npm run docker:up -- -d
```

And then attach to the logs with:
```bash
docker-compose logs -f
```

When you're done, don't forget to stop your containers however:
```bash
npm run docker:down
```

##  5. <a name='Testing'></a>Testing

We use `npm` scripts as a common entrypoint for running the tests.

> Note: Ensure that you stop all Docker services (`docker-compose stop`) prior to running the below commands.

```bash
# unit tests:
npm run test:unit

# integration tests
npm run test:integration

# functional tests
npm run test:functional

# check test coverage
npm run test:coverage
```

### 6. Testing the `central-ledger` API with Postman

<!-- TODO: Verify if this link is still useful and applicable.
>Note: Check the [general onboarding guide](https://github.com/mojaloop/mojaloop/blob/master/onboarding.md#2-postman) for additional information.
-->

#### 6.1 Prerequisites:

1. Follow the steps as described in [`5.2. Verifying Mojaloop Deployment` from the Deployment Guide](https://github.com/mojaloop/documentation/tree/master/deployment-guide#52-verifying-mojaloop-deployment).
2. Clone the [Postman Collection repo](https://github.com/mojaloop/postman): 
    ```bash
    # Clone Mojaloop Postman repo
    git clone https://github.com/mojaloop/postman.git
    
    # Switch to postman directory
    cd ./postman
    ```
3. Refer to [4. Support Scripts for Docker-compose](https://github.com/mojaloop/postman#4-support-scripts-for-docker-compose) of the readme for additional prerequisites.

#### 6.2 Pre-loading Test Data

Refer to section [4. Support Scripts for Docker-compose](https://github.com/mojaloop/postman#42-pre-loading-test-data) of the readme.

#### 6.3 Running Example Requests

Refer to section [4. Support Scripts for Docker-compose](https://github.com/mojaloop/postman43-running-example-requests) of the readme.


##  7. <a name='CommonErrorsFAQs'></a>Common Errors/FAQs

#### 7.1 `sodium v1.2.3` can't compile during npm install

Resolved by installing v2.0.3 `npm install sodium@2.0.3`


#### 7.2 On macOS, `npm install` fails with the following error
```
Undefined symbols for architecture x86_64:
  "_CRYPTO_cleanup_all_ex_data", referenced from:
      _rd_kafka_transport_ssl_term in rdkafka_transport.o
  "_CRYPTO_num_locks", referenced from:
  ........
  ld: symbol(s) not found for architecture x86_64
clang: error: linker command failed with exit code 1 (use -v to see invocation) 
```

Resolved by installing openssl `brew install openssl` and then running: 
  ```bash
  export CFLAGS=-I/usr/local/opt/openssl/include 
  export LDFLAGS=-L/usr/local/opt/openssl/lib 
  npm install
  ```  
  
### 7.3 Docker-Compose Issues

#### 7.3.1 On Linux, Simulator is unable to send callback to the ML-API-Adapter service

Shutdown all docker images, and modify the following line in the docker-compose: `- TRANSFERS_ENDPOINT=http://host.docker.internal:3000`

```yaml
  simulator:
    image: mojaloop/simulator:latest
    container_name: ml_simulator
    ports:
      - "8444:8444"
    environment:
      - LOG_LEVEL=info
      - TRANSFERS_ENDPOINT=http://host.docker.internal:3000
      - TRANSFERS_FULFIL_RESPONSE_DISABLED=false
    networks:
      - ml-mojaloop-net
    healthcheck:
      test: ["CMD", "sh", "-c" ,"apk --no-cache add curl", ";", "curl", "http://localhost:8444/health"]
      timeout: 20s
      retries: 10
      interval: 30s
```

Replace `host.docker.internal` with `172.17.0.1` as per the following example:

```yaml
  simulator:
    image: mojaloop/simulator:latest
    container_name: ml_simulator
    ports:
      - "8444:8444"
    environment:
      - LOG_LEVEL=info
      - TRANSFERS_ENDPOINT=http://172.17.0.1:3000
      - TRANSFERS_FULFIL_RESPONSE_DISABLED=false
    networks:
      - ml-mojaloop-net
    healthcheck:
      test: ["CMD", "sh", "-c" ,"apk --no-cache add curl", ";", "curl", "http://localhost:8444/health"]
      timeout: 20s
      retries: 10
      interval: 30s
```

> Note: This will ensure that the simulator can send requests to the host machine. Refer to the following issue for more information or if the above ip-address is not working for you: https://github.com/docker/for-linux/issues/264.

Restart all docker images.
