'use strict'

const FSPIOPError = require('@mojaloop/central-services-error-handling').Factory.FSPIOPError
const ErrorEnums = require('@mojaloop/central-services-error-handling').Enums
const Logger = require('@mojaloop/central-services-logger')
const EventSdk = require('@mojaloop/event-sdk')
const Enum = require('@mojaloop/central-services-shared').Enum
const { Hapi } = require('@mojaloop/central-services-shared').Util
const { TransformFacades } = require('@mojaloop/ml-schema-transformer-lib')

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
const uuid4 = require('uuid4')

const createISORequest = async (payload, participants) => {
  const requestPayload = payload || {}
  const headers = {}
  headers[Enum.Http.Headers.FSPIOP.SOURCE] = participants.payerFsp
  headers[Enum.Http.Headers.FSPIOP.DESTINATION] = participants.payeeFsp
  return {
    headers,
    payload: requestPayload,
    server: {
      log: () => { }
    },
    span: EventSdk.Tracer.createSpan('test_span'),
    rawPayload: JSON.stringify(requestPayload),
    info: {
      id: uuid4()
    }
  }
}

const createFxISORequest = async (payload, participants) => {
  const isoRequest = await createISORequest(payload, participants)
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
      const payload = await buildISOTransfer(transferId)
      const request = await createISORequest(payload, { payerFsp: 'dfsp1', payeeFsp: 'dfsp2' })
      const reply = createTestReply(test)

      TransferService.prepare.resolves()

      await Handler.create({}, request, reply)
      test.ok(TransferService.prepare.called)
      test.deepEqual(
        prepareStub.getCall(0).args[2],
        await TransformFacades.FSPIOPISO20022.transfers.post({ body: payload.body, headers: request.headers })
      )
      test.deepEqual(
        prepareStub.getCall(0).args[4],
        {
          originalPayload: request.rawPayload,
          originalRequestId: request.info.id
        }
      )
      test.end()
    })

    createTransferTest.test('return error if ISO transfer create throws', async test => {
      const transferId = '12345'
      const payload = await buildISOTransfer(transferId)
      const request = await createISORequest(payload, { payerFsp: 'dfsp1', payeeFsp: 'dfsp2' })
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

    createTransferTest.end()
  })

  handlerTest.test('transfers - fulfilTransfer should', async fulfilTransferTest => {
    fulfilTransferTest.test('reply with status code 200 if ISO message is sent successfully to kafka', async test => {
      const transferId = '12345'
      const payload = await buildISOFulfil(transferId)
      const request = await createISORequest(payload, { payerFsp: 'dfsp1', payeeFsp: 'dfsp2' })
      const reply = createTestReply(test, 200)
      TransferService.fulfil.resolves()

      await Handler.fulfilTransfer({}, request, reply)
      test.deepEqual(
        fulfilStub.getCall(0).args[2],
        await TransformFacades.FSPIOPISO20022.transfers.put({ body: payload.body, headers: request.headers })
      )
      test.deepEqual(
        fulfilStub.getCall(0).args[5],
        {
          originalPayload: request.rawPayload,
          originalRequestId: request.info.id
        }
      )
      test.end()
    })

    fulfilTransferTest.test('return error if ISO fulfil throws', async test => {
      const transferId = '12345'
      const payload = await buildISOFulfil(transferId)
      const request = await createISORequest(payload, { payerFsp: 'dfsp1', payeeFsp: 'dfsp2' })
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

    fulfilTransferTest.end()
  })

  handlerTest.test('transfers - transferError should', async transferErrorTest => {
    transferErrorTest.test('reply with status code 200 if ISO error message is sent successfully to kafka', async test => {
      const payload = await buildISOTransferError()
      const request = await createISORequest(payload, { payerFsp: 'dfsp1', payeeFsp: 'dfsp2' })
      const reply = createTestReply(test, 200)

      TransferService.transferError.resolves()

      await Handler.fulfilTransferError({}, request, reply)
      test.deepEqual(
        transferErrorStub.getCall(0).args[2],
        await TransformFacades.FSPIOPISO20022.transfers.putError({ body: payload.body, headers: request.headers })
      )
      test.deepEqual(
        transferErrorStub.getCall(0).args[6],
        {
          originalPayload: request.rawPayload,
          originalRequestId: request.info.id
        }
      )
      test.end()
    })

    transferErrorTest.test('return error if ISO transfer error throws', async test => {
      const payload = await buildISOTransferError()
      const request = await createISORequest(payload, { payerFsp: 'dfsp1', payeeFsp: 'dfsp2' })
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

    transferErrorTest.end()
  })

  handlerTest.test('fxTransfers - create should', async createTransferTest => {
    createTransferTest.test('reply with status code 202 if ISO message is sent successfully to kafka', async test => {
      const transferId = '12345'
      const payload = await buildISOFxTransfer(transferId)
      const request = await createFxISORequest(payload, { payerFsp: 'dfsp1', payeeFsp: 'dfsp2' })
      const reply = createTestReply(test)

      TransferService.prepare.resolves()

      await Handler.create({}, request, reply)
      test.deepEqual(
        prepareStub.getCall(0).args[2],
        await TransformFacades.FSPIOPISO20022.fxTransfers.post({ body: payload.body, headers: request.headers })
      )
      test.deepEqual(
        prepareStub.getCall(0).args[4],
        {
          originalPayload: request.rawPayload,
          originalRequestId: request.info.id
        }
      )
      test.end()
    })

    createTransferTest.test('return error if ISO transfer create throws', async test => {
      const transferId = '12345'
      const payload = await buildISOFxTransfer(transferId)
      const request = await createFxISORequest(payload, { payerFsp: 'dfsp1', payeeFsp: 'dfsp2' })
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

    createTransferTest.end()
  })

  handlerTest.test('fxTransfers - fulfilTransfer should', async fulfilTransferTest => {
    fulfilTransferTest.test('reply with status code 200 if ISO message is sent successfully to kafka', async test => {
      const transferId = '12345'
      const payload = await buildISOFxFulfil(transferId)
      const request = await createFxISORequest(payload, { payerFsp: 'dfsp1', payeeFsp: 'dfsp2' })
      const reply = createTestReply(test, 200)

      TransferService.fulfil.resolves()

      await Handler.fulfilTransfer({}, request, reply)
      test.deepEqual(
        fulfilStub.getCall(0).args[2],
        await TransformFacades.FSPIOPISO20022.fxTransfers.put({ body: payload.body, headers: request.headers })
      )
      test.deepEqual(
        fulfilStub.getCall(0).args[5],
        {
          originalPayload: request.rawPayload,
          originalRequestId: request.info.id
        }
      )
      test.end()
    })

    fulfilTransferTest.test('return error if ISO fulfil throws', async test => {
      const transferId = '12345'
      const payload = await buildISOFxFulfil(transferId)
      const request = await createFxISORequest(payload, { payerFsp: 'dfsp1', payeeFsp: 'dfsp2' })
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

    fulfilTransferTest.end()
  })

  handlerTest.test('fxTransfers - transferError should', async transferErrorTest => {
    transferErrorTest.test('reply with status code 200 if ISO error message is sent successfully to kafka', async test => {
      const payload = await buildISOFxTransferError()
      const request = await createFxISORequest(payload, { payerFsp: 'dfsp1', payeeFsp: 'dfsp2' })
      const reply = createTestReply(test, 200)

      TransferService.transferError.resolves()

      await Handler.fulfilTransferError({}, request, reply)
      test.deepEqual(
        transferErrorStub.getCall(0).args[2],
        await TransformFacades.FSPIOPISO20022.fxTransfers.putError({ body: payload.body, headers: request.headers })
      )
      test.deepEqual(
        transferErrorStub.getCall(0).args[6],
        {
          originalPayload: request.rawPayload,
          originalRequestId: request.info.id
        }
      )
      test.end()
    })

    transferErrorTest.test('return error if ISO transfer error throws', async test => {
      const payload = await buildISOFxTransferError()
      const request = await createFxISORequest(payload, { payerFsp: 'dfsp1', payeeFsp: 'dfsp2' })
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

    transferErrorTest.end()
  })

  handlerTest.end()
})
