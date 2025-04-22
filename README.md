# ml-api-adapter

[![Git Commit](https://img.shields.io/github/last-commit/mojaloop/ml-api-adapter.svg?style=flat)](https://github.com/mojaloop/ml-api-adapter/commits/main)
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

This can be done using the following command: `npm run docker:build`

Or via docker build directly:

```bash
docker build \
  --build-arg NODE_VERSION="$(cat .nvmrc)-alpine" \
  -t mojaloop/ml-api-adapter:local \
  .
```

## Deployment

See the [Onboarding guide](Onboarding.md) for running the service locally.

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
docker build -t mojaloop/ml-api-adapter:local .
```

```bash
npm run test:functional
```

By default this will clone the [ml-core-test-harness](https://github.com/mojaloop/ml-core-test-harness) into `$ML_CORE_TEST_HARNESS_DIR`.

See default values as specified in the [test-functional.sh](./test/scripts/test-functional.sh) script.

Check test container logs for test results into `$ML_CORE_TEST_HARNESS_DIR` directory.

If you want to not have the [ml-core-test-harness](https://github.com/mojaloop/ml-core-test-harness) shutdown automatically by the script, make sure you set the following env var `export ML_CORE_TEST_SKIP_SHUTDOWN=true`.

By doing so, you are then able access TTK UI using the following URI: <http://localhost:9660>.

Or alternatively, you can monitor the `ttk-func-ttk-tests-1` (See `ML_CORE_TEST_HARNESS_TEST_FUNC_CONT_NAME` in the [test-functional.sh](./test/scripts/test-functional.sh) script) container for test results with the following command:

```bash
docker logs -f ttk-func-ttk-tests-1
```

TTK Test files:

- **Test Collection**: `$ML_CORE_TEST_HARNESS_DIR/docker/ml-testing-toolkit/test-cases/collections/tests/p2p.json`
- **Env Config**: `$ML_CORE_TEST_HARNESS_DIR//docker/ml-testing-toolkit/test-cases/environments/default-env.json`

Configuration modifiers:

- **ml-api-adapter**: [./docker/config-modifier/ml-api-adapter.js](./docker/config-modifier/ml-api-adapter.js)

## Auditing Dependencies

We use `audit-ci` along with `npm audit` to check dependencies for node vulnerabilities, and keep track of resolved dependencies with an `audit-ci.jsonc` file.

To start a new resolution process, run:

```bash
npm run audit:fix
```

You can then check to see if the CI will pass based on the current dependencies with:

```bash
npm run audit:check
```

The [audit-ci.jsonc](./audit-ci.jsonc) contains any audit-exceptions that cannot be fixed to ensure that CircleCI will build correctly.

## Container Scans

As part of our CI/CD process, we use grype a vulnerability scanner for container images and filesystems upon release.

If you find your release builds are failing, please review Mojaloop orb with grype image scan at [container scanning](https://github.com/mojaloop/ci-config-orb-build?tab=readme-ov-file#vulnerability-image-scan-configuration) and review [grype_image_scan.yml](https://github.com/mojaloop/ci-config-orb-build/blob/main/src/jobs/grype_image_scan.yml) job.

For more information on grype, refer to:

- [Grype](https://github.com/anchore/grype)
