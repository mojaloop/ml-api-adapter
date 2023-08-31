# ml-api-adapter

[![Git Commit](https://img.shields.io/github/last-commit/mojaloop/ml-api-adapter.svg?style=flat)](https://github.com/mojaloop/ml-api-adapter/commits/master)
[![Git Releases](https://img.shields.io/github/release/mojaloop/ml-api-adapter.svg?style=flat)](https://github.com/mojaloop/ml-api-adapter/releases)
[![Docker pulls](https://img.shields.io/docker/pulls/mojaloop/ml-api-adapter.svg?style=flat)](https://hub.docker.com/r/mojaloop/ml-api-adapter)
[![CircleCI](https://circleci.com/gh/mojaloop/ml-api-adapter.svg?style=svg)](https://app.circleci.com/pipelines/github/mojaloop/ml-api-adapter)

The ml api adapter is a series of services that facilitate clearing and settlement of transfers between DFSPs, including the following functions:

- Brokering real-time messaging for funds clearing
- Maintaining net positions for a deferred net settlement
- Propagating scheme-level and off-transfer fees

The following documentation represents the services, APIs and endpoints responsible for various ledger functions.

## Contents

- [ml-api-adapter](#ml-api-adapter)
  - [Contents](#contents)
  - [Deployment](#deployment)
    - [Mac users and standard Python](#mac-users-and-standard-python)
  - [Configuration](#configuration)
    - [Environment variables](#environment-variables)
  - [API](#api)
  - [Logging](#logging)
  - [Tests](#tests)
    - [Unit Tests](#unit-tests)
    - [Integration Tests](#integration-tests)
  - [Auditing Dependencies](#auditing-dependencies)
  - [Container Scans](#container-scans)

## Deployment

See the [Onboarding guide](Onboarding.md) for running the service locally.

## Docker Image

### Official Packaged Release

This package is available as a pre-built docker image on Docker Hub: [https://hub.docker.com/r/mojaloop/ml-api-adapter](https://hub.docker.com/r/mojaloop/ml-api-adapter)

### Build from Source

You can also build it directly from source: [https://github.com/mojaloop/ml-api-adapter](https://github.com/mojaloop/ml-api-adapter)

However, take note of the default argument in the [Dockerfile](./Dockerfile) for `NODE_VERSION`:

```dockerfile
ARG NODE_VERSION=lts-alpine
```

It is recommend that you set the `NODE_VERSION` argument against the version set in the local [.nvmrc](./.nvmrc).

This can be done using the following command:

```bash
export NODE_VERSION="$(cat .nvmrc)-alpine"

docker build \
   --build-arg NODE_VERSION=$NODE_VERSION \
   -t mojaloop/ml-api-adapter:local \
   .
```

## Configuration

### Environment variables

The ml api adapter has many options that can be configured through environment variables.

| Environment variable | Description | Example values |
| -------------------- | ----------- | ------ |

## API

For endpoint documentation, see the [API documentation](API.md).

## Logging

Logs are sent to standard output by default.

## Tests

Take a look at the `package.json` file for a full list of the tests available.

### Unit Tests

```bash
npm run test:unit
```

### Integration Tests

```bash
# start docker-compose dependencies
docker-compose up -d

# wait for docker compoments to start
npm run wait-4-docker

# run the integration tests locally
export ENDPOINT_URL=http://localhost:4545/notification
npm run test:int
```

### Running Functional Tests

If you want to run functional tests locally utilizing the [ml-core-test-harness](https://github.com/mojaloop/ml-core-test-harness), you can run the following commands:

```bash
git clone --depth 1 --branch v1.1.0 https://github.com/mojaloop/ml-core-test-harness.git ./IGNORE/ml-core-test-harness
```

```bash
docker build -t mojaloop/ml-api-adapter:local .
```

```bash
cd IGNORE/ml-core-test-harness
export ML_API_ADAPTER_VERSION=local
docker-compose --project-name ttk-func --ansi never --profile all-services --profile ttk-provisioning --profile ttk-tests up -d
```

Monitor the `ttk-func-ttk-tests-1` container for test results, or you can use the following util script to wait for its completion:

```bash
bash wait-for-container.sh ttk-func-ttk-tests-1
```

Check test container logs for test results

Or access TTK UI using the following URI: <http://localhost:9660>

TTK Test files:
    - **Test Collection**: `./IGNORE/ml-core-test-harness/docker/ml-testing-toolkit/test-cases/collections/tests/p2p.json`
    - **Env Config**: `./IGNORE/ml-core-test-harness/docker/ml-testing-toolkit/test-cases/environments/default-env.json`

## Auditing Dependencies

We use `npm-audit-resolver` along with `npm audit` to check dependencies for node vulnerabilities, and keep track of resolved dependencies with an `audit-resolve.json` file.

To start a new resolution process, run:

```bash
npm run audit:resolve
```

You can then check to see if the CI will pass based on the current dependencies with:

```bash
npm run audit:check
```

And commit the changed `audit-resolv.json` to ensure that CircleCI will build correctly.

## Container Scans

As part of our CI/CD process, we use anchore-cli to scan our built docker container for vulnerabilities upon release.

If you find your release builds are failing, refer to the [container scanning](https://github.com/mojaloop/ci-config#container-scanning) in our shared Mojaloop CI config repo. There is a good chance you simply need to update the `mojaloop-policy-generator.js` file and re-run the circleci workflow.

For more information on anchore and anchore-cli, refer to:

- [Anchore CLI](https://github.com/anchore/anchore-cli)
- [Circle Orb Registry](https://circleci.com/orbs/registry/orb/anchore/anchore-engine)
