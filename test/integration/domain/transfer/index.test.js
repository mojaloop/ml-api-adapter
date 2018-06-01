'use strict'

const src = '../../../../src'
const Test = require('tape')
const TransferService = require(`${src}/domain/transfer`)
const Fixtures = require('../../../fixtures')

Test('transfer service', function (modelTest) {
  modelTest.test('prepare should', function (prepareTest) {
    prepareTest.test('prepare a transfer', function (assert) {
      let transfer = Fixtures.buildTransfer(Fixtures.generateTransferId())
      TransferService.prepare({}, transfer).then(result => {
        assert.equal(result, true)
        assert.pass()
        assert.end()
      })
    })

    prepareTest.end()
  })
  modelTest.end()
})
