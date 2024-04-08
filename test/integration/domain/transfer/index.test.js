'use strict'

const Test = require('tape')
const TransferService = require('../../../../src/domain/transfer')
const Fixtures = require('../../../fixtures')
const Kafka = require('@mojaloop/central-services-stream').Util
const encodePayload = require('@mojaloop/central-services-shared').Util.StreamingProtocol.encodePayload

Test('transfer service', async (modelTest) => {
  modelTest.test('prepare should', async (prepareTest) => {
    prepareTest.test('produce a transfer prepare message to kafka', async (test) => {
      const transfer = Fixtures.buildTransfer(Fixtures.generateTransferId())
      const dataUri = encodePayload(transfer.toString(), 'application/vnd.interoperability.transfers+json;version=1.1')
      const span = Fixtures.generateParentTestSpan()
      const result = await TransferService.prepare(Fixtures.buildHeaders, dataUri, transfer, span)
      test.equal(result, true)
      test.pass()
      test.end()
    })

    prepareTest.test('produce a fx transfer prepare message to kafka', async (test) => {
      const transfer = Fixtures.buildFXTransfer(Fixtures.generateTransferId())
      const dataUri = encodePayload(transfer.toString(), 'application/vnd.interoperability.transfers+json;version=2.0')
      const span = Fixtures.generateParentTestSpan()
      const result = await TransferService.prepare(Fixtures.buildHeaders, dataUri, transfer, span)
      test.equal(result, true)
      test.pass()
      test.end()
    })

    prepareTest.end()
  })

  modelTest.test('fulfil should', async (fulfilTest) => {
    fulfilTest.test('produce a transfer fulfil message to kafka', async (test) => {
      const fulfil = Fixtures.buildFulfil()
      const dataUri = encodePayload(fulfil.toString(), 'application/vnd.interoperability.transfers+json;version=1.1')
      const span = Fixtures.generateParentTestSpan()
      const result = await TransferService.fulfil(Fixtures.buildHeaders, dataUri, fulfil, { id: Fixtures.generateTransferId() }, span)
      test.equal(result, true)
      test.pass()
      test.end()
    })

    fulfilTest.end()
  })

  modelTest.test('getTransferById should', async (getTransferTest) => {
    getTransferTest.test('produce a getTransferById message to kafka', async (test) => {
      const span = Fixtures.generateParentTestSpan()
      const result = await TransferService.getTransferById(Fixtures.buildHeaders, { id: Fixtures.generateTransferId() }, span)
      test.equal(result, true)
      test.pass()
      test.end()
    })

    getTransferTest.end()
  })

  modelTest.test('transferError should', async (transferErrorTest) => {
    transferErrorTest.test('produce a transfer error message to kafka', async (test) => {
      const transferError = Fixtures.buildTransferError()
      const dataUri = encodePayload(transferError.toString(), 'application/vnd.interoperability.transfers+json;version=1.1')
      const span = Fixtures.generateParentTestSpan()
      const result = await TransferService.transferError(Fixtures.buildHeaders, dataUri, transferError, { id: Fixtures.generateTransferId() }, span)
      test.equal(result, true)
      test.pass()
      test.end()
    })

    transferErrorTest.end()
  })

  modelTest.test('teardown', async (teardown) => {
    await Kafka.Producer.disconnect()
    teardown.end()
  })

  modelTest.end()
})
