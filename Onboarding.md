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


###  1.1. <a name='macOS'></a>macOS
```bash
#none - you have everything you need!
```

###  1.2. <a name='Linux'></a>Linux

[todo]

###  1.3. <a name='Windows'></a>Windows

[todo]



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

While you can get the `ml-api-adapter` up and running by itself, it isn't all that useful for testing. `ml-api-adapter` requires at a minimum:
* `central-ledger`
* `kafka`

Follow the [onboarding guide](https://github.com/mojaloop/central-ledger/blob/master/Onboarding.md) for `central-ledger` to get the required local environment set up before running the following:

Once you have the `central-ledger` up and running, start the `ml-api-adapter` with:
```bash
npm run start
```

> Alternatively, try running the `ml-api-adapter` with `docker-compose` to make the setup a little easier: [Running Inside Docker](#RunningInsideDocker).


##  4. <a name='RunningInsideDocker'></a>Running Inside Docker

We use `docker-compose` to manage and run the `ml-api-adapter` along with its dependencies with one command.

>*Note:* Before starting all of the containers however, start the `mysql` container alone, to give it some more time to set up the necessary permissions (this only needs to be done once). This is a short-term workaround because the `central-ledger` doesn't retry it's connection to MySQL.

```bash
docker-compose up mysql #first time only - the initial mysql load takes a while, and if it's not up in time, the central-ledger will just crash
npm run docker:up
```

This will do the following:
* `docker pull` down any dependencies defined in the `docker-compose.yml` file
* `docker build` based on the `Dockerfile` defined in this repo
* run all of the containers together


### 4.1 Handy Docker Compose Tips

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
npm run docker:stop
```


### 4.2 Running Dependencies in `docker`, but local 

This is useful for developing and debugging quickly, without having to rely on mounting `node_modules` into docker containers, while still getting a replicatable environment for the `ml-api-adapter`'s dependencies.

```bash
docker-compose up central-ledger mysql kafka #run in separate shell, or with -d
npm run start

# hit the health check endpoint to verify the server is up and running
curl localhost:3000/health
```


##  5. <a name='Testing'></a>Testing

We use `npm` scripts as a common entrypoint for running the tests.

```bash
# unit tests:
npm run test:unit

# integration tests
npm run test:int

# functional tests
npm run test:functional

# check test coverage
npm run test:coverage
```


##  6. <a name='CommonErrorsFAQs'></a>Common Errors/FAQs

#### 6.1 `sodium v1.2.3` can't compile during npm install

Resolved by installing v2.0.3 `npm install sodium@2.0.3`


#### 6.2 On macOS, `npm install` fails with the following error
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