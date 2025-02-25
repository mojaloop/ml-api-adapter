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

const EventSdk = require('@mojaloop/event-sdk')
const Sinon = require('sinon')
const Test = require('tapes')(require('tape'))
const FSPIOPError = require('@mojaloop/central-services-error-handling').Factory.FSPIOPError
const Config = require('../../../../src/lib/config')
const Handler = require('../../../../src/api/transfers/handler')
const TransferService = require('../../../../src/domain/transfer')
const { Enum, Enum: { Tags: { QueryTags } } } = require('@mojaloop/central-services-shared')
const ErrorEnums = require('@mojaloop/central-services-error-handling').Enums
const Logger = require('@mojaloop/central-services-logger')

const mocks = require('../../mocks')

const createRequest = (payload, isFx = false) => {
  const requestPayload = payload || {}
  const headers = {}
  headers[Enum.Http.Headers.FSPIOP.SOURCE] = payload.payerFsp
  headers[Enum.Http.Headers.FSPIOP.DESTINATION] = payload.payeeFsp
  return {
    headers,
    payload: requestPayload,
    method: 'post',
    path: isFx ? '/fxTransfers' : '/transfers',
    server: {
      log: () => { }
    },
    span: EventSdk.Tracer.createSpan('test_span')
  }
}

const createPutRequest = (params, payload, isFx = false) => {
  const requestPayload = payload || {}
  const requestParams = params || {}
  const headers = {}
  headers[Enum.Http.Headers.FSPIOP.SOURCE] = payload.payerFsp
  headers[Enum.Http.Headers.FSPIOP.DESTINATION] = payload.payeeFsp
  return {
    headers,
    params: requestParams,
    payload: requestPayload,
    method: 'put',
    path: isFx ? `/fxTransfers/${params.ID}` : `/transfers/${params.ID}`,
    server: {
      log: () => { }
    },
    span: EventSdk.Tracer.createSpan('test_span')
  }
}

