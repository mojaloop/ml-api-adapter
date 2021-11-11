# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [12.0.0](https://github.com/mojaloop/ml-api-adapter/compare/v11.2.0...v12.0.0) (2021-11-11)


### ⚠ BREAKING CHANGES

* **mojaloop/#2536:** Forcing a major version change for awareness of the config changes. The `LIB_RESOURCE_VERSIONS` env var is now deprecated, and this is now also controlled by the PROTOCOL_VERSIONS config in the default.json. This has been done for consistency between all API services going forward and unifies the config for both inbound and outbound Protocol API validation/transformation features.

### Bug Fixes

* **#2557:** error notification to payer fsp, header for source having  wrong value ([#488](https://github.com/mojaloop/ml-api-adapter/issues/488)) ([42f079f](https://github.com/mojaloop/ml-api-adapter/commit/42f079f10ab30588b9403c5fcfca5f26364701a3)), closes [#2557](https://github.com/mojaloop/ml-api-adapter/issues/2557)
* **mojaloop/#2536:** fspiop api version negotiation not handled by transfers service ([#487](https://github.com/mojaloop/ml-api-adapter/issues/487)) ([c4d6b45](https://github.com/mojaloop/ml-api-adapter/commit/c4d6b45605606f06cde0a4cbeb76a9470c76c23b)), closes [mojaloop/#2536](https://github.com/mojaloop/ml-api-adapter/issues/2536) [mojaloop/#2536](https://github.com/mojaloop/ml-api-adapter/issues/2536)
