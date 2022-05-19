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
      - [Mac users and standard Python:](#mac-users-and-standard-python)
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

#### Mac users and standard Python:

There is a need to have proper version of python 3, elsewhere `npm install` command will fail. By default, on your Mac, you have python 2.7.* installed, you need to have fresh 3.* version.

```bash
brew install python
```

To invoke proper version of Python, you have to update your PATH env variable in your shell profile.

For `~/.zshrc`

```bash
echo 'export PATH="/usr/local/opt/python/libexec/bin:$PATH"' >> ~/.zshrc 
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
