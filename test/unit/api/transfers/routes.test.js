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

Test('return error if required field missing on prepare', function (assert) {
  let req = Base.buildRequest({ url: '/transfers', method: 'POST', payload: {} })
  Base.setup().then(server => {
    server.inject(req, function (res) {
      Base.assertBadRequestError(assert, res, [
        { message: 'transferId is required', params: { key: 'transferId'} },
        { message: 'payeeFsp is required', params: { key: 'payeeFsp'} },
        { message: 'payerFsp is required', params: { key: 'payerFsp'} },
        { message: 'amount is required', params: { key: 'amount'} },
        { message: 'ilpPacket is required', params: { key: 'ilpPacket'} }
      ])
      assert.end()
    })
  })
})

Test('return error if transferId is not a guid', function (assert) {
  let req = Base.buildRequest({ url: '/transfers',
    method: 'POST',
    payload: { transferId: 'invalid transfer id'
    } })

  Base.setup().then(server => {
    server.inject(req, function (res) {
      Base.assertBadRequestError(assert, res, [
        { message: 'transferId must be a valid GUID', params: { key: 'transferId', value: 'invalid transfer id' } },
        { message: 'payeeFsp is required', params: { key: 'payeeFsp'} },
        { message: 'payerFsp is required', params: { key: 'payerFsp'} },
        { message: 'amount is required', params: { key: 'amount'} },
        { message: 'ilpPacket is required', params: { key: 'ilpPacket'} }
      ])
      assert.end()
    })
  })
})

Test('return error if amount is not a number', function (assert) {
  let req = Base.buildRequest({ url: '/transfers', method: 'POST', payload: { amount: { currency: 'USD', amount: 'invalid amount'} } })

  Base.setup().then(server => {
    server.inject(req, function (res) {
      Base.assertBadRequestError(assert, res, [
        { message: 'transferId is required', params: { key: 'transferId'} },
        { message: 'payeeFsp is required', params: { key: 'payeeFsp'} },
        { message: 'payerFsp is required', params: { key: 'payerFsp'} },
        { message: 'amount must be a number', params: { key: 'amount'} },
        { message: 'ilpPacket is required', params: { key: 'ilpPacket'} }
      ])
      assert.end()
    })
  })
})

Test('return error if payeeFsp is not a number', function (assert) {
  let req = Base.buildRequest({ url: '/transfers', method: 'POST', payload: { payeeFsp: 'invalid payeeFsp' } })

  Base.setup().then(server => {
    server.inject(req, function (res) {
      Base.assertBadRequestError(assert, res, [
        { message: 'transferId is required', params: { key: 'transferId'} },
        { message: 'payeeFsp must be a number', params: { key: 'payeeFsp'} },
        { message: 'payerFsp is required', params: { key: 'payerFsp'} },
        { message: 'amount is required', params: { key: 'amount'} },
        { message: 'ilpPacket is required', params: { key: 'ilpPacket'} }
      ])
      assert.end()
    })
  })
})

Test('return error if payerFsp is not a number', function (assert) {
  let req = Base.buildRequest({ url: '/transfers', method: 'POST', payload: { payerFsp: 'invalid payerFsp' } })

  Base.setup().then(server => {
    server.inject(req, function (res) {
      Base.assertBadRequestError(assert, res, [
        { message: 'transferId is required', params: { key: 'transferId'} },
        { message: 'payeeFsp is required', params: { key: 'payeeFsp'} },
        { message: 'payerFsp must be a number', params: { key: 'payerFsp'} },
        { message: 'amount is required', params: { key: 'amount'} },
        { message: 'ilpPacket is required', params: { key: 'ilpPacket'} }
      ])
      assert.end()
    })
  })
})
