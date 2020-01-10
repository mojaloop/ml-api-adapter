/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>
 --------------
 ******/

'use strict'

const Test = require('tape')
const Base = require('../../base')

Test('return error if required fields are missing on prepare', async function (assert) {
  const req = Base.buildRequest({ url: '/transfers', method: 'POST', payload: {}, headers: { date: 'Mon, 10 Sep 2018 20:22:01 GMT', 'fspiop-source': 'value', 'content-type': 'application/vnd.interoperability.transfers+json;version=1.0' } })
  const server = await Base.setup()
  const res = await server.inject(req)
  Base.assertBadRequestError(assert, res, 'child "transferId" fails because [transferId is required]. child "payeeFsp" fails because [payeeFsp is required]. child "payerFsp" fails because [payerFsp is required]. child "amount" fails because [amount is required]. child "ilpPacket" fails because [ilpPacket is required]. child "condition" fails because [condition is required]. child "expiration" fails because [expiration is required]')
  await server.stop()
  assert.end()
})

Test('return error if required headers are missing on prepare', async function (assert) {
  const req = Base.buildRequest({ url: '/transfers', method: 'POST', payload: {}, headers: {}, header: () => {} })
  const server = await Base.setup()
  const res = await server.inject(req)
  Base.assertBadRequestError(assert, res, 'child "date" fails because [date is required]. child "fspiop-source" fails because [fspiop-source is required]')
  await server.stop()
  assert.end()
})

Test('return error if transferId is not a guid', async function (assert) {
  const req = Base.buildRequest({
    url: '/transfers',
    method: 'POST',
    payload: { transferId: 'invalid transfer id' },
    headers: { date: 'Mon, 10 Sep 2018 20:22:01 GMT', 'fspiop-source': 'value', 'content-type': 'application/vnd.interoperability.transfers+json;version=1.0' }
  })
  const server = await Base.setup()
  const res = await server.inject(req)
  Base.assertBadRequestError(assert, res, 'child "transferId" fails because [transferId must be a valid GUID]. child "payeeFsp" fails because [payeeFsp is required]. child "payerFsp" fails because [payerFsp is required]. child "amount" fails because [amount is required]. child "ilpPacket" fails because [ilpPacket is required]. child "condition" fails because [condition is required]. child "expiration" fails because [expiration is required]')
  await server.stop()
  assert.end()
})

Test('return error if amount is not a valid amount', async function (assert) {
  const req = Base.buildRequest({
    url: '/transfers',
    method: 'POST',
    payload: {
      transferId: 'b51ec534-ee48-4575-b6a9-ead2955b8069',
      payeeFsp: '1234',
      payerFsp: '5678',
      amount: {
        currency: 'USD',
        amount: 'invalid amount'
      },
      ilpPacket: 'AYIBgQAAAAAAAASwNGxldmVsb25lLmRmc3AxLm1lci45T2RTOF81MDdqUUZERmZlakgyOVc4bXFmNEpLMHlGTFGCAUBQU0svMS4wCk5vbmNlOiB1SXlweUYzY3pYSXBFdzVVc05TYWh3CkVuY3J5cHRpb246IG5vbmUKUGF5bWVudC1JZDogMTMyMzZhM2ItOGZhOC00MTYzLTg0NDctNGMzZWQzZGE5OGE3CgpDb250ZW50LUxlbmd0aDogMTM1CkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvbgpTZW5kZXItSWRlbnRpZmllcjogOTI4MDYzOTEKCiJ7XCJmZWVcIjowLFwidHJhbnNmZXJDb2RlXCI6XCJpbnZvaWNlXCIsXCJkZWJpdE5hbWVcIjpcImFsaWNlIGNvb3BlclwiLFwiY3JlZGl0TmFtZVwiOlwibWVyIGNoYW50XCIsXCJkZWJpdElkZW50aWZpZXJcIjpcIjkyODA2MzkxXCJ9IgA',
      condition: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
      expiration: '2016-05-24T08:38:08.699-04:00',
      extensionList:
      {
        extension:
        [
          {
            key: 'errorDescription',
            value: 'This is a more detailed error description'
          },
          {
            key: 'errorDescription',
            value: 'This is a more detailed error description'
          }
        ]
      }
    },
    headers: { date: 'Mon, 10 Sep 2018 20:22:01 GMT', 'fspiop-source': 'value', 'content-type': 'application/vnd.interoperability.transfers+json;version=1.0' }
  })
  const server = await Base.setup()
  const res = await server.inject(req)
  Base.assertBadRequestError(assert, res, 'child "amount" fails because [child "amount" fails because [amount with value "invalid amount" fails to match the required pattern: /^([0]|([1-9][0-9]{0,17}))([.][0-9]{0,3}[1-9])?$/]]')
  await server.stop()
  assert.end()
})

