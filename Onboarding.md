

>>Note: Before completing this guide, make sure you have completed the _general_ onboarding guide in the [base mojaloop repository](https://github.com/mojaloop/mojaloop/blob/master/onboarding.md#mojaloop-onboarding). This guide picks up where that guide finishes off.

##  1. <a name='Contents'></a>Contents 

<!-- vscode-markdown-toc -->
* 2. [Prerequisites](#Prerequisites)
* 3. [Installing and Building](#InstallingandBuilding)
* 4. [Running Locally](#RunningLocally)
* 5. [Running Inside Docker](#RunningInsideDocker)
* 6. [Testing](#Testing)
* 7. [Common Errors/FAQs](#CommonErrorsFAQs)

<!-- vscode-markdown-toc-config
	numbering=true
	autoSave=true
	/vscode-markdown-toc-config -->
<!-- /vscode-markdown-toc --># ml-api-adapter Setup

##  2. <a name='Prerequisites'></a>Prerequisites

If you have followed the [general onboarding guide](https://github.com/mojaloop/mojaloop/blob/master/onboarding.md#mojaloop-onboarding), you should already have the following cli tools installed:

* `brew` (macOS), [todo: windows package manager]
* `curl`, `wget`
* `docker` + `docker-compose`
* `node`, `npm` and (optionally) `nvm`

In addition to the above cli tools, you will need to install the following to build and run the `ml-api-adapter`:


###  2.1. <a name='macOS'></a>macOS
[todo: none?]
```bash
# # install the following libraries to be able to build #[todo: do we actually need this?]
# brew install libtool autoconf automake
```

###  2.2. <a name='Linux'></a>Linux

[todo]

###  2.3. <a name='Windows'></a>Windows

[todo]



##  3. <a name='InstallingandBuilding'></a>Installing and Building

Firstly, clone your fork of the `ml-api-adapter` onto your local machine:
```bash
git clone https://github.com/<your_username>/ml-api-adapter.git
```

Then `cd` into the directory and install the node modules:
```bash
cd ml-api-adapter
npm install
```


##  4. <a name='RunningLocally'></a>Running Locally

To get the `ml-api-adapter` running, the following must also be up and running:

* kafka
* `central_ledger` - [todo: this has its own dependencies right!?!]

[todo: double check dependencies, and write short instructions for running them. We should just make the simplest possible configuration, as it doesn't already exist]

Once simply run:
```bash
npm run start
```
to start the ml-api-adapter.


##  5. <a name='RunningInsideDocker'></a>Running Inside Docker

We use `docker-compose` to manage and run the `ml-api-adapter` along with its dependencies with one command.


##  6. <a name='Testing'></a>Testing

We use `npm` scripts as a common entrypoint to running tests.

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


##  7. <a name='CommonErrorsFAQs'></a>Common Errors/FAQs


* sodium v1.2.3 can't compile during npm install
  - resolved by installing v2.0.3 `npm install sodium@2.0.3`
* On macOS, `npm install` fails with the following error:
```
Undefined symbols for architecture x86_64:
  "_CRYPTO_cleanup_all_ex_data", referenced from:
      _rd_kafka_transport_ssl_term in rdkafka_transport.o
  "_CRYPTO_num_locks", referenced from:
  ........
  ld: symbol(s) not found for architecture x86_64
clang: error: linker command failed with exit code 1 (use -v to see invocation) 
```
  - resolved by installing openssl `brew install openssl` and then running: 
  ```bash
  export CFLAGS=-I/usr/local/opt/openssl/include 
  export LDFLAGS=-L/usr/local/opt/openssl/lib 
  npm install
  ```  