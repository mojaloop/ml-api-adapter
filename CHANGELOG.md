# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [12.3.0](https://github.com/mojaloop/ml-api-adapter/compare/v12.2.0...v12.3.0) (2022-02-25)


### Features

* added ssl Support ([#494](https://github.com/mojaloop/ml-api-adapter/issues/494)) ([86cf167](https://github.com/mojaloop/ml-api-adapter/commit/86cf167de454d24422109c2c425491ed182a2789))

## [12.2.0](https://github.com/mojaloop/ml-api-adapter/compare/v12.1.0...v12.2.0) (2022-02-22)


### Features

* **mojaloop/project#2556:** implement patch notification for failure scenarios ([#492](https://github.com/mojaloop/ml-api-adapter/issues/492)) ([026f764](https://github.com/mojaloop/ml-api-adapter/commit/026f764e26f8e9caefb1b0d222469aadad326a6c)), closes [mojaloop/project#2556](https://github.com/mojaloop/project/issues/2556) [#2697](https://github.com/mojaloop/ml-api-adapter/issues/2697)

## [12.1.0](https://github.com/mojaloop/ml-api-adapter/compare/v12.0.0...v12.1.0) (2021-12-14)


### Features

* **mojaloop/#2608:** injected resource versions config for outbound requests ([#490](https://github.com/mojaloop/ml-api-adapter/issues/490)) ([d46a05b](https://github.com/mojaloop/ml-api-adapter/commit/d46a05ba3d0573ad84beaca60667b1aa1d4b0445)), closes [mojaloop/#2608](https://github.com/mojaloop/ml-api-adapter/issues/2608)

## [12.0.0](https://github.com/mojaloop/ml-api-adapter/compare/v11.2.0...v12.0.0) (2021-11-11)


### ⚠ BREAKING CHANGES

* **mojaloop/#2536:** Forcing a major version change for awareness of the config changes. The `LIB_RESOURCE_VERSIONS` env var is now deprecated, and this is now also controlled by the PROTOCOL_VERSIONS config in the default.json. This has been done for consistency between all API services going forward and unifies the config for both inbound and outbound Protocol API validation/transformation features.

### Bug Fixes

* **#2557:** error notification to payer fsp, header for source having  wrong value ([#488](https://github.com/mojaloop/ml-api-adapter/issues/488)) ([42f079f](https://github.com/mojaloop/ml-api-adapter/commit/42f079f10ab30588b9403c5fcfca5f26364701a3)), closes [#2557](https://github.com/mojaloop/ml-api-adapter/issues/2557)
* **mojaloop/#2536:** fspiop api version negotiation not handled by transfers service ([#487](https://github.com/mojaloop/ml-api-adapter/issues/487)) ([c4d6b45](https://github.com/mojaloop/ml-api-adapter/commit/c4d6b45605606f06cde0a4cbeb76a9470c76c23b)), closes [mojaloop/#2536](https://github.com/mojaloop/ml-api-adapter/issues/2536) [mojaloop/#2536](https://github.com/mojaloop/ml-api-adapter/issues/2536)
