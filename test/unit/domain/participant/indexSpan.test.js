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
const Uuid = require('uuid4')
const Facade = require('@mojaloop/central-services-shared').Util.Endpoints
const Service = require('../../../../src/domain/participant')
const Enum = require('@mojaloop/central-services-shared').Enum
const Config = require('../../../../src/lib/config')
const EventSdk = require('@mojaloop/event-sdk')
let span

Test('ParticipantEndpoint Service Test', endpointTest => {
  let sandbox

  endpointTest.beforeEach(async test => {
    span = EventSdk.Tracer.createSpan('test_span')
    sandbox = Sinon.createSandbox()
    sandbox.stub(Facade, 'getEndpoint')
    test.end()
  })

  endpointTest.afterEach(async test => {
    sandbox.restore()
    span.finish()
    test.end()
  })

  endpointTest.test('getEndpoint should', async (getEndpointTest) => {
    getEndpointTest.test('return the endpoint', async (test) => {
      const fsp = 'fsp'
      const endpointType = Enum.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT
      const transferId = Uuid()
      const expected = `http://localhost:1080/transfers/${transferId}`
      Facade.getEndpoint.withArgs(Config.ENDPOINT_SOURCE_URL, fsp, endpointType, { transferId }).returns(Promise.resolve(expected))

      try {
        const result = await Service.getEndpoint({ fsp, endpointType, id: transferId, span })
        test.equal(result, expected, 'The results match')
        test.end()
      } catch (err) {
        test.fail('Error thrown', err)
        test.end()
      }
    })

    getEndpointTest.test('return the endpoint when transferId is null', async (test) => {
      const fsp = 'fsp'
      const endpointType = Enum.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_POST
      const expected = 'http://localhost:1080/transfers'
      Facade.getEndpoint.withArgs(Config.ENDPOINT_SOURCE_URL, fsp, endpointType).returns(Promise.resolve(expected))

      try {
        const result = await Service.getEndpoint({ fsp, endpointType })
        test.equal(result, expected, 'The results match')
        test.end()
      } catch (err) {
        test.fail('Error thrown', err)
        test.end()
      }
    })

    getEndpointTest.test('throw error', async (test) => {
      const fsp = 'fsp1'
      const endpointType = Enum.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT
      const transferId = Uuid()

      Facade.getEndpoint.withArgs(Config.ENDPOINT_SOURCE_URL, fsp, endpointType, { transferId }).throws(new Error())
      try {
        await Service.getEndpoint({ fsp, endpointType, id: transferId })
        test.fail('should throw error')
        test.end()
      } catch (e) {
        test.ok(e instanceof Error)
        test.end()
      }
    })

    await getEndpointTest.end()
  })

  endpointTest.end()
})
