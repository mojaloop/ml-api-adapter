'use strict'

const src = '../../../../src'
const Test = require('tape')
const TransferService = require(`${src}/domain/transfer`)
const Fixtures = require('../../../fixtures')
const { initializeProducers } = require('../../../../src/shared/setup')
const Kafka = require('@mojaloop/central-services-stream').Util
const encodePayload = require('@mojaloop/central-services-shared').Util.StreamingProtocol.encodePayload

Test('transfer service', async (modelTest) => {
  modelTest.test('prepare should', async (prepareTest) => {
    prepareTest.test('produce a transfer message to kafka', async (test) => {
      await initializeProducers()
      const transfer = Fixtures.buildTransfer(Fixtures.generateTransferId())
      const dataUri = encodePayload(transfer.toString(), 'application/vnd.interoperability.participants+json;version=1.1')
      const span = Fixtures.generateParentTestSpan()
      const result = await TransferService.prepare(Fixtures.buildHeaders, dataUri, transfer, span)
      test.equal(result, true)
      test.pass()
      await Kafka.Producer.disconnect()
      test.end()
    })

    prepareTest.end()
  })
  modelTest.end()
})
