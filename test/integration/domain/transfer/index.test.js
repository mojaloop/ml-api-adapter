'use strict'

const src = '../../../../src'
const Test = require('tape')
const TransferService = require(`${src}/domain/transfer`)
const Fixtures = require('../../../fixtures')
const encodePayload = require('@mojaloop/central-services-shared').Util.StreamingProtocol.encodePayload

Test('transfer service', (modelTest) => {
  modelTest.test('prepare should', (prepareTest) => {
    prepareTest.test('produce a transfer message to kafka', async (assert) => {
      const transfer = Fixtures.buildTransfer(Fixtures.generateTransferId())
      const dataUri = encodePayload(transfer.toString(), 'application/vnd.interoperability.participants+json;version=1.0')
      const span = Fixtures.generateParentTestSpan()
      const result = await TransferService.prepare(Fixtures.buildHeaders, dataUri, transfer, span)
      assert.equal(result, true)
      assert.pass()
      assert.end()
    })

    prepareTest.end()
  })
  modelTest.end()
})