Test('return error if currency is not a valid ISO 4217 currency code', async function (assert) {
  const req = Base.buildRequest({
    url: '/transfers',
    method: 'POST',
    payload: {
      transferId: 'b51ec534-ee48-4575-b6a9-ead2955b8069',
      payeeFsp: '1234',
      payerFsp: '5678',
      amount: {
        currency: 'invalid currency',
        amount: '123.45'
      },
      ilpPacket: 'AYIBgQAAAAAAAASwNGxldmVsb25lLmRmc3AxLm1lci45T2RTOF81MDdqUUZERmZlakgyOVc4bXFmNEpLMHlGTFGCAUBQU0svMS4wCk5vbmNlOiB1SXlweUYzY3pYSXBFdzVVc05TYWh3CkVuY3J5cHRpb246IG5vbmUKUGF5bWVudC1JZDogMTMyMzZhM2ItOGZhOC00MTYzLTg0NDctNGMzZWQzZGE5OGE3CgpDb250ZW50LUxlbmd0aDogMTM1CkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvbgpTZW5kZXItSWRlbnRpZmllcjogOTI4MDYzOTEKCiJ7XCJmZWVcIjowLFwidHJhbnNmZXJDb2RlXCI6XCJpbnZvaWNlXCIsXCJkZWJpdE5hbWVcIjpcImFsaWNlIGNvb3BlclwiLFwiY3JlZGl0TmFtZVwiOlwibWVyIGNoYW50XCIsXCJkZWJpdElkZW50aWZpZXJcIjpcIjkyODA2MzkxXCJ9IgA',
      condition: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
      expiration: '2016-05-24T08:38:08.699-04:00',
      extensionList:
      {
        extension:
        [
          {
            key: 'errorDescription',
            value: 'This is a more detailed error description'
          },
          {
            key: 'errorDescription',
            value: 'This is a more detailed error description'
          }
        ]
      }
    },
    headers: { date: 'Mon, 10 Sep 2018 20:22:01 GMT', 'fspiop-source': 'value', 'content-type': 'application/vnd.interoperability.transfers+json;version=1.0' }
  })
  const server = await Base.setup()
  const res = await server.inject(req)
  Base.assertBadRequestError(assert, res, 'child "amount" fails because [child "currency" fails because [currency needs to be a valid ISO 4217 currency code]]')
  await server.stop()
  assert.end()
})

