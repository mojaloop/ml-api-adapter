# ML API ADAPTER API
***

The ml api adapter has an API for handling transfers and FX transfers.

#### [DFSP API](#dfsp-api) endpoints
* `POST` [**Prepare transfer**](#prepare-transfer)
* `PUT` [**Fulfill transfer**](#fulfill-transfer)
* `PATCH` [**Patch transfer update**](#patch-transfer-update)
* `PUT` [**Transfer error callback**](#transfer-error-callback)
* `POST` [**Prepare FX transfer**](#prepare-fx-transfer)
* `PUT` [**Fulfill FX transfer**](#fulfill-fx-transfer)
* `PATCH` [**Patch FX transfer update**](#patch-fx-transfer-update)
* `PUT` [**FX transfer error callback**](#fx-transfer-error-callback)
* `GET` [**Health**](#health)

The API endpoints often deal with these [data structures](#data-structures):

* [**Transfer Object**](#transfer-object)
* [**Fulfil Object**](#fulfil-object)
* [**Patch Transfer Object**](#patch-transfer-object)
* [**FX Transfer Object**](#fx-transfer-object)
* [**Patch FX Transfer Object**](#patch-fx-transfer-object)

Information about various errors returned can be found here:
* [**Error Information**](#error-information)

For the most accurate schema definitions, refer to:
* [**api-swagger.yaml**](/Users/yewintnaing/Documents/Development_Projects/mojaloop/ml-api-adapter/src/interface/api-swagger.yaml)
* [**api-swagger-iso20022-transfers.yaml**](/Users/yewintnaing/Documents/Development_Projects/mojaloop/ml-api-adapter/src/interface/api-swagger-iso20022-transfers.yaml)
* [**fspiop-rest-v2.0-ISO20022_transfers.yaml**](/Users/yewintnaing/Documents/Development_Projects/mojaloop/ml-api-adapter/src/interface/fspiop-rest-v2.0-ISO20022_transfers.yaml)

***

## DFSP API

#### Prepare transfer
The prepare transfer endpoint will publish a prepare transfer event to Kafka. A transfer between two DFSPs must be prepared before it can be fulfilled.

##### HTTP Request
`POST http://ml-api-adapter/transfers/`

##### Headers
| Field | Type | Description |
| ----- | ---- | ----------- |
| Content-Type | String | Must be set to the Mojaloop transfer media type, for example `application/vnd.interoperability.transfers+json;version=1.1` |
| Accept | String | Must be set to the expected Mojaloop response media type |
| Content-Length | Integer | *Optional* |
| Date | DateTime | Date of the initial request |
| x-forwarded-for | String | *Optional* |
| fspiop-source | String | Must be set to the correct source |
| fspiop-destination | String | *Optional* |
| fspiop-encryption | String | *Optional* |
| fspiop-signature | String | *Optional* |
| fspiop-uri | String | *Optional* |
| fspiop-http-method | String | *Optional* |

##### Request body
| Field | Type | Description |
| ----- | ---- | ----------- |
| Object | Transfer | A [Transfer object](#transfer-object) to describe the transfer that should take place. |

##### Response 202 Accepted
| Field | Type | Description |
| ----- | ---- | ----------- |

##### Request
``` http
POST http://ml-api-adapter/transfers/ HTTP/1.1
Content-Type: application/vnd.interoperability.transfers+json;version=1.1
Accept: application/vnd.interoperability.transfers+json;version=1.1
Date: 2018-04-25
fspiop-source: dfsp1
{
   "transferId":"b51ec534-ee48-4575-b6a9-ead2955b8069",
   "payerFsp":"dfsp1",
   "payeeFsp":"dfsp2",
   "amount":{
      "currency":"USD",
      "amount":"123.45"
   },
   "ilpPacket":"AYIBgQAAAAAAAASwNGxldmVsb25lLmRmc3AxLm1lci45T2RTOF81MDdqUUZERmZlakgyOVc4bXFmNEpLMHlGTFGCAUBQU0svMS4wCk5vbmNlOiB1SXlweUYzY3pYSXBFdzVVc05TYWh3CkVuY3J5cHRpb246IG5vbmUKUGF5bWVudC1JZDogMTMyMzZhM2ItOGZhOC00MTYzLTg0NDctNGMzZWQzZGE5OGE3CgpDb250ZW50LUxlbmd0aDogMTM1CkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvbgpTZW5kZXItSWRlbnRpZmllcjogOTI4MDYzOTEKCiJ7XCJmZWVcIjowLFwidHJhbnNmZXJDb2RlXCI6XCJpbnZvaWNlXCIsXCJkZWJpdE5hbWVcIjpcImFsaWNlIGNvb3BlclwiLFwiY3JlZGl0TmFtZVwiOlwibWVyIGNoYW50XCIsXCJkZWJpdElkZW50aWZpZXJcIjpcIjkyODA2MzkxXCJ9IgA",
   "condition":"f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA",
   "expiration":"2016-05-24T08:38:08.699-04:00"
}
```

##### Response
``` http
HTTP/1.1 202 ACCEPTED
```

#### Fulfill transfer
The fulfill transfer endpoint will publish the fulfil event to Kafka. To successfully fulfill a transfer, make sure the [transfer has previously been prepared.](#prepare-transfer)

##### HTTP Request
`PUT http://ml-api-adapter/transfers/3a2a1d9e-8640-4d2d-b06c-84f2cd613204`

##### Headers
| Field | Type | Description |
| ----- | ---- | ----------- |
| Content-Type | String | Must be set to the Mojaloop transfer media type |
| Accept | String | Must be set to the expected Mojaloop response media type |
| Content-Length | Integer | *Optional* |
| Date | DateTime | Date of the initial request |
| x-forwarded-for | String | *Optional* |
| fspiop-source | String | Must be set to the correct source |
| fspiop-destination | String | *Optional* |
| fspiop-encryption | String | *Optional* |
| fspiop-signature | String | *Optional* |
| fspiop-uri | String | *Optional* |
| fspiop-http-method | String | *Optional* |

##### URL Params
| Field | Type | Description |
| ----- | ---- | ----------- |
| id | String | Transfer UUID |

##### Request Body
| Field | Type | Description |
| ----- | ---- | ----------- |
| Object | Fulfil | The [Fulfil object](#fulfil-object) |

##### Response 202 ACCEPTED
| Field | Type | Description |
| ----- | ---- | ----------- |

##### Request
``` http
PUT http://ml-api-adapter/transfers/3a2a1d9e-8640-4d2d-b06c-84f2cd613204 HTTP/1.1
Content-Type: application/vnd.interoperability.transfers+json;version=1.1
Accept: application/vnd.interoperability.transfers+json;version=1.1
Date: 2018-04-25
fspiop-source: dfsp1
fspiop-destination: dfsp2
{
   "fulfilment":"f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA",
   "transferState":"RECEIVED",
   "completedTimestamp":"2016-05-24T08:38:08.699-04:00"
}
```

##### Response
``` http
HTTP/1.1 202 ACCEPTED
```

#### Patch transfer update
The patch transfer endpoint is used by a Switch to update the state of a previously reserved transfer once the Switch has completed processing of the transfer. This request does not generate a callback.

##### HTTP Request
`PATCH http://ml-api-adapter/transfers/3a2a1d9e-8640-4d2d-b06c-84f2cd613204`

##### Headers
| Field | Type | Description |
| ----- | ---- | ----------- |
| Content-Type | String | Must be set to the Mojaloop transfer media type |
| Accept | String | Must be set to the expected Mojaloop response media type |
| Content-Length | Integer | *Optional* |
| Date | DateTime | Date of the initial request |
| fspiop-source | String | Typically the Switch when used as a callback |
| fspiop-destination | String | Receiving DFSP |

##### URL Params
| Field | Type | Description |
| ----- | ---- | ----------- |
| id | String | Transfer UUID |

##### Request Body
| Field | Type | Description |
| ----- | ---- | ----------- |
| Object | Patch Transfer | The [Patch Transfer object](#patch-transfer-object) |

##### Response 200 OK
| Field | Type | Description |
| ----- | ---- | ----------- |

##### Notes
The adapter currently sends the HTTP method as `PATCH`, but endpoint resolution reuses the configured transfer `PUT` callback URL. DFSP callback resources should therefore accept the switch's `PATCH` update on the transfer callback path.

#### Transfer error callback
The transfer error callback endpoint is used to provide an error response for a transfer.

##### HTTP Request
`PUT http://ml-api-adapter/transfers/3a2a1d9e-8640-4d2d-b06c-84f2cd613204/error`

##### Headers
| Field | Type | Description |
| ----- | ---- | ----------- |
| Content-Type | String | Must be set to the Mojaloop transfer error media type |
| Accept | String | Must be set to the expected Mojaloop response media type |
| Content-Length | Integer | *Optional* |
| Date | DateTime | Date of the initial request |
| fspiop-source | String | Must be set to the correct source |
| fspiop-destination | String | *Optional* |

##### URL Params
| Field | Type | Description |
| ----- | ---- | ----------- |
| id | String | Transfer UUID |

##### Request Body
| Field | Type | Description |
| ----- | ---- | ----------- |
| Object | Error Information | The [Error Information](#error-information) payload |

##### Response 202 ACCEPTED
| Field | Type | Description |
| ----- | ---- | ----------- |

#### Prepare FX transfer
The prepare FX transfer endpoint will publish an FX transfer event to Kafka.

##### HTTP Request
`POST http://ml-api-adapter/fxTransfers/`

##### Headers
| Field | Type | Description |
| ----- | ---- | ----------- |
| Content-Type | String | Must be set to the Mojaloop FX transfer media type, for example `application/vnd.interoperability.fxTransfers+json;version=2.0` |
| Accept | String | Must be set to the expected Mojaloop response media type |
| Content-Length | Integer | *Optional* |
| Date | DateTime | Date of the initial request |
| fspiop-source | String | Must be set to the correct source |
| fspiop-destination | String | *Optional* |

##### Response 202 ACCEPTED
| Field | Type | Description |
| ----- | ---- | ----------- |

#### Fulfill FX transfer
The fulfill FX transfer endpoint returns or fulfils FX transfer information for a given `commitRequestId`.

##### HTTP Request
`PUT http://ml-api-adapter/fxTransfers/3a2a1d9e-8640-4d2d-b06c-84f2cd613204`

##### Headers
| Field | Type | Description |
| ----- | ---- | ----------- |
| Content-Type | String | Must be set to the Mojaloop FX transfer media type |
| Accept | String | Must be set to the expected Mojaloop response media type |
| Content-Length | Integer | *Optional* |
| Date | DateTime | Date of the initial request |
| fspiop-source | String | Must be set to the correct source |
| fspiop-destination | String | *Optional* |

##### URL Params
| Field | Type | Description |
| ----- | ---- | ----------- |
| id | String | FX commit request UUID |

##### Response 202 ACCEPTED
| Field | Type | Description |
| ----- | ---- | ----------- |

#### Patch FX transfer update
The patch FX transfer endpoint is used by the Switch to notify the requester of the final determination of an FX transfer. This request does not generate a callback.

##### HTTP Request
`PATCH http://ml-api-adapter/fxTransfers/3a2a1d9e-8640-4d2d-b06c-84f2cd613204`

##### Headers
| Field | Type | Description |
| ----- | ---- | ----------- |
| Content-Type | String | Must be set to the Mojaloop FX transfer media type |
| Accept | String | Must be set to the expected Mojaloop response media type |
| Content-Length | Integer | *Optional* |
| Date | DateTime | Date of the initial request |
| fspiop-source | String | Typically the Switch when used as a callback |
| fspiop-destination | String | Receiving DFSP |

##### URL Params
| Field | Type | Description |
| ----- | ---- | ----------- |
| id | String | FX commit request UUID |

##### Request Body
| Field | Type | Description |
| ----- | ---- | ----------- |
| Object | Patch FX Transfer | The [Patch FX Transfer object](#patch-fx-transfer-object) |

##### Response 200 OK
| Field | Type | Description |
| ----- | ---- | ----------- |

##### Notes
The adapter currently sends the HTTP method as `PATCH`, but endpoint resolution reuses the configured FX transfer `PUT` callback URL.

#### FX transfer error callback
The FX transfer error callback endpoint is used to provide an error response for an FX transfer.

##### HTTP Request
`PUT http://ml-api-adapter/fxTransfers/3a2a1d9e-8640-4d2d-b06c-84f2cd613204/error`

##### URL Params
| Field | Type | Description |
| ----- | ---- | ----------- |
| id | String | FX commit request UUID |

##### Response 202 ACCEPTED
| Field | Type | Description |
| ----- | ---- | ----------- |

#### Health
Get the current status of the service

##### HTTP Request
`GET http://ml-api-adapter/health`

##### Response 200 OK
| Field | Type | Description |
| ----- | ---- | ----------- |
| status | String | The status of the ml-api-adapter, *OK* if the service is working |

##### Request
``` http
GET http://ml-api-adapter/health HTTP/1.1
```

##### Response
``` http
HTTP/1.1 200 OK
{
  "status": "OK"
}
```

***

## Data Structures

### Transfer Object

A transfer represents money being moved between two DFSP accounts at the central ledger.

| Name | Type | Description |
| ---- | ---- | ----------- |
| transferId | GUID | Id of the transfer |
| payerFsp | String | The sender |
| payeeFsp | String | The receiver |
| amount | Object | Amount and currency information of the transfer |
| amount.currency | String | Currency information of the transfer |
| amount.amount | String | Amount as decimal |
| ilpPacket | String | ILP packet |
| condition | String | The condition for executing the transfer |
| expiration | DateTime | Time when the transfer expires |
| extensionList | Object | *Optional* Additional extension list |

### Fulfil Object

A fulfil represents the fulfilment of a transfer.

| Name | Type | Description |
| ---- | ---- | ----------- |
| fulfilment | String | Fulfilment condition |
| transferState | String | The state of the transfer |
| completedTimestamp | DateTime | The time when the fulfilment was complete |
| extensionList | Object | *Optional* Additional extension list |

### Patch Transfer Object

A patch transfer object represents a switch-generated transfer state update.

| Name | Type | Description |
| ---- | ---- | ----------- |
| transferId | GUID | Id of the transfer |
| completedTimestamp | DateTime | Time when the switch completed processing |
| transferState | String | Updated transfer state, for example `ABORTED` |
| extensionList | Object | *Optional* Additional extension list |

### FX Transfer Object

An FX transfer object represents a request or response related to currency conversion transfer handling.

| Name | Type | Description |
| ---- | ---- | ----------- |
| commitRequestId | GUID | Id of the FX transfer request |
| determiningTransferId | GUID | The related determining transfer |
| sourceAmount | Object | Source amount information |
| targetAmount | Object | Target amount information |
| condition | String | Execution condition |
| expiration | DateTime | Expiration timestamp |

### Patch FX Transfer Object

A patch FX transfer object represents a switch-generated FX transfer state update.

| Name | Type | Description |
| ---- | ---- | ----------- |
| commitRequestId | GUID | Id of the FX transfer request |
| completedTimestamp | DateTime | Time when the switch completed processing |
| transferState | String | Updated transfer state |
| extensionList | Object | *Optional* Additional extension list |

***

## Error Information

This section identifies the potential errors returned and the structure of the response.

An error object commonly contains the following fields:

| Name | Type | Description |
| ---- | ---- | ----------- |
| errorInformation | Object | Error wrapper |
| errorInformation.errorCode | String | Mojaloop error code |
| errorInformation.errorDescription | String | Description of the error |
| errorInformation.extensionList | Object | *Optional* Additional details |

Common validation failures include:

| Field | Description |
| ----- | ----------- |
| Missing headers | Required headers such as `Accept` or `Date` are not present |
| Invalid media types | `Content-Type` or `Accept` does not match the expected Mojaloop resource media type |
| Invalid route ids | Transfer ids or commit request ids are not valid UUIDs |
| Invalid request bodies | Request payloads do not satisfy the OpenAPI schema |
