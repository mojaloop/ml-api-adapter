/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation
 - Name Surname <name.surname@mojaloop.io>

 * Infitx
 - Vijay Kumar Guthi <vijaya.guthi@infitx.com>
 - Kevin Leyow <kevin.leyow@infitx.com>
 - Kalin Krustev <kalin.krustev@infitx.com>
 - Steven Oderayi <steven.oderayi@infitx.com>
 - Eugen Klymniuk <eugen.klymniuk@infitx.com>

 --------------

 ******/

'use strict'

const Ilp = require('@mojaloop/sdk-standard-components').Ilp
const FSPIOPError = require('@mojaloop/central-services-error-handling').Factory.FSPIOPError
const ErrorEnums = require('@mojaloop/central-services-error-handling').Enums
const Logger = require('@mojaloop/central-services-logger')
const EventSdk = require('@mojaloop/event-sdk')
const { Hapi, id } = require('@mojaloop/central-services-shared').Util
const { TransformFacades } = require('@mojaloop/ml-schema-transformer-lib')

TransformFacades.FSPIOPISO20022.configure({ isTestingMode: true, logger: Logger })

const Sinon = require('sinon')
const Test = require('tapes')(require('tape'))

const Config = require('../../../../src/lib/config')
const Handler = require('../../../../src/api/transfers/handler')
const TransferService = require('../../../../src/domain/transfer')
const {
  buildISOTransfer,
  buildISOFulfil,
  buildISOTransferError,
  buildISOFxTransfer,
  buildISOFxFulfil,
  buildISOFxTransferError
} = require('../../../fixtures')
const ulid = id({ type: 'ulid' })

const createISORequest = async (payload, headers, participants) => {
  const requestPayload = payload || {}
  return {
    params: { ID: ulid() },
    headers: {
      'fspiop-source': 'dfsp1',
      'fspiop-destination': 'dfsp2',
      'content-type': 'application/vnd.interoperability.iso20022.transfers+json;version=2.0',
      accept: 'application/vnd.interoperability.iso20022.transfers+json;version=2',
      ...headers
    },
    payload: requestPayload,
    server: {
      log: () => { },
      app: {}
    },
    span: EventSdk.Tracer.createSpan('test_span'),
    dataUri: 'someDataUri',
    info: {
      id: ulid()
    }
  }
}

const createFxISORequest = async (payload, headers) => {
  const isoRequest = await createISORequest(payload, headers)
  return {
    ...isoRequest,
    path: '/fxTransfers'
  }
}