Test('return error if condition is not valid according to the pattern /^[A-Za-z0-9-_]{43}$/', async function (assert) {
  const req = Base.buildRequest({
    url: '/transfers',
    method: 'POST',
    payload: {
      transferId: 'b51ec534-ee48-4575-b6a9-ead2955b8069',
      payeeFsp: '1234',
      payerFsp: '5678',
      amount: {
        currency: 'USD',
        amount: '123.45'
      },
      ilpPacket: 'AYIBgQAAAAAAAASwNGxldmVsb25lLmRmc3AxLm1lci45T2RTOF81MDdqUUZERmZlakgyOVc4bXFmNEpLMHlGTFGCAUBQU0svMS4wCk5vbmNlOiB1SXlweUYzY3pYSXBFdzVVc05TYWh3CkVuY3J5cHRpb246IG5vbmUKUGF5bWVudC1JZDogMTMyMzZhM2ItOGZhOC00MTYzLTg0NDctNGMzZWQzZGE5OGE3CgpDb250ZW50LUxlbmd0aDogMTM1CkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvbgpTZW5kZXItSWRlbnRpZmllcjogOTI4MDYzOTEKCiJ7XCJmZWVcIjowLFwidHJhbnNmZXJDb2RlXCI6XCJpbnZvaWNlXCIsXCJkZWJpdE5hbWVcIjpcImFsaWNlIGNvb3BlclwiLFwiY3JlZGl0TmFtZVwiOlwibWVyIGNoYW50XCIsXCJkZWJpdElkZW50aWZpZXJcIjpcIjkyODA2MzkxXCJ9IgA',
      condition: 'invalid condition',
      expiration: '2016-05-24T08:38:08.699-04:00',
      extensionList:
      {
        extension:
        [
          {
            key: 'errorDescription',
            value: 'This is a more detailed error description'
          },
          {
            key: 'errorDescription',
            value: 'This is a more detailed error description'
          }
        ]
      }
    },
    headers: { date: 'Mon, 10 Sep 2018 20:22:01 GMT', 'fspiop-source': 'value', 'content-type': 'application/vnd.interoperability.transfers+json;version=1.0' }
  })
  const server = await Base.setup()
  const res = await server.inject(req)
  Base.assertBadRequestError(assert, res, 'child "condition" fails because [condition with value "invalid condition" fails to match the required pattern: /^[A-Za-z0-9-_]{43}$/]')
  await server.stop()
  assert.end()
})

Test('return error if Date Header is not according to format in RFC7231 as per Mojaloop Spec in POST /transfers', async function (assert) {
  const req = Base.buildRequest({
    url: '/transfers',
    method: 'POST',
    payload: {
      transferId: 'b51ec534-ee48-4575-b6a9-ead2955b8069',
      payeeFsp: '1234',
      payerFsp: '5678',
      amount: {
        currency: 'USD',
        amount: '123.45'
      },
      ilpPacket: 'AYIBgQAAAAAAAASwNGxldmVsb25lLmRmc3AxLm1lci45T2RTOF81MDdqUUZERmZlakgyOVc4bXFmNEpLMHlGTFGCAUBQU0svMS4wCk5vbmNlOiB1SXlweUYzY3pYSXBFdzVVc05TYWh3CkVuY3J5cHRpb246IG5vbmUKUGF5bWVudC1JZDogMTMyMzZhM2ItOGZhOC00MTYzLTg0NDctNGMzZWQzZGE5OGE3CgpDb250ZW50LUxlbmd0aDogMTM1CkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvbgpTZW5kZXItSWRlbnRpZmllcjogOTI4MDYzOTEKCiJ7XCJmZWVcIjowLFwidHJhbnNmZXJDb2RlXCI6XCJpbnZvaWNlXCIsXCJkZWJpdE5hbWVcIjpcImFsaWNlIGNvb3BlclwiLFwiY3JlZGl0TmFtZVwiOlwibWVyIGNoYW50XCIsXCJkZWJpdElkZW50aWZpZXJcIjpcIjkyODA2MzkxXCJ9IgA',
      condition: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
      expiration: '2016-05-24T08:38:08.699-04:00',
      extensionList:
      {
        extension:
        [
          {
            key: 'errorDescription',
            value: 'This is a more detailed error description'
          },
          {
            key: 'errorDescription',
            value: 'This is a more detailed error description'
          }
        ]
      }
    },
    headers: { date: '2018-04-26', 'fspiop-source': 'value', 'content-type': 'application/vnd.interoperability.transfers+json;version=1.0' }
  })
  const server = await Base.setup()
  const res = await server.inject(req)
  Base.assertBadRequestError(assert, res, 'child "date" fails because [date must be a string with one of the following formats [ddd, D MMM YYYY H:mm:ss [GMT]]]')
  await server.stop()
  assert.end()
})

