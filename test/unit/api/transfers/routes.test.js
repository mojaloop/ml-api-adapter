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

Test('return error if required field missing on prepare', async function (assert) {
  let req = Base.buildRequest({ url: '/transfers', method: 'POST', payload: {} })
  const server = await Base.setup()
  const res = await server.inject(req)
  Base.assertBadRequestError(assert, res, 'child "transferId" fails because [transferId is required]. child "payeeFsp" fails because [payeeFsp is required]. child "payerFsp" fails because [payerFsp is required]. child "amount" fails because [amount is required]. child "ilpPacket" fails because [ilpPacket is required]')
  await server.stop()
  assert.end()
})

Test('return error if transferId is not a guid', async function (assert) {
  let req = Base.buildRequest({ url: '/transfers',
    method: 'POST',
    payload: { transferId: 'invalid transfer id'
    } })
  const server = await Base.setup()
  const res = await server.inject(req)
  Base.assertBadRequestError(assert, res, 'child "transferId" fails because [transferId must be a valid GUID]. child "payeeFsp" fails because [payeeFsp is required]. child "payerFsp" fails because [payerFsp is required]. child "amount" fails because [amount is required]. child "ilpPacket" fails because [ilpPacket is required]')
  await server.stop()
  assert.end()
})

Test('return error if amount is not a number', async function (assert) {
  let req = Base.buildRequest({ url: '/transfers', method: 'POST', payload: { amount: { currency: 'USD', amount: 'invalid amount'} } })
  const server = await Base.setup()
  const res = await server.inject(req)
  Base.assertBadRequestError(assert, res, 'child "transferId" fails because [transferId is required]. child "payeeFsp" fails because [payeeFsp is required]. child "payerFsp" fails because [payerFsp is required]. child "amount" fails because [child "amount" fails because [amount must be a number]]. child "ilpPacket" fails because [ilpPacket is required]')
  await server.stop()
  assert.end()
})

Test('return error if payeeFsp is not a number', async function (assert) {
  let req = Base.buildRequest({ url: '/transfers', method: 'POST', payload: { payeeFsp: 'invalid payeeFsp' } })
  const server = await Base.setup()
  const res = await server.inject(req)
  Base.assertBadRequestError(assert, res, 'child "transferId" fails because [transferId is required]. child "payeeFsp" fails because [payeeFsp must be a number]. child "payerFsp" fails because [payerFsp is required]. child "amount" fails because [amount is required]. child "ilpPacket" fails because [ilpPacket is required]')
  await server.stop()
  assert.end()
})

Test('return error if payerFsp is not a number', async function (assert) {
  let req = Base.buildRequest({ url: '/transfers', method: 'POST', payload: { payerFsp: 'invalid payerFsp' } })
  const server = await Base.setup()
  const res = await server.inject(req)
  Base.assertBadRequestError(assert, res, 'child "transferId" fails because [transferId is required]. child "payeeFsp" fails because [payeeFsp is required]. child "payerFsp" fails because [payerFsp must be a number]. child "amount" fails because [amount is required]. child "ilpPacket" fails because [ilpPacket is required]')
  await server.stop()
  assert.end()
})
