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
 --------------
 ******/

'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const axios = require('axios')
const Base = require('../../base')
const Notification = require('../../../../src/handlers/notification')
const Producer = require('@mojaloop/central-services-stream').Util.Producer

Test('metadata routes', (metadataRoutesTest) => {
  let sandbox

  metadataRoutesTest.beforeEach(t => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Notification, 'isHealthy')
    sandbox.stub(Producer, 'isConnected')
    sandbox.stub(axios, 'get')
    t.end()
  })

  metadataRoutesTest.afterEach(t => {
    sandbox.restore()
    t.end()
  })

  metadataRoutesTest.test('GET /health should return status OK', async function (t) {
    Notification.isHealthy.resolves(true)
    Producer.isConnected.resolves(true)
    axios.get.resolves({ data: { status: 'OK' } })

    const req = Base.buildRequest({ url: '/health', method: 'GET' })
    const server = await Base.setup()
    const res = await server.inject(req)
    t.equal(res.statusCode, 200, 'Status code should be 200')
    t.equal(res.result.status, 'OK', 'Response status should be OK')
    await server.stop()
    t.end()
  })

  metadataRoutesTest.test('GET /health should return status DOWN if service is down', async function (t) {
    Notification.isHealthy.resolves(false)
    Producer.isConnected.resolves(false)
    axios.get.resolves({ data: { status: 'DOWN' } })

    const req = Base.buildRequest({ url: '/health', method: 'GET' })
    const server = await Base.setup()

    // Simulate service down
    server.app.healthCheck = async () => ({ status: 'DOWN' })

    const res = await server.inject(req)
    t.equal(res.statusCode, 502, 'Status code should be 502')
    t.equal(res.result.status, 'DOWN', 'Response status should be DOWN')
    await server.stop()
    t.end()
  })

  metadataRoutesTest.end()
})