Test('return error if Date Header is not according to format in RFC7231 as per Mojaloop Spec in PUT /transfers', async function (assert) {
  const req = Base.buildRequest({
    url: '/transfers',
    method: 'POST',
    payload: {
      transferId: 'b51ec534-ee48-4575-b6a9-ead2955b8069',
      payeeFsp: '1234',
      payerFsp: '5678',
      amount: {
        currency: 'USD',
        amount: '123.45'
      },
      ilpPacket: 'AYIBgQAAAAAAAASwNGxldmVsb25lLmRmc3AxLm1lci45T2RTOF81MDdqUUZERmZlakgyOVc4bXFmNEpLMHlGTFGCAUBQU0svMS4wCk5vbmNlOiB1SXlweUYzY3pYSXBFdzVVc05TYWh3CkVuY3J5cHRpb246IG5vbmUKUGF5bWVudC1JZDogMTMyMzZhM2ItOGZhOC00MTYzLTg0NDctNGMzZWQzZGE5OGE3CgpDb250ZW50LUxlbmd0aDogMTM1CkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvbgpTZW5kZXItSWRlbnRpZmllcjogOTI4MDYzOTEKCiJ7XCJmZWVcIjowLFwidHJhbnNmZXJDb2RlXCI6XCJpbnZvaWNlXCIsXCJkZWJpdE5hbWVcIjpcImFsaWNlIGNvb3BlclwiLFwiY3JlZGl0TmFtZVwiOlwibWVyIGNoYW50XCIsXCJkZWJpdElkZW50aWZpZXJcIjpcIjkyODA2MzkxXCJ9IgA',
      condition: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
      expiration: '2016-05-24T08:38:08.699-04:00',
      extensionList:
      {
        extension:
        [
          {
            key: 'errorDescription',
            value: 'This is a more detailed error description'
          },
          {
            key: 'errorDescription',
            value: 'This is a more detailed error description'
          }
        ]
      }
    },
    headers: { date: '2018-04-26', 'fspiop-source': 'value', 'content-type': 'application/vnd.interoperability.transfers+json;version=1.0' }
  })
  const server = await Base.setup()
  const res = await server.inject(req)
  Base.assertBadRequestError(assert, res, 'child "date" fails because [date must be a string with one of the following formats [ddd, D MMM YYYY H:mm:ss [GMT]]]')
  await server.stop()
  assert.end()
})

Test('return error if Date Header is not according to format in RFC7231 as per Mojaloop Spec in PUT /transfers/{id}/error', async function (assert) {
  const req = Base.buildRequest({
    url: '/transfers/{id}/error',
    method: 'PUT',
    payload: {
      errorCode: '5001',
      errorDescription: 'Payee FSP has insufficient liquidity to perform the transfer',
      fulfilment: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
      extensionList: {
        extension: [{
          key: 'errorDescription',
          value: 'This is a more detailed error description'
        }]
      }
    },
    headers: { date: '2018-04-26', 'fspiop-source': 'value', 'content-type': 'application/vnd.interoperability.transfers+json;version=1.0' }
  })
  const server = await Base.setup()
  const res = await server.inject(req)
  Base.assertBadRequestError(assert, res, 'child "date" fails because [date must be a string with one of the following formats [ddd, D MMM YYYY H:mm:ss [GMT]]]')
  await server.stop()
  assert.end()
})

Test('return error if transfer is not provided', async function (assert) {
  const req = Base.buildRequest({
    url: '/transfers/{id}',
    method: 'GET',
    payload: {},
    headers: {
      date: 'Mon, 10 Sep 2018 20:22:01 GMT',
      'fspiop-source': 'value',
      'content-type': 'application/vnd.interoperability.transfers+json;version=1.0'
    }
  })
  const server = await Base.setup()
  const res = await server.inject(req)
  Base.assertBadRequestError(assert, res)
  await server.stop()
  assert.end()
})