Test('transfer handler', handlerTest => {
  let sandbox
  let originalHostName
  const hostname = 'http://some-host'

  handlerTest.beforeEach(t => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Logger, 'isErrorEnabled').value(true)
    sandbox.stub(Logger, 'isInfoEnabled').value(true)
    sandbox.stub(Logger, 'isDebugEnabled').value(true)
    sandbox.stub(TransferService, 'prepare')
    sandbox.stub(TransferService, 'fulfil')
    sandbox.stub(TransferService, 'getTransferById')
    sandbox.stub(TransferService, 'transferError')
    originalHostName = Config.HOSTNAME
    Config.HOSTNAME = hostname
    t.end()
  })

  handlerTest.afterEach(t => {
    Config.HOSTNAME = originalHostName
    sandbox.restore()
    t.end()
  })

  const createTestReply = (test, expectedCode = 202) => ({
    response: () => ({
      code: statusCode => {
        test.equal(statusCode, expectedCode)
        test.end()
      }
    })
  })

  handlerTest.test('create should', async createTransferTest => {
    createTransferTest.test('reply with status code 202 if message is sent successfully to kafka', test => {
      const payload = {
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
      }

      TransferService.prepare.returns(Promise.resolve(true))

      const request = createRequest(payload)
      const reply = createTestReply(test)
      const spanSpy = sandbox.spy(request.span, 'setTags')
      Handler.create({}, request, reply)
      sandbox.assert.calledTwice(spanSpy)
      sandbox.assert.calledWith(spanSpy, {
        serviceName: QueryTags.serviceName.mlApiAdapterService,
        auditType: QueryTags.auditType.transactionFlow,
        contentType: QueryTags.contentType.httpRequest,
        operation: QueryTags.operation.prepareTransfer,
        httpMethod: 'post',
        transferId: payload.transferId
      })
    })

    createTransferTest.test('reply with status code 202 for correct fxTransfer request', test => {
      TransferService.prepare.returns(Promise.resolve(true))

      const payload = mocks.mockFxPreparePayload()
      const request = createRequest(payload, true)
      const reply = createTestReply(test)
      const spanSpy = sandbox.spy(request.span, 'setTags')
      Handler.create({}, request, reply)
      sandbox.assert.calledTwice(spanSpy)
      sandbox.assert.calledWith(spanSpy, {
        serviceName: QueryTags.serviceName.mlApiAdapterService,
        auditType: QueryTags.auditType.transactionFlow,
        contentType: QueryTags.contentType.httpRequest,
        operation: QueryTags.operation.prepareFxTransfer,
        httpMethod: 'post',
        commitRequestId: payload.commitRequestId
      })
    })

    createTransferTest.test('return error if transfer create throws', async test => {
      const payload = {
        transferId: 'invalid transferId',
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
      }

      const error = new Error('An error has occurred')
      TransferService.prepare.returns(Promise.reject(error))

      try {
        await Handler.create({}, createRequest(payload))
        test.fail('Expected an error to be thrown')
      } catch (e) {
        test.ok(e instanceof FSPIOPError)
        test.equal(e.apiErrorCode.code, ErrorEnums.FSPIOPErrorCodes.INTERNAL_SERVER_ERROR.code)
        test.equal(e.message, 'An error has occurred')
        test.end()
      }
    })

    createTransferTest.end()
  })

  handlerTest.test('fulfilTransfer should', async fulfilTransferTest => {
    fulfilTransferTest.test('reply with status code 200 if message is sent successfully to kafka', test => {
      const payload = {
        transferState: 'RECEIVED',
        fulfilment: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
        completedTimestamp: new Date(),
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
      }
      const params = {
        ID: 'dfsp1'
      }

      TransferService.fulfil.returns(Promise.resolve(true))

      const request = createPutRequest(params, payload)
      const reply = {
        response: (response) => {
          return {
            code: statusCode => {
              test.equal(statusCode, 200)
              test.end()
            }
          }
        }
      }
      const spanSpy = sandbox.spy(request.span, 'setTags')
      Handler.fulfilTransfer({}, request, reply)
      sandbox.assert.calledTwice(spanSpy)
      sandbox.assert.calledWith(spanSpy, {
        serviceName: QueryTags.serviceName.mlApiAdapterService,
        auditType: QueryTags.auditType.transactionFlow,
        contentType: QueryTags.contentType.httpRequest,
        operation: QueryTags.operation.fulfilTransfer,
        httpMethod: 'put',
        httpPath: request.path,
        transferId: request.params.ID
      })
    })

    fulfilTransferTest.test('reply with status code 200 for success PUT fxTransfer callback', test => {
      TransferService.fulfil.returns(Promise.resolve(true))

      const payload = mocks.mockFxFulfilPayload()
      const params = { ID: 'dfsp1' }
      const request = createPutRequest(params, payload, true)
      const reply = createTestReply(test, 200)
      const spanSpy = sandbox.spy(request.span, 'setTags')
      Handler.fulfilTransfer({}, request, reply)
      sandbox.assert.calledTwice(spanSpy)
      sandbox.assert.calledWith(spanSpy, {
        serviceName: QueryTags.serviceName.mlApiAdapterService,
        auditType: QueryTags.auditType.transactionFlow,
        contentType: QueryTags.contentType.httpRequest,
        operation: QueryTags.operation.fulfilFxTransfer,
        httpMethod: 'put',
        httpPath: request.path,
        commitRequestId: request.params.ID
      })
    })

    fulfilTransferTest.test('reply with status code 400 if future completedTimestamp is provided', async test => {
      const completedTimestamp = new Date((new Date().getTime() + 100000))
      const payload = {
        transferState: 'RECEIVED',
        fulfilment: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
        completedTimestamp,
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
      }
      const params = {
        ID: 'dfsp1'
      }

      TransferService.fulfil.returns(Promise.resolve(true))

      const request = createPutRequest(params, payload)

      try {
        await Handler.fulfilTransfer({}, request, {})
        test.fail('Expected an error to be thrown')
      } catch (err) {
        test.ok(err instanceof FSPIOPError)
        test.equal(err.httpStatusCode, 400)
        test.equal(err.message, 'completedTimestamp fails because future timestamp was provided')
      }
      test.end()
    })

    fulfilTransferTest.test('reply with status code 400 if completedTimestamp is way too far in the past', async test => {
      const completedTimestamp = new Date((new Date().getTime() - 3600 * 1000))
      const payload = {
        transferState: 'RECEIVED',
        fulfilment: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
        completedTimestamp,
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
      }
      const params = {
        ID: 'dfsp1'
      }

      TransferService.fulfil.returns(Promise.resolve(true))

      const request = createPutRequest(params, payload)

      try {
        await Handler.fulfilTransfer({}, request, {})
        test.fail('Expected an FSPIOPError to be thrown')
      } catch (err) {
        test.ok(err instanceof FSPIOPError)
        test.equal(err.httpStatusCode, 400)
        test.equal(err.message, 'completedTimestamp fails because provided timestamp exceeded the maximum timeout duration')
      }
      test.end()
    })

    fulfilTransferTest.test('return error if fulfilTransfer throws', async test => {
      const payload = {
        transferState: 'RECEIVED',
        fulfilment: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
        completedTimestamp: new Date(),
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
      }
      const params = {
        ID: 'dfsp1'
      }

      const error = new Error('An error has occurred')
      TransferService.fulfil.returns(Promise.reject(error))

      try {
        await Handler.fulfilTransfer({}, createPutRequest(params, payload))
        test.fail('Expected an error to be thrown')
      } catch (e) {
        test.ok(e instanceof FSPIOPError)
        test.equal(e.apiErrorCode.code, ErrorEnums.FSPIOPErrorCodes.INTERNAL_SERVER_ERROR.code)
        test.equal(e.message, 'An error has occurred')
        test.end()
      }
    })

    fulfilTransferTest.end()
    handlerTest.test('Get transfer should', async getTransferByIdTest => {
      await getTransferByIdTest.test('reply with status code 202 if message is sent to Kafka topic', async test => {
        const headers = {}
        headers[Enum.Http.Headers.FSPIOP.SOURCE] = 'source'
        headers[Enum.Http.Headers.FSPIOP.DESTINATION] = 'destination'
        const request = {
          method: 'get',
          path: '/transfers/b51ec534-ee48-4575b6a9-ead2955b8069',
          params: {
            ID: 'b51ec534-ee48-4575b6a9-ead2955b8069'
          },
          payload: {
            transferId: 'b51ec534-ee48-4575b6a9-ead2955b8069'
          },
          headers,
          server: {
            log: () => { }
          },
          span: EventSdk.Tracer.createSpan('test_span')
        }
        const reply = {
          response: (response) => {
            return {
              code: statusCode => {
                test.equal(statusCode, 202)
                test.end()
              }
            }
          }
        }
        TransferService.getTransferById.resolves()
        const spanSpy = sandbox.spy(request.span, 'setTags')
        try {
          await Handler.getTransferById({}, request, reply)
          sandbox.assert.calledTwice(spanSpy)
          sandbox.assert.calledWith(spanSpy, {
            serviceName: QueryTags.serviceName.mlApiAdapterService,
            auditType: QueryTags.auditType.transactionFlow, // Is this the appropriate auditType for getTransferById?
            contentType: QueryTags.contentType.httpRequest,
            operation: QueryTags.operation.getTransferByID,
            httpMethod: 'get',
            httpPath: request.path,
            transferId: request.params.ID
          })
        } catch (e) {
          test.fail()
          test.end()
        }
      })
      await getTransferByIdTest.test('return error if getTransferById throws', async test => {
        const headers = {}
        headers[Enum.Http.Headers.FSPIOP.SOURCE] = 'source'
        headers[Enum.Http.Headers.FSPIOP.DESTINATION] = 'destination'
        const request = {
          params: {
            transferId: 'b51ec534-ee48-4575b6a9-ead2955b8069'
          },
          payload: {
            transferId: 'b51ec534-ee48-4575b6a9-ead2955b8069'
          },
          headers,
          server: {
            log: () => { }
          },
          span: EventSdk.Tracer.createSpan('test_span')
        }
        TransferService.getTransferById.rejects(new Error('An error has occurred'))
        try {
          await Handler.getTransferById({}, request)
          test.fail('Expected an error to be thrown')
        } catch (e) {
          test.ok(e instanceof FSPIOPError)
          test.equal(e.apiErrorCode.code, ErrorEnums.FSPIOPErrorCodes.INTERNAL_SERVER_ERROR.code)
          test.equal(e.message, 'An error has occurred')
          test.end()
        }
      })
      getTransferByIdTest.end()
    })
  })

  handlerTest.test('fulfilTransferError should', async fulfilTransferErrorTest => {
    await fulfilTransferErrorTest.test('reply with status code 200 if message is sent successfully to kafka', async test => {
      const payload = {
        errorCode: '5001',
        errorDescription: 'Payee FSP has insufficient liquidity to perform the transfer',
        fulfilment: 'f5sqb7tBTWPd5Y8BDFdMm9BJR_MNI4isf8p8n4D5pHA',
        extensionList: {
          extension: [{
            key: 'errorDescription',
            value: 'This is a more detailed error description'
          }]
        }
      }
      const params = {
        ID: '888ec534-ee48-4575-b6a9-ead2955b8930'
      }
      TransferService.transferError.returns(Promise.resolve(true))
      const request = createPutRequest(params, payload)
      const reply = {
        response: (response) => {
          return {
            code: statusCode => {
              test.equal(statusCode, 200)
              test.end()
            }
          }
        }
      }
      const spanSpy = sandbox.spy(request.span, 'setTags')
      await Handler.fulfilTransferError({}, request, reply)
      sandbox.assert.calledTwice(spanSpy)
      sandbox.assert.calledWith(spanSpy, {
        serviceName: QueryTags.serviceName.mlApiAdapterService,
        auditType: QueryTags.auditType.transactionFlow,
        contentType: QueryTags.contentType.httpRequest,
        operation: QueryTags.operation.fulfilTransferError,
        httpMethod: 'put',
        httpPath: request.path,
        transferId: request.params.ID
      })
    })
    await fulfilTransferErrorTest.test('return error if fulfilTransfer throws', async test => {
      const headers = {}
      headers[Enum.Http.Headers.FSPIOP.SOURCE] = 'source'
      headers[Enum.Http.Headers.FSPIOP.DESTINATION] = 'destination'
      const request = {
        params: {
          transferId: 'b51ec534-ee48-4575b6a9-ead2955b8069'
        },
        payload: {
          transferId: 'b51ec534-ee48-4575b6a9-ead2955b8069'
        },
        headers,
        server: {
          log: () => { }
        },
        span: EventSdk.Tracer.createSpan('test_span')
      }
      TransferService.transferError.rejects(new Error('An error has occurred'))
      try {
        await Handler.fulfilTransferError({}, request)
        test.fail('Expected an error to be thrown')
      } catch (e) {
        test.ok(e instanceof FSPIOPError)
        test.equal(e.apiErrorCode.code, ErrorEnums.FSPIOPErrorCodes.INTERNAL_SERVER_ERROR.code)
        test.equal(e.message, 'An error has occurred')
        test.end()
      }
    })
    fulfilTransferErrorTest.end()
  })

  handlerTest.test('patchTransfer should', async patchTransferTest => {
    await patchTransferTest.test('return error if patchTransfer is called', async test => {
      try {
        await Handler.patchTransfer()
        test.fail('Expected an error to be thrown')
      } catch (e) {
        test.ok(e instanceof FSPIOPError)
        test.equal(e.apiErrorCode.code, ErrorEnums.FSPIOPErrorCodes.NOT_IMPLEMENTED.code)
        test.end()
      }
    })
    patchTransferTest.end()
  })

  handlerTest.end()
})
