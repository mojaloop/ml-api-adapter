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

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const Uuid = require('uuid4')
const { Enum, Util } = require('@mojaloop/central-services-shared')
const Logger = require('@mojaloop/central-services-logger')

const Service = require('../../../../src/domain/participant')
const Config = require('../../../../src/lib/config')
const { TEMPLATE_PARAMS } = require('../../../../src/shared/constants')

const Facade = Util.Endpoints
const { FspEndpointTypes } = Enum.EndPoints

Test('ParticipantEndpoint Service Test', endpointTest => {
  let sandbox

  endpointTest.beforeEach(async test => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Logger, 'isDebugEnabled').value(true)
    sandbox.stub(Facade, 'getEndpoint')
    test.end()
  })

  endpointTest.afterEach(async test => {
    sandbox.restore()
    test.end()
  })

  endpointTest.test('getEndpoint should', async (getEndpointTest) => {
    getEndpointTest.test('return the endpoint', async (test) => {
      const fsp = 'fsp'
      const proxy = 'proxy'
      const endpointType = FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT
      const transferId = Uuid()
      const expected = `https://localhost:1080/transfers/${transferId}`
      const expectedProxy = { url: expected }
      Facade.getEndpoint.withArgs(Config.ENDPOINT_SOURCE_URL, fsp, endpointType, { transferId }).returns(Promise.resolve(expected))
      Facade.getEndpoint.withArgs(Config.ENDPOINT_SOURCE_URL, proxy, endpointType, { transferId }).returns(Promise.resolve(expectedProxy))

      try {
        test.deepEqual(await Service.getEndpoint({ fsp, endpointType, id: transferId }), expected, 'Return string')
        test.deepEqual(await Service.getEndpoint({ fsp: proxy, endpointType, id: transferId }), expected, 'Return string when proxy is configured')
        test.deepEqual(await Service.getEndpoint({ fsp, endpointType, id: transferId, proxy: true }), expectedProxy, 'Return object when proxy:true and proxy is not configured')
        test.deepEqual(await Service.getEndpoint({ fsp: proxy, endpointType, id: transferId, proxy: true }), expectedProxy, 'Return object when proxy:true and proxy is not configured')
        test.end()
      } catch (err) {
        test.fail('Error thrown', err)
        test.end()
      }
    })

    getEndpointTest.test('return the endpoint when transferId is null', async (test) => {
      const fsp = 'fsp'
      const endpointType = FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_POST
      const expected = 'https://localhost:1080/transfers'
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

    getEndpointTest.test('return the FX endpoint', async (test) => {
      const fsp = `fsp-${Uuid()}`
      const endpointType = FspEndpointTypes.FSPIOP_CALLBACK_URL_FX_TRANSFER_POST
      const id = 'fxId'
      const expectedTemplateParams = {
        [TEMPLATE_PARAMS.commitRequestId]: id
      }
      const expectedUrl = 'https://host/fxTransfers'
      Facade.getEndpoint.withArgs(Config.ENDPOINT_SOURCE_URL, fsp).resolves(expectedUrl)

      const result = await Service.getEndpoint({ fsp, endpointType, id, isFx: true })
      test.equal(result, expectedUrl, 'The url matches')
      test.same(Facade.getEndpoint.firstCall.args[3], expectedTemplateParams)
      test.end()
    })

    getEndpointTest.test('throw error', async (test) => {
      const fsp = 'fsp1'
      const endpointType = FspEndpointTypes.FSPIOP_CALLBACK_URL_TRANSFER_PUT
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