Test('return error if FSPIOP-Source is not provided to PUT /transfers/{id}/error', async function (assert) {
  const req = Base.buildRequest({
    url: '/transfers/{id}/error',
    method: 'PUT',
    payload: {
      errorCode: '5001',
      errorDescription: 'Payee FSP has insufficient liquidity to perform the transfer',
      fulfilment: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
      extensionList: {
        extension: [{
          key: 'errorDescription',
          value: 'This is a more detailed error description'
        }]
      }
    },
    headers: { date: 'Fri, 14 Sep 2018 19:10:56 GMT', 'content-type': 'application/vnd.interoperability.transfers+json;version=1.0' }
  })
  const server = await Base.setup()
  const res = await server.inject(req)
  Base.assertBadRequestError(assert, res, 'child "date" fails because [date must be a string with one of the following formats [ddd, D MMM YYYY H:mm:ss [GMT]]]')
  await server.stop()
  assert.end()
})

Test('return error if invalid errorCode is provided to PUT /transfers/{id}/error', async function (assert) {
  const req = Base.buildRequest({
    url: '/transfers/{id}/error',
    method: 'PUT',
    payload: {
      errorCode: '5001',
      errorDescription: 'Payee FSP has insufficient liquidity to perform the transfer',
      fulfilment: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
      extensionList: {
        extension: [{
          key: 'errorDescription',
          value: 'This is a more detailed error description'
        }]
      }
    },
    headers: { date: 'Fri, 14 Sep 2018 19:10:56 GMT', 'FSPIOP-Source': 'me', 'content-type': 'application/vnd.interoperability.transfers+json;version=1.0' }
  })
  const server = await Base.setup()
  const res = await server.inject(req)
  Base.assertBadRequestError(assert, res, 'child "date" fails because [date must be a string with one of the following formats [ddd, D MMM YYYY H:mm:ss [GMT]]]')
  await server.stop()
  assert.end()
})

Test('return error if errorCode is not provided to PUT /transfers/{id}/error', async function (assert) {
  const req = Base.buildRequest({
    url: '/transfers/{id}/error',
    method: 'PUT',
    payload: {
      errorDescription: 'Payee FSP has insufficient liquidity to perform the transfer',
      fulfilment: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
      extensionList: {
        extension: [{
          key: 'errorDescription',
          value: 'This is a more detailed error description'
        }]
      }
    },
    headers: { date: 'Fri, 14 Sep 2018 19:10:56 GMT', 'FSPIOP-Source': 'me', 'content-type': 'application/vnd.interoperability.transfers+json;version=1.0' }
  })
  const server = await Base.setup()
  const res = await server.inject(req)
  Base.assertBadRequestError(assert, res, 'child "date" fails because [date must be a string with one of the following formats [ddd, D MMM YYYY H:mm:ss [GMT]]]')
  await server.stop()
  assert.end()
})

Test('return error if errorDescription is not provided to PUT /transfers/{id}/error', async function (assert) {
  const req = Base.buildRequest({
    url: '/transfers/{id}/error',
    method: 'PUT',
    payload: {
      errorCode: '5001',
      fulfilment: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
      extensionList: {
        extension: [{
          key: 'errorDescription',
          value: 'This is a more detailed error description'
        }]
      }
    },
    headers: { date: 'Fri, 14 Sep 2018 19:10:56 GMT', 'FSPIOP-Source': 'me', 'content-type': 'application/vnd.interoperability.transfers+json;version=1.0' }
  })
  const server = await Base.setup()
  const res = await server.inject(req)
  Base.assertBadRequestError(assert, res, 'child "date" fails because [date must be a string with one of the following formats [ddd, D MMM YYYY H:mm:ss [GMT]]]')
  await server.stop()
  assert.end()
})
