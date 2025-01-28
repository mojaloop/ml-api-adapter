# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [16.0.2](https://github.com/mojaloop/ml-api-adapter/compare/v16.0.1...v16.0.2) (2025-01-28)


### Chore

* maintenance updates ([#572](https://github.com/mojaloop/ml-api-adapter/issues/572)) ([57f1e68](https://github.com/mojaloop/ml-api-adapter/commit/57f1e68ab314eacfa779a0bb65ee7a378397a17b))

### [16.0.1](https://github.com/mojaloop/ml-api-adapter/compare/v16.0.0...v16.0.1) (2025-01-20)


### Chore

* bump deps for date validation ([#571](https://github.com/mojaloop/ml-api-adapter/issues/571)) ([999ad03](https://github.com/mojaloop/ml-api-adapter/commit/999ad031b8080810f34e06f8506cbe26ac0ad63e))

## [16.0.0](https://github.com/mojaloop/ml-api-adapter/compare/v15.0.1...v16.0.0) (2025-01-18)


### ⚠ BREAKING CHANGES

* add option to handle iso20022 requests (#564)

### Features

* add option to handle iso20022 requests ([#564](https://github.com/mojaloop/ml-api-adapter/issues/564)) ([2dea0bd](https://github.com/mojaloop/ml-api-adapter/commit/2dea0bd391f6453e8a340832f448e60958f5ab64)), closes [mojaloop/#3574](https://github.com/mojaloop/project/issues/3574)

### [15.0.1](https://github.com/mojaloop/ml-api-adapter/compare/v15.0.0...v15.0.1) (2025-01-09)


### Chore

* fix vulnerabilities, update deps ([#570](https://github.com/mojaloop/ml-api-adapter/issues/570)) ([6da93a9](https://github.com/mojaloop/ml-api-adapter/commit/6da93a9941991d7ef512b54bb2786c2c111a8bed))

## [15.0.0](https://github.com/mojaloop/ml-api-adapter/compare/v14.0.7...v15.0.0) (2024-12-06)


### ⚠ BREAKING CHANGES

* fx and interscheme implementation (#534)

### Features

* fx and interscheme implementation ([#534](https://github.com/mojaloop/ml-api-adapter/issues/534)) ([b270825](https://github.com/mojaloop/ml-api-adapter/commit/b270825ed0f16760d8ffa5acb43063bb980177fc)), closes [mojaloop/#3574](https://github.com/mojaloop/project/issues/3574)

### [14.0.7](https://github.com/mojaloop/ml-api-adapter/compare/v14.0.6...v14.0.7) (2024-06-11)


### Chore

* dependency updates to address security patches ([#528](https://github.com/mojaloop/ml-api-adapter/issues/528)) ([29a8caa](https://github.com/mojaloop/ml-api-adapter/commit/29a8caad4394407698637a06334da11e62b494d4))
* **deps:** Bump @apidevtools/json-schema-ref-parser from 11.1.0 to 11.6.2 ([#526](https://github.com/mojaloop/ml-api-adapter/issues/526)) ([035e9b1](https://github.com/mojaloop/ml-api-adapter/commit/035e9b147dcc14641ecde5c8c49bf9f9d065f3fb))

### [14.0.6](https://github.com/mojaloop/ml-api-adapter/compare/v14.0.5...v14.0.6) (2024-05-17)


### Bug Fixes

* stack-overflow and date validation ([#525](https://github.com/mojaloop/ml-api-adapter/issues/525)) ([38d79b1](https://github.com/mojaloop/ml-api-adapter/commit/38d79b1ee5be6c16d163b897e850980e0dc0d3ab))

### [14.0.5](https://github.com/mojaloop/ml-api-adapter/compare/v14.0.4...v14.0.5) (2023-11-07)


### Bug Fixes

* **mojaloop/#3615:** upgrade dependencies ([#516](https://github.com/mojaloop/ml-api-adapter/issues/516)) ([87084d3](https://github.com/mojaloop/ml-api-adapter/commit/87084d3ecc4d734dc3724880e41644d546e56a62)), closes [mojaloop/#3615](https://github.com/mojaloop/project/issues/3615)


### Chore

* added .versionrc [skip ci] ([#515](https://github.com/mojaloop/ml-api-adapter/issues/515)) ([7126728](https://github.com/mojaloop/ml-api-adapter/commit/7126728a4a952befb31650f37a7ea7641ea1a436))

### [14.0.4](https://github.com/mojaloop/ml-api-adapter/compare/v14.0.3...v14.0.4) (2023-09-04)

### [14.0.3](https://github.com/mojaloop/ml-api-adapter/compare/v14.0.2...v14.0.3) (2023-09-04)

### [14.0.2](https://github.com/mojaloop/ml-api-adapter/compare/v14.0.1...v14.0.2) (2023-08-28)


### Bug Fixes

* **mojaloop/#3470:** pull in performance improved central-services-shared ([#512](https://github.com/mojaloop/ml-api-adapter/issues/512)) ([ca37d10](https://github.com/mojaloop/ml-api-adapter/commit/ca37d101510e5354e11f6f6be09144644109a00a)), closes [mojaloop/#3470](https://github.com/mojaloop/project/issues/3470)

### [14.0.1](https://github.com/mojaloop/ml-api-adapter/compare/v14.0.0...v14.0.1) (2023-08-11)


### Bug Fixes

* change consume message log line to debug ([#510](https://github.com/mojaloop/ml-api-adapter/issues/510)) ([95d20ae](https://github.com/mojaloop/ml-api-adapter/commit/95d20aed82477e804df5c11c7368b70bc276ee26))

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
