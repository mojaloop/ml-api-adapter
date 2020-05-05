# ML API ADAPTER API
***

The ml api adapter has an API for handling the transfers.

#### [DFSP API](#dfsp-api) endpoints
* `POST` [**Prepare transfer**](#prepare-transfer) 
* `PUT` [**Fulfill transfer**](#fulfill-transfer)
* `GET`  [**Health**](#health)

The API endpoints often deal with these [data structures](#data-structures): 

* [**Transfer Object**](#transfer-object)

Information about various errors returned can be found here:
* [**Error Information**](#error-information)

***

## DFSP API

#### Prepare transfer
The prepare transfer endpoint will publish prepare transfer event to kafka topic. A transfer between two DFSPs must be prepared before it can be fulfilled. 

##### HTTP Request
`POST http://ml-api-adapter/transfers/`

##### Headers
| Field | Type | Description |
| ----- | ---- | ----------- |
| Content-Type | String | Must be set to `application/json` |
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
Content-Type: application/json
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
   "expiration":"2016-05-24T08:38:08.699-04:00",
   "extensionList":{  
      "extension":[  
         {  
            "key":"errorDescription",
            "value":"This is a more detailed error description"
         },
         {  
            "key":"errorDescription",
            "value":"This is a more detailed error description"
         }
      ]
   }
}
```

##### Response
``` http
HTTP/1.1 202 ACCEPTED
```

##### Errors (5xx)
| Field | Description |
| ----- | ----------- |
| InternalServerError | An internal server error occurred |
``` http
{
  "id": "InternalServerError",
  "message": "An internal server error occurred"
}
```

#### Fulfill transfer 
The fulfill transfer endpoint will publish the fulfil event to kafka. To successfully fulfill a transfer, make sure the [transfer has previously been prepared.](#prepare-transfer) 

##### HTTP Request
`PUT http://ml-api-adapter/transfers/3a2a1d9e-8640-4d2d-b06c-84f2cd613204`

##### Headers
| Field | Type | Description |
| ----- | ---- | ----------- |
| Content-Type | String | Must be set to `application/json` |
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
| Object | Fulfil | The [Fulfil object](#fulfil-object)  |

##### Response 202 ACCEPTED
| Field | Type | Description |
| ----- | ---- | ----------- |

##### Request
``` http
PUT http://ml-api-adapter/transfers/3a2a1d9e-8640-4d2d-b06c-84f2cd613204 HTTP/1.1
Content-Type: application/json
Date: 2018-04-25
fspiop-source: dfsp1
fspiop-destination: dfsp2
{  
   "fulfilment":"f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA",
   "transferState":"RECEIVED",
   "completedTimestamp":"2016-05-24T08:38:08.699-04:00",
   "extensionList":{  
      "extension":[  
         {  
            "key":"errorDescription",
            "value":"This is a more detailed error description"
         },
         {  
            "key":"errorDescription",
            "value":"This is a more detailed error description"
         }
      ]
   }
}

```

##### Response
``` http
HTTP/1.1 202 ACCEPTED
```

##### Errors (5xx)
| Field | Description |
| ----- | ----------- |
| InternalServerError | An internal server error occurred |
``` http
{
  "id": "InternalServerError",
  "message": "An internal server error occurred"
}
```

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

Some fields are Read-only, meaning they are set by the API and cannot be modified by clients. A transfer object can have the following fields:

| Name | Type | Description |
| ---- | ---- | ----------- |
| transferId   | GUID | Id of the transfer |
| payerFsp | String | The sender |
| payeeFsp | String | The receiver |
| amount | Object | Amount and currency information of the transfer |
| amount.currency | String | Currency information of the transfer |
| amount.amount | String | Amount as decimal |
| ilpPacket | String | ILP packet |
| condition | String | The condition for executing the transfer | 
| expiration | DateTime | Time when the transfer expires. If the transfer has not executed by this time, the transfer is canceled. |
| extensionList | Object | *Optional* Additional extension list |
| extensionList.extension | Array | each extension object |
| extensionList.extension[].key | String | Error Description |
| extensionList.extension[].value | String | Detailed Error Description |

### Fulfil Object

A fulfil represents the fulfil of a transfer.

Some fields are Read-only, meaning they are set by the API and cannot be modified by clients. A fulfil object can have the following fields:

| Name | Type | Description |
| ---- | ---- | ----------- |
| fulfilment   | String | fulfilment condition |
| transferState | String | The state of the transfer |
| completedTimestamp | DateTime | The time when the fulfilment was complete |
| extensionList | Object | *Optional* Additional extension list |
| extensionList.extension | Array | each extension object |
| extensionList.extension[].key | String | Error Description |
| extensionList.extension[].value | String | Detailed Error Description |

***

## Error Information

This section identifies the potential errors returned and the structure of the response.

An error object can have the following fields:

| Name | Type | Description |
| ---- | ---- | ----------- |
| id | String | An identifier for the type of error |
| message | String | A message describing the error that occurred |
| validationErrors | Array | *Optional* An array of validation errors |
| validationErrors[].message | String | A message describing the validation error |
| validationErrors[].params | Object | An object containing the field that caused the validation error |
| validationErrors[].params.key | String | The name of the field that caused the validation error |
| validationErrors[].params.value | String | The value that caused the validation error |
| validationErrors[].params.child | String | The name of the child field |
