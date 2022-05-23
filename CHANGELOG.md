# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [14.0.0](https://github.com/mojaloop/ml-api-adapter/compare/v13.0.0...v14.0.0) (2022-05-23)


### ⚠ BREAKING CHANGES

* **mojaloop/#2092:** Major version bump for node v16 LTS support, re-structuring of project directories to align to core Mojaloop repositories and docker image now uses `/opt/app` instead of `/opt/ml-api-adapter` which will impact config/secret mounts.

### Features

* **mojaloop/#2092:** upgrade nodeJS version for core services ([#501](https://github.com/mojaloop/ml-api-adapter/issues/501)) ([bcf0b6d](https://github.com/mojaloop/ml-api-adapter/commit/bcf0b6d021e04ac36e28cfea1d92c2056b590026)), closes [mojaloop/#2092](https://github.com/mojaloop/project/issues/2092)

## [13.0.0](https://github.com/mojaloop/ml-api-adapter/compare/v12.3.0...v13.0.0) (2022-03-03)


### ⚠ BREAKING CHANGES

* **mojaloop/#2704:** - Config PROTOCOL_VERSIONS.CONTENT has now been modified to support backward compatibility for minor versions (i.e. v1.0 & 1.1) as follows:

> ```
>   "PROTOCOL_VERSIONS": {
>     "CONTENT": "1.1", <-- used when generating messages from the "SWITCH", and validate incoming FSPIOP API requests/callbacks CONTENT-TYPE headers
>     "ACCEPT": {
>       "DEFAULT": "1", <-- used when generating messages from the "SWITCH"
>       "VALIDATELIST": [ <-- used to validate incoming FSPIOP API requests/callbacks ACCEPT headers
>         "1",
>         "1.0",
>         "1.1"
>       ]
>     }
>   },
> ```
> 
> to be consistent with the ACCEPT structure as follows:
> 
> ```
>   "PROTOCOL_VERSIONS": {
>     "CONTENT": {
>       "DEFAULT": "1.1", <-- used when generating messages from the "SWITCH"
>       "VALIDATELIST": [ <-- used to validate incoming FSPIOP API requests/callbacks CONTENT-TYPE headers
>         "1.1",
>         "1.0"
>       ]
>     },
>     "ACCEPT": {
>       "DEFAULT": "1", <-- used when generating messages from the "SWITCH"
>       "VALIDATELIST": [ <-- used to validate incoming FSPIOP API requests/callbacks ACCEPT headers
>         "1",
>         "1.0",
>         "1.1"
>       ]
>     }
>   },
> ```

### Features

* **mojaloop/#2704:** core-services support for non-breaking backward api compatibility ([#496](https://github.com/mojaloop/ml-api-adapter/issues/496)) ([5928511](https://github.com/mojaloop/ml-api-adapter/commit/5928511dcb9780d8c9751bc22322e1f0331ef6e3)), closes [mojaloop/#2704](https://github.com/mojaloop/project/issues/\2704)

## [12.3.0](https://github.com/mojaloop/ml-api-adapter/compare/v12.2.0...v12.3.0) (2022-02-25)


### Features

* added ssl Support ([#494](https://github.com/mojaloop/ml-api-adapter/issues/494)) ([86cf167](https://github.com/mojaloop/ml-api-adapter/commit/86cf167de454d24422109c2c425491ed182a2789))

## [12.2.0](https://github.com/mojaloop/ml-api-adapter/compare/v12.1.0...v12.2.0) (2022-02-22)


### Features

* **mojaloop/project#2556:** implement patch notification for failure scenarios ([#492](https://github.com/mojaloop/ml-api-adapter/issues/492)) ([026f764](https://github.com/mojaloop/ml-api-adapter/commit/026f764e26f8e9caefb1b0d222469aadad326a6c)), closes [mojaloop/project#2556](https://github.com/mojaloop/project/issues/2556) [#2697](https://github.com/mojaloop/ml-api-adapter/issues/2697)

## [12.1.0](https://github.com/mojaloop/ml-api-adapter/compare/v12.0.0...v12.1.0) (2021-12-14)


### Features

* **mojaloop/#2608:** injected resource versions config for outbound requests ([#490](https://github.com/mojaloop/ml-api-adapter/issues/490)) ([d46a05b](https://github.com/mojaloop/ml-api-adapter/commit/d46a05ba3d0573ad84beaca60667b1aa1d4b0445)), closes [mojaloop/#2608](https://github.com/mojaloop/project/issues/\2608)

## [12.0.0](https://github.com/mojaloop/ml-api-adapter/compare/v11.2.0...v12.0.0) (2021-11-11)


### ⚠ BREAKING CHANGES

* **mojaloop/#2536:** Forcing a major version change for awareness of the config changes. The `LIB_RESOURCE_VERSIONS` env var is now deprecated, and this is now also controlled by the PROTOCOL_VERSIONS config in the default.json. This has been done for consistency between all API services going forward and unifies the config for both inbound and outbound Protocol API validation/transformation features.

### Bug Fixes

* **#2557:** error notification to payer fsp, header for source having  wrong value ([#488](https://github.com/mojaloop/ml-api-adapter/issues/488)) ([42f079f](https://github.com/mojaloop/ml-api-adapter/commit/42f079f10ab30588b9403c5fcfca5f26364701a3)), closes [#2557](https://github.com/mojaloop/ml-api-adapter/issues/2557)
* **mojaloop/#2536:** fspiop api version negotiation not handled by transfers service ([#487](https://github.com/mojaloop/ml-api-adapter/issues/487)) ([c4d6b45](https://github.com/mojaloop/ml-api-adapter/commit/c4d6b45605606f06cde0a4cbeb76a9470c76c23b)), closes [mojaloop/#2536](https://github.com/mojaloop/project/issues/\2536)
