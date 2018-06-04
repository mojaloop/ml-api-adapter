# ml-api-adapter

The ml api adapter is a series of services that facilitate clearing and settlement of transfers between DFSPs, including the following functions:

- Brokering real-time messaging for funds clearing
- Maintaining net positions for a deferred net settlement
- Propagating scheme-level and off-transfer fees

The following documentation represents the services, APIs and endpoints responsible for various ledger functions.

Contents:

- [Deployment](#deployment)
- [Configuration](#configuration)
- [API](#api)
- [Logging](#logging)
- [Tests](#tests)

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

Tests include unit, functional, and integration. 

Running the tests:


    npm run test:all


Tests include code coverage via istanbul. See the test/ folder for testing scripts.