Test('ISO transfer handler', handlerTest => {
  let sandbox
  let prepareStub
  let fulfilStub
  let transferErrorStub
  let originalType
  handlerTest.beforeEach(t => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Logger, 'isErrorEnabled').value(true)
    sandbox.stub(Logger, 'isInfoEnabled').value(true)
    sandbox.stub(Logger, 'isDebugEnabled').value(true)
    prepareStub = sandbox.stub(TransferService, 'prepare')
    fulfilStub = sandbox.stub(TransferService, 'fulfil')
    transferErrorStub = sandbox.stub(TransferService, 'transferError')
    originalType = Config.API_TYPE
    Config.API_TYPE = Hapi.API_TYPES.iso20022
    t.end()
  })

  handlerTest.afterEach(t => {
    Config.API_TYPE = originalType
    sandbox.restore()
    t.end()
  })

  const createTestReply = (test, expectedCode = 202) => ({
    response: () => ({
      code: statusCode => {
        test.equal(statusCode, expectedCode)
      }
    })
  })

  handlerTest.test('transfers - create should', async createTransferTest => {
    createTransferTest.test('reply with status code 202 if ISO message is sent successfully to kafka', async test => {
      const transferId = '12345'
      const payload = await buildISOTransfer(transferId, {}, Ilp.ILP_VERSIONS.v4)
      const request = await createISORequest(
        payload, {
          'fspiop-source': 'dfsp1',
          'fspiop-destination': 'dfsp2',
          'content-type': 'application/vnd.interoperability.iso20022.transfers+json;version=2.0'
        })
      const reply = createTestReply(test)

      TransferService.prepare.resolves()

      await Handler.create({}, request, reply)
      test.ok(TransferService.prepare.called)
      test.deepEqual(
        prepareStub.getCall(0).args[2],
        (await TransformFacades.FSPIOPISO20022.transfers.post({ body: payload, headers: request.headers })).body
      )
      test.deepEqual(
        prepareStub.getCall(0).args[4],
        {
          originalRequestPayload: 'someDataUri',
          originalRequestId: request.info.id
        }
      )
      test.end()
    })

    createTransferTest.test('return error if ISO transfer create throws', async test => {
      const transferId = '12345'
      const payload = await buildISOTransfer(transferId, {}, Ilp.ILP_VERSIONS.v4)
      const request = await createISORequest(
        payload, {
          'fspiop-source': 'dfsp1',
          'fspiop-destination': 'dfsp2',
          'content-type': 'application/vnd.interoperability.iso20022.transfers+json;version=2.0'
        })
      const reply = createTestReply(test, 500)

      TransferService.prepare.rejects(new Error('An error has occurred'))

      try {
        await Handler.create({}, request, reply)
        test.fail('Expected an error to be thrown')
      } catch (e) {
        test.ok(e instanceof FSPIOPError)
        test.equal(e.apiErrorCode.code, ErrorEnums.FSPIOPErrorCodes.INTERNAL_SERVER_ERROR.code)
        test.equal(e.message, 'An error has occurred')
        test.end()
      }
    })

    createTransferTest.test('call setOriginalRequestPayload with correct arguments if payloadCache is defined for createTransfer', async test => {
      const transferId = '12345'
      const payload = await buildISOTransfer(transferId, {}, Ilp.ILP_VERSIONS.v4)
      const request = await createISORequest(
        payload, {
          'fspiop-source': 'dfsp1',
          'fspiop-destination': 'dfsp2',
          'content-type': 'application/vnd.interoperability.iso20022.transfers+json;version=2.0'
        })
      request.server.app.payloadCache = {
        setPayload: sandbox.stub()
      }
      const reply = createTestReply(test)

      const originalRequestPayload = {
        originalRequestPayload: 'someDataUri',
        originalRequestId: request.info.id
      }

      TransferService.prepare.resolves()

      await Handler.create({}, request, reply)
      test.deepEqual(
        prepareStub.getCall(0).args[4],
        {
          originalRequestId: originalRequestPayload.originalRequestId
        },
        'only originalRequestId should be attached to kafka message context when payloadCache is defined'
      )
      test.deepEqual(request.server.app.payloadCache.setPayload.getCall(0).args, [
        originalRequestPayload.originalRequestId, originalRequestPayload.originalRequestPayload
      ])
      test.end()
    })

    createTransferTest.end()
  })

  handlerTest.test('transfers - fulfilTransfer should', async fulfilTransferTest => {
    fulfilTransferTest.test('reply with status code 200 if ISO message is sent successfully to kafka', async test => {
      const transferId = '12345'
      const payload = await buildISOFulfil(transferId)
      const request = await createISORequest(
        payload, {
          'fspiop-source': 'dfsp1',
          'fspiop-destination': 'dfsp2',
          'content-type': 'application/vnd.interoperability.iso20022.transfers+json;version=2.0'
        })
      const reply = createTestReply(test, 200)
      TransferService.fulfil.resolves()

      await Handler.fulfilTransfer({}, request, reply)
      test.deepEqual(
        fulfilStub.getCall(0).args[2],
        (await TransformFacades.FSPIOPISO20022.transfers.put({ body: payload, headers: request.headers })).body
      )
      test.deepEqual(
        fulfilStub.getCall(0).args[5],
        {
          originalRequestPayload: 'someDataUri',
          originalRequestId: request.info.id
        }
      )
      test.end()
    })

    fulfilTransferTest.test('return error if ISO fulfil throws', async test => {
      const transferId = '12345'
      const payload = await buildISOFulfil(transferId)
      const request = await createISORequest(
        payload, {
          'fspiop-source': 'dfsp1',
          'fspiop-destination': 'dfsp2',
          'content-type': 'application/vnd.interoperability.iso20022.transfers+json;version=2.0'
        })
      const reply = createTestReply(test, 500)

      TransferService.fulfil.rejects(new Error('An error has occurred'))

      try {
        await Handler.fulfilTransfer({}, request, reply)
        test.fail('Expected an error to be thrown')
      } catch (e) {
        test.ok(e instanceof FSPIOPError)
        test.equal(e.apiErrorCode.code, ErrorEnums.FSPIOPErrorCodes.INTERNAL_SERVER_ERROR.code)
        test.equal(e.message, 'An error has occurred')
        test.end()
      }
    })

    fulfilTransferTest.test('call setOriginalRequestPayload with correct arguments if payloadCache is defined for fulfilTransfer', async test => {
      const transferId = '12345'
      const payload = await buildISOFulfil(transferId)
      const request = await createISORequest(
        payload, {
          'fspiop-source': 'dfsp1',
          'fspiop-destination': 'dfsp2',
          'content-type': 'application/vnd.interoperability.iso20022.transfers+json;version=2.0'
        })
      request.server.app.payloadCache = {
        setPayload: sandbox.stub()
      }
      const reply = createTestReply(test, 200)

      const originalRequestPayload = {
        originalRequestPayload: 'someDataUri',
        originalRequestId: request.info.id
      }

      TransferService.fulfil.resolves()

      await Handler.fulfilTransfer({}, request, reply)
      test.deepEqual(
        fulfilStub.getCall(0).args[5],
        {
          originalRequestId: originalRequestPayload.originalRequestId
        },
        'only originalRequestId should be attached to kafka message context when payloadCache is defined'
      )
      test.deepEqual(request.server.app.payloadCache.setPayload.getCall(0).args, [
        originalRequestPayload.originalRequestId, originalRequestPayload.originalRequestPayload
      ])
      test.end()
    })

    fulfilTransferTest.end()
  })

  handlerTest.test('transfers - transferError should', async transferErrorTest => {
    transferErrorTest.test('reply with status code 200 if ISO error message is sent successfully to kafka', async test => {
      const payload = await buildISOTransferError()
      const request = await createISORequest(
        payload, {
          'fspiop-source': 'dfsp1',
          'fspiop-destination': 'dfsp2',
          'content-type': 'application/vnd.interoperability.iso20022.transfers+json;version=2.0'
        })
      const reply = createTestReply(test, 200)

      TransferService.transferError.resolves()

      await Handler.fulfilTransferError({}, request, reply)
      test.deepEqual(
        transferErrorStub.getCall(0).args[2],
        (await TransformFacades.FSPIOPISO20022.transfers.putError({ body: payload, headers: request.headers })).body
      )
      test.deepEqual(
        transferErrorStub.getCall(0).args[6],
        {
          originalRequestPayload: 'someDataUri',
          originalRequestId: request.info.id
        }
      )
      test.end()
    })

    transferErrorTest.test('return error if ISO transfer error throws', async test => {
      const payload = await buildISOTransferError()
      const request = await createISORequest(
        payload, {
          'fspiop-source': 'dfsp1',
          'fspiop-destination': 'dfsp2',
          'content-type': 'application/vnd.interoperability.iso20022.transfers+json;version=2.0'
        })
      const reply = createTestReply(test, 500)

      TransferService.transferError.rejects(new Error('An error has occurred'))

      try {
        await Handler.fulfilTransferError({}, request, reply)
        test.fail('Expected an error to be thrown')
      } catch (e) {
        test.ok(e instanceof FSPIOPError)
        test.equal(e.apiErrorCode.code, ErrorEnums.FSPIOPErrorCodes.INTERNAL_SERVER_ERROR.code)
        test.equal(e.message, 'An error has occurred')
        test.end()
      }
    })

    transferErrorTest.test('call setOriginalRequestPayload with correct arguments if payloadCache is defined for transferError', async test => {
      const payload = await buildISOTransferError()
      const request = await createISORequest(
        payload, {
          'fspiop-source': 'dfsp1',
          'fspiop-destination': 'dfsp2',
          'content-type': 'application/vnd.interoperability.iso20022.transfers+json;version=2.0'
        })
      request.server.app.payloadCache = {
        setPayload: sandbox.stub()
      }
      const reply = createTestReply(test, 200)

      const originalRequestPayload = {
        originalRequestPayload: 'someDataUri',
        originalRequestId: request.info.id
      }

      TransferService.transferError.resolves()

      await Handler.fulfilTransferError({}, request, reply)
      test.deepEqual(
        transferErrorStub.getCall(0).args[6],
        {
          originalRequestId: originalRequestPayload.originalRequestId
        },
        'only originalRequestId should be attached to kafka message context when payloadCache is defined'
      )
      test.deepEqual(request.server.app.payloadCache.setPayload.getCall(0).args, [
        originalRequestPayload.originalRequestId, originalRequestPayload.originalRequestPayload
      ])
      test.end()
    })
    transferErrorTest.end()
  })

  handlerTest.test('fxTransfers - create should', async createTransferTest => {
    createTransferTest.test('reply with status code 202 if ISO message is sent successfully to kafka', async test => {
      const transferId = '12345'
      const payload = await buildISOFxTransfer(transferId, {}, Ilp.ILP_VERSIONS.v4)
      const request = await createFxISORequest(
        payload, {
          'fspiop-source': 'dfsp1',
          'fspiop-destination': 'dfsp2',
          'content-type': 'application/vnd.interoperability.iso20022.fxTransfers+json;version=2.0'
        })
      const reply = createTestReply(test)

      TransferService.prepare.resolves()

      await Handler.create({}, request, reply)
      test.deepEqual(
        prepareStub.getCall(0).args[2],
        (await TransformFacades.FSPIOPISO20022.fxTransfers.post({ body: payload, headers: request.headers })).body
      )
      test.deepEqual(
        prepareStub.getCall(0).args[4],
        {
          originalRequestPayload: 'someDataUri',
          originalRequestId: request.info.id
        }
      )
      test.end()
    })

    createTransferTest.test('return error if ISO transfer create throws', async test => {
      const transferId = '12345'
      const payload = await buildISOFxTransfer(transferId, {}, Ilp.ILP_VERSIONS.v4)
      const request = await createFxISORequest(
        payload, {
          'fspiop-source': 'dfsp1',
          'fspiop-destination': 'dfsp2',
          'content-type': 'application/vnd.interoperability.iso20022.fxTransfers+json;version=2.0'
        })
      const reply = createTestReply(test, 500)

      TransferService.prepare.rejects(new Error('An error has occurred'))

      try {
        await Handler.create({}, request, reply)
        test.fail('Expected an error to be thrown')
      } catch (e) {
        test.ok(e instanceof FSPIOPError)
        test.equal(e.apiErrorCode.code, ErrorEnums.FSPIOPErrorCodes.INTERNAL_SERVER_ERROR.code)
        test.equal(e.message, 'An error has occurred')
        test.end()
      }
    })

    createTransferTest.test('call setOriginalRequestPayload with correct arguments if payloadCache is defined for createTransfer', async test => {
      const transferId = '12345'
      const payload = await buildISOFxTransfer(transferId, {}, Ilp.ILP_VERSIONS.v4)
      const request = await createFxISORequest(
        payload, {
          'fspiop-source': 'dfsp1',
          'fspiop-destination': 'dfsp2',
          'content-type': 'application/vnd.interoperability.iso20022.fxTransfers+json;version=2.0'
        })
      request.server.app.payloadCache = {
        setPayload: sandbox.stub()
      }
      const reply = createTestReply(test)

      const originalRequestPayload = {
        originalRequestPayload: 'someDataUri',
        originalRequestId: request.info.id
      }

      TransferService.prepare.resolves()

      await Handler.create({}, request, reply)
      test.deepEqual(
        prepareStub.getCall(0).args[4],
        {
          originalRequestId: originalRequestPayload.originalRequestId
        },
        'only originalRequestId should be attached to kafka message context when payloadCache is defined'
      )
      test.deepEqual(request.server.app.payloadCache.setPayload.getCall(0).args, [
        originalRequestPayload.originalRequestId, originalRequestPayload.originalRequestPayload
      ])
      test.end()
    })

    createTransferTest.end()
  })

  handlerTest.test('fxTransfers - fulfilTransfer should', async fulfilTransferTest => {
    fulfilTransferTest.test('reply with status code 200 if ISO message is sent successfully to kafka', async test => {
      const transferId = '12345'
      const payload = await buildISOFxFulfil(transferId)
      const request = await createFxISORequest(
        payload, {
          'fspiop-source': 'dfsp1',
          'fspiop-destination': 'dfsp2',
          'content-type': 'application/vnd.interoperability.iso20022.fxTransfers+json;version=2.0'
        })
      const reply = createTestReply(test, 200)

      TransferService.fulfil.resolves()

      await Handler.fulfilTransfer({}, request, reply)
      test.deepEqual(
        fulfilStub.getCall(0).args[2],
        (await TransformFacades.FSPIOPISO20022.fxTransfers.put({ body: payload, headers: request.headers })).body
      )
      test.deepEqual(
        fulfilStub.getCall(0).args[5],
        {
          originalRequestPayload: 'someDataUri',
          originalRequestId: request.info.id
        }
      )
      test.end()
    })

    fulfilTransferTest.test('return error if ISO fulfil throws', async test => {
      const transferId = '12345'
      const payload = await buildISOFxFulfil(transferId)
      const request = await createFxISORequest(
        payload, {
          'fspiop-source': 'dfsp1',
          'fspiop-destination': 'dfsp2',
          'content-type': 'application/vnd.interoperability.iso20022.fxTransfers+json;version=2.0'
        })
      const reply = createTestReply(test, 500)

      TransferService.fulfil.rejects(new Error('An error has occurred'))

      try {
        await Handler.fulfilTransfer({}, request, reply)
        test.fail('Expected an error to be thrown')
      } catch (e) {
        test.ok(e instanceof FSPIOPError)
        test.equal(e.apiErrorCode.code, ErrorEnums.FSPIOPErrorCodes.INTERNAL_SERVER_ERROR.code)
        test.equal(e.message, 'An error has occurred')
        test.end()
      }
    })

    fulfilTransferTest.test('call setOriginalRequestPayload with correct arguments if payloadCache is defined for fulfilTransfer', async test => {
      const transferId = '12345'
      const payload = await buildISOFxFulfil(transferId)
      const request = await createFxISORequest(
        payload, {
          'fspiop-source': 'dfsp1',
          'fspiop-destination': 'dfsp2',
          'content-type': 'application/vnd.interoperability.iso20022.fxTransfers+json;version=2.0'
        })
      request.server.app.payloadCache = {
        setPayload: sandbox.stub()
      }
      const reply = createTestReply(test, 200)

      const originalRequestPayload = {
        originalRequestPayload: 'someDataUri',
        originalRequestId: request.info.id
      }

      TransferService.fulfil.resolves()

      await Handler.fulfilTransfer({}, request, reply)
      test.deepEqual(
        fulfilStub.getCall(0).args[5],
        {
          originalRequestId: originalRequestPayload.originalRequestId
        },
        'only originalRequestId should be attached to kafka message context when payloadCache is defined'
      )
      test.deepEqual(request.server.app.payloadCache.setPayload.getCall(0).args, [
        originalRequestPayload.originalRequestId, originalRequestPayload.originalRequestPayload
      ])
      test.end()
    })

    fulfilTransferTest.end()
  })

  handlerTest.test('fxTransfers - transferError should', async transferErrorTest => {
    transferErrorTest.test('reply with status code 200 if ISO error message is sent successfully to kafka', async test => {
      const payload = await buildISOFxTransferError()
      const request = await createFxISORequest(
        payload, {
          'fspiop-source': 'dfsp1',
          'fspiop-destination': 'dfsp2',
          'content-type': 'application/vnd.interoperability.iso20022.fxTransfers+json;version=2.0'
        })
      const reply = createTestReply(test, 200)

      TransferService.transferError.resolves()

      await Handler.fulfilTransferError({}, request, reply)
      test.deepEqual(
        transferErrorStub.getCall(0).args[2],
        (await TransformFacades.FSPIOPISO20022.fxTransfers.putError({ body: payload, headers: request.headers })).body
      )
      test.deepEqual(
        transferErrorStub.getCall(0).args[6],
        {
          originalRequestPayload: 'someDataUri',
          originalRequestId: request.info.id
        }
      )
      test.end()
    })

    transferErrorTest.test('return error if ISO transfer error throws', async test => {
      const payload = await buildISOFxTransferError()
      const request = await createFxISORequest(
        payload, {
          'fspiop-source': 'dfsp1',
          'fspiop-destination': 'dfsp2',
          'content-type': 'application/vnd.interoperability.iso20022.fxTransfers+json;version=2.0'
        })
      const reply = createTestReply(test, 500)

      TransferService.transferError.rejects(new Error('An error has occurred'))

      try {
        await Handler.fulfilTransferError({}, request, reply)
        test.fail('Expected an error to be thrown')
      } catch (e) {
        test.ok(e instanceof FSPIOPError)
        test.equal(e.apiErrorCode.code, ErrorEnums.FSPIOPErrorCodes.INTERNAL_SERVER_ERROR.code)
        test.equal(e.message, 'An error has occurred')
        test.end()
      }
    })

    transferErrorTest.test('call setOriginalRequestPayload with correct arguments if payloadCache is defined for transferError', async test => {
      const payload = await buildISOFxTransferError()
      const request = await createFxISORequest(
        payload, {
          'fspiop-source': 'dfsp1',
          'fspiop-destination': 'dfsp2',
          'content-type': 'application/vnd.interoperability.iso20022.fxTransfers+json;version=2.0'
        })
      request.server.app.payloadCache = {
        setPayload: sandbox.stub()
      }
      const reply = createTestReply(test, 200)

      const originalRequestPayload = {
        originalRequestPayload: 'someDataUri',
        originalRequestId: request.info.id
      }

      TransferService.transferError.resolves()

      await Handler.fulfilTransferError({}, request, reply)
      test.deepEqual(
        transferErrorStub.getCall(0).args[6],
        {
          originalRequestId: originalRequestPayload.originalRequestId
        },
        'only originalRequestId should be attached to kafka message context when payloadCache is defined'
      )
      test.deepEqual(request.server.app.payloadCache.setPayload.getCall(0).args, [
        originalRequestPayload.originalRequestId, originalRequestPayload.originalRequestPayload
      ])
      test.end()
    })

    transferErrorTest.end()
  })

  handlerTest.end()
})
