'use strict'

const src = '../../../../src'
const Test = require('tape')
const TransferService = require(`${src}/domain/transfer`)
const Fixtures = require('../../../fixtures')

Test('transfer service', (modelTest) => {
  modelTest.test('prepare should', (prepareTest) => {
    prepareTest.test('prepare a transfer', async (assert) => {
      let transfer = Fixtures.buildTransfer(Fixtures.generateTransferId())
      const result = await TransferService.prepare({}, transfer)
      assert.equal(result, true)
      assert.pass()
      assert.end()
    })

    prepareTest.end()
  })
  modelTest.end()
})
